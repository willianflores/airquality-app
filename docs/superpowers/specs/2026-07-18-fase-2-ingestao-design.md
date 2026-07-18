# Fase 2 — Ingestão (design)

**Status:** proposto
**Depende de:** Fase 1a (schema TimescaleDB), Fase 1b (backfill histórico 2019-06-01..2025-12-05)
**Código-alvo:** `airquality-js-app/backend`, novo `airquality-js-app/worker`

## Contexto

`sensor_readings` está parado em `2025-12-05 04:59:58+00` (fim do backfill da Fase 1b). Não existe
nenhum mecanismo de ingestão contínua no novo sistema ainda — Fases 0/1a/1b só trataram schema e
carga histórica pontual. Esta fase constrói:

1. Ingestão real-time recorrente (fecha o fluxo de dados novos, dali pra frente)
2. Backfill histórico reutilizável, parametrizado por sensor(es) + intervalo de data — usado agora
   pra fechar o gap Dez/2025→hoje, e reutilizável no futuro sempre que um sensor novo for cadastrado
   e precisar trazer o histórico que já mediu antes de entrar no sistema (decisão de design abaixo)

## Decisão de design: ciclo de vida de sensores

Levantado pelo usuário: sensores são inseridos e desativados com frequência operacional, e ao
inserir um sensor novo é comum precisar agregar dados que ele já mediu.

- **Desativação**: `ingest_realtime_purpleair` lê `sensors WHERE active=true` a cada ciclo — não
  há lista fixa. Desativar um sensor na tabela já remove ele do polling automaticamente, sem
  mudança de código.
- **Sensor novo + backfill do que já mediu**: resolvido pelo `backfill_historical_purpleair` desta
  fase ser genérico (sensor(s) + intervalo de data como parâmetro, não hardcoded pro "gap do
  sistema todo"). Serve dois momentos: (a) agora, fechando o gap de todos os sensores ativos; (b)
  futuramente, quando o CRUD de sensor (fase Admin, já prevista no roadmap original) cadastrar um
  sensor novo, pode chamar o mesmo caso de uso escopado só àquele sensor.
- **CRUD de sensor (tela admin pra cadastrar/desativar)** fica fora do escopo desta fase — cabe na
  fase de Admin já planejada no roadmap. Esta fase entrega só o mecanismo reutilizável que a fase
  Admin vai chamar.

## Componentes

### 1. `PurpleAirClient` (port + adapter)

Port em `application/ports/purpleair_client.py`:

```python
class PurpleAirClient(ABC):
    def fetch_realtime(self, sensor_indices: list[int]) -> list[dict]: ...
    def fetch_history(self, sensor_index: int, start: datetime, end: datetime) -> list[dict]: ...
```

Adapter em `adapters/outbound/purpleair/purpleair_api_client.py`:

- `fetch_realtime`: `GET https://api.purpleair.com/v1/sensors?sensor_index=1,2,3&fields=...`
  (endpoint bulk — decisão já confirmada anteriormente)
- `fetch_history`: `GET https://api.purpleair.com/v1/sensors/{id}/history/csv?...`, paginado em
  janelas de 30 dias (`average=0`, raw), mesmo padrão do script antigo
  (`getPurpleairApiHistoricalData.py`)
- Retry com backoff exponencial (reuso do padrão antigo: `maxRetries=5`, `sleepSeconds=2`)
- Normalização de nome de campo (`.` → `_`) — mesmo mapeamento serve os dois endpoints, os nomes
  de campo são idênticos entre bulk e history (`pm2.5_atm_a` → `pm2_5_atm_a`, etc.)
- **Sem conversão de timezone**: `time_stamp` grava exatamente como a API retorna (UTC nativo,
  epoch/ISO). O script antigo (`getPurpleairApiHistoricalData.py`) convertia `time_stamp` pra
  `-05:00` antes de gravar — **não replicar isso**. Decisão da Fase 1b já fixou `sensor_readings`
  em UTC puro, conversão pra hora local só acontece na camada de agregação (continuous aggregates,
  via `time_bucket(..., 'America/Rio_Branco')`). Vale pros dois métodos do client, `fetch_realtime`
  e `fetch_history`.
- API key via variável de ambiente (`PURPLEAIR_API_KEY`), nunca hardcoded — a chave antiga
  encontrada em `config.env` do app legado (`43664AA0-305C-11ED-B5AA-42010A800006`) não deve ir
  pro novo código

### 2. `Sensor` entity ganha campo `sensor_index: int`

`domain/entities/sensor.py` — hoje é `id, code, name, municipio, active` (5 campos, intocado desde
Fase 0). Ingestão precisa do `sensor_index` (ID do sensor na PurpleAir) pra chamar a API externa —
essa coluna já existe em `sensors` (schema Fase 1a), só nunca foi exposta no domínio.

- `Sensor` passa a ter 6 campos: `id, code, sensor_index, name, municipio, active`
- Não muda contrato HTTP `/sensors` — o router já seleciona campos manualmente
  (`{"id","code","name","municipio"}`), continua assim
- `SensorRepository.list_active()` continua sendo o mesmo port, só o `PostgresSensorRepository`
  passa a selecionar mais uma coluna

### 3. Nova migration: `UNIQUE (sensor_index, time_stamp)` em `sensor_readings`

Schema atual (Fase 1a, migration 0002) não tem constraint de unicidade — o app antigo também não
tinha (ver `README_DAILY_UPDATE.md` do legado, que documenta duplicatas como problema conhecido).
Com ingestão contínua + backfill reexecutável, retries e janelas sobrepostas viram risco real de
duplicata.

- Migration `0006_add_sensor_readings_unique_constraint.py`:
  `ALTER TABLE sensor_readings ADD CONSTRAINT uq_sensor_readings_sensor_time UNIQUE (sensor_index, time_stamp)`
- Todas as escritas de leitura passam a usar `ON CONFLICT (sensor_index, time_stamp) DO NOTHING`

### 4. `SensorReadingRepository` (port + adapter)

`application/ports/sensor_reading_repository.py`:

```python
class SensorReadingRepository(ABC):
    def bulk_insert(self, readings: list[dict]) -> int: ...  # retorna nº de linhas efetivamente inseridas
```

`adapters/outbound/postgres/postgres_sensor_reading_repository.py` — insert em lote (`executemany`
ou `COPY` pra volumes grandes de backfill) com `ON CONFLICT DO NOTHING`.

### 5. `IngestionRunRepository` (port + adapter)

Tabela `ingestion_runs` já existe (migration 0004), ociosa desde a Fase 1a.

```python
class IngestionRunRepository(ABC):
    def start(self, source: str) -> int: ...            # insere started_at=now, status='running', retorna id
    def finish(self, run_id: int, status: str, records_ingested: int) -> None: ...
```

### 6. Use case `ingest_realtime_purpleair`

`application/use_cases/ingest_realtime_purpleair.py`:

1. `sensors = sensor_repository.list_active()`
2. `run_id = ingestion_run_repository.start("realtime")`
3. `readings = purpleair_client.fetch_realtime([s.sensor_index for s in sensors])`
4. `inserted = sensor_reading_repository.bulk_insert(readings)`
5. `ingestion_run_repository.finish(run_id, "success", inserted)` (ou `"failed"` em exceção, antes
   de propagar)

### 7. Use case `backfill_historical_purpleair`

`application/use_cases/backfill_historical_purpleair.py`:

```python
def execute(self, sensor_indices: list[int] | None, start: datetime, end: datetime) -> int: ...
```

- `sensor_indices=None` → todos os sensores ativos (`sensor_repository.list_active()`)
- Pra cada sensor: `purpleair_client.fetch_history(sensor_index, start, end)` →
  `sensor_reading_repository.bulk_insert(readings)`
- Registra `ingestion_run` com `source="backfill"`
- Retorna total de linhas inseridas

### 8. Worker (processo/container separado)

Novo diretório `airquality-js-app/worker/` — reusa o mesmo código de `backend` (application +
adapters), não duplica lógica. Estrutura:

- `worker/main.py`: loop simples — `while True: ingest_realtime_purpleair.execute(); sleep(intervalo)`
  (sem cron de sistema — mais simples e portável, alinhado ao requisito de stack simplificada)
- Intervalo: 10-15 min (configurável via env `INGEST_INTERVAL_SECONDS`, default 900s)
- `worker/backfill_cli.py`: comando manual, não agendado —
  `python -m worker.backfill_cli --sensor-indices 123,456 --start 2025-12-05 --end 2026-07-18`
  (`--sensor-indices` omitido = todos ativos)
- Adicionado ao `docker-compose.yml` como novo serviço `worker`, depende de `postgres` saudável

### 9. Fechamento do gap atual

Ao final da execução desta fase (última tarefa do plano, é operação de dados — não gera commit):

```bash
python -m worker.backfill_cli --start 2025-12-05 --end <data da execução>
```

Fecha `sensor_readings` de `2025-12-05 04:59:58+00` até o presente, pros 30 sensores ativos.

## Testes

- `PurpleAirClient` adapter: testado contra respostas HTTP mockadas (bulk e history), cobrindo
  normalização de campo, retry/backoff, e paginação de 30 dias no history
- `PostgresSensorReadingRepository.bulk_insert`: teste de idempotência — inserir o mesmo lote duas
  vezes, `ON CONFLICT DO NOTHING` garante nenhuma duplicata (usa `db_session`/`db_engine` da
  `airquality_test`, nunca a base real)
- `ingest_realtime_purpleair` e `backfill_historical_purpleair`: testados com fakes de
  `PurpleAirClient`, `SensorReadingRepository`, `IngestionRunRepository` (sem rede, sem banco —
  puros application-layer, seguindo o padrão de `test_list_sensors.py`)
- Migration 0006: teste de que a constraint existe e rejeita duplicata de `(sensor_index, time_stamp)`

## Fora de escopo

- CRUD de sensor (cadastro/desativação via UI) — fase Admin
- Alertas de falha de ingestão (ex.: notificação se `ingestion_runs` não tiver run bem-sucedido
  recente) — não levantado, não faz parte desta fase
- Rate-limit adaptativo além do retry/backoff simples — volume atual (30 sensores) não justifica
