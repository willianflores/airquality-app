# Reforma da Ingestão e Arquivo Bruto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o worker de snapshot de 15 minutos — que perde ~6 de cada 7 leituras por design — por um job horário sobre `/history` com janela calculada a partir do watermark de cada sensor, mais uma camada de status separada que preserva `channel_flags` e alerta quando a ingestão para.

**Architecture:** Dois jobs independentes com cadências diferentes. O **job de arquivo** (1 h) busca `/sensors/:id/history` com `average=0`, janela = watermark do sensor até agora, e é o **único escritor** de `sensor_readings` — o que mantém `MAX(time_stamp)` válido como watermark e torna o job auto-curável após quedas. O **job de status** (30 min) faz uma chamada bulk `/v1/sensors` e mantém a tabela `sensor_status` com uma linha por sensor, porque `channel_flags`/`channel_state` só existem no endpoint realtime. `/readings/latest-by-sensor` passa a ler dessa tabela, eliminando a mistura de dois relógios na interface.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy Core (`text()`), Alembic, TimescaleDB (Postgres 16), pytest; React 19 + Vite + TypeScript + Vitest no frontend.

## Global Constraints

- **Spec de referência:** `airquality-app/docs/superpowers/specs/2026-08-03-reforma-ingestao-arquivo-bruto-design.md`. Toda decisão com "porquê" está lá.
- **Trabalhar direto na `master`** do repo `/home/willianflores/localhost/airquality-js-app`, sem worktree — padrão já usado nas fases anteriores deste projeto.
- **NÃO tocar em `pm2_5_corrected` de `sensor_readings` nem nos três continuous aggregates** (`municipio_hourly_pm25`, `municipio_daily_pm25`, `who_exceedance_days`). Decisão explícita do usuário: alterar a coluna gerada obrigaria a um rebuild sobre 32,4 M linhas. Qualquer task que proponha isso está errada.
- **`BackfillHistoricalPurpleAir` e `worker/backfill_cli.py` permanecem intactos** — o painel admin depende deles (`adapters/inbound/http/admin_sensors_router.py:136`) e o Runbook da Fase 6 usa o CLI para a recuperação do gap.
- **A chamada de status usa 7 campos**, não 5: `last_seen`, `channel_flags`, `channel_state`, `pm2.5_atm_a`, `pm2.5_atm_b`, `latitude`, `longitude`. A spec menciona 5; `latitude`/`longitude` foram adicionados ao planejar porque `/readings/latest-by-sensor` devolve a posição do sensor e o mapa do frontend depende dela. Custo adicional desprezível (2 pontos por linha).
- **Ingestão está suspensa e continua suspensa.** Nenhuma task deste plano chama a API real da PurpleAir nem liga o worker. Testes usam fakes ou `httpx.MockTransport`. Ligar a ingestão é decisão separada do usuário, no Runbook da Fase 6.
- **Idempotência preservada:** `bulk_insert` usa `ON CONFLICT (sensor_index, time_stamp) DO NOTHING` e retorna a contagem real de linhas inseridas (`rowcount` por linha). Não alterar esse comportamento.
- Nomes de teste e mensagens de commit em português, consistente com o repositório. Código e identificadores em inglês.

## File Structure

```text
backend/
├── alembic/versions/
│   ├── 0010_create_sensor_status.py                    # Create (Task 3)
│   └── 0011_drop_channel_status_from_readings.py       # Create (Task 8)
├── domain/entities/
│   └── sensor_status.py                                # Create (Task 3)
├── application/
│   ├── ports/
│   │   ├── sensor_reading_repository.py                # Modify (Task 1): + latest_timestamps()
│   │   ├── sensor_status_repository.py                 # Create (Task 3)
│   │   └── purpleair_client.py                         # Modify (Task 4): + fetch_status()
│   └── use_cases/
│       ├── ingest_archive_purpleair.py                 # Create (Task 2)
│       ├── refresh_sensor_status.py                    # Create (Task 4)
│       └── ingest_realtime_purpleair.py                # Delete (Task 7)
├── adapters/outbound/
│   ├── postgres/
│   │   ├── postgres_sensor_reading_repository.py       # Modify (Task 1)
│   │   ├── postgres_sensor_status_repository.py        # Create (Task 3)
│   │   └── postgres_latest_sensor_reading_repository.py # Modify (Task 5): fonte vira sensor_status
│   ├── memory/
│   │   └── in_memory_sensor_status_repository.py       # Create (Task 3)
│   └── purpleair/
│       └── purpleair_api_client.py                     # Modify (Task 4): + fetch_status()
├── infrastructure/
│   ├── healthchecks.py                                 # Create (Task 6)
│   └── settings.py                                     # Modify (Tasks 2, 6, 7)
└── worker/
    └── main.py                                         # Modify (Task 7): dois jobs, duas cadências

infra/
├── docker-compose.yml                                  # Modify (Task 7): env vars do worker
└── docker-compose.prod.yml                             # Modify (Task 7): idem

frontend/src/
├── domain/reading.ts                                   # Modify (Task 9)
└── ui/pages/
    ├── SensoresPage.tsx                                # Modify (Task 9)
    └── MunicipioPage.tsx                               # Modify (Task 9)
```

---

### Task 1: `latest_timestamps()` no repositório de leituras

**Files:**
- Modify: `backend/application/ports/sensor_reading_repository.py`
- Modify: `backend/adapters/outbound/postgres/postgres_sensor_reading_repository.py`
- Test: `backend/tests/adapters/test_postgres_sensor_reading_repository.py`

**Interfaces:**
- Consumes: tabela `sensor_readings` (hypertable já existente).
- Produces: `SensorReadingRepository.latest_timestamps() -> dict[int, datetime]` — mapa `sensor_index → última leitura`. Sensores sem nenhuma linha simplesmente não aparecem no dicionário. Consumido pela Task 2.

**Por que um dicionário e não uma consulta por sensor:** o job de arquivo precisa do watermark de todos os sensores a cada execução. Uma consulta agregada é uma ida ao banco em vez de N.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `backend/tests/adapters/test_postgres_sensor_reading_repository.py`:

```python
def test_latest_timestamps_returns_max_per_sensor(db_session):
    repository = PostgresSensorReadingRepository(db_session)
    readings = [
        {
            "time_stamp": datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc),
            "sensor_index": 999201,
            "mun_name": "Rio Branco",
        },
        {
            "time_stamp": datetime(2026, 1, 1, 18, 0, 0, tzinfo=timezone.utc),
            "sensor_index": 999201,
            "mun_name": "Rio Branco",
        },
        {
            "time_stamp": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
            "sensor_index": 999202,
            "mun_name": "Cruzeiro do Sul",
        },
    ]
    repository.bulk_insert(readings)

    result = repository.latest_timestamps()

    assert result[999201] == datetime(2026, 1, 1, 18, 0, 0, tzinfo=timezone.utc)
    assert result[999202] == datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

def test_latest_timestamps_omits_sensor_without_readings(db_session):
    repository = PostgresSensorReadingRepository(db_session)

    result = repository.latest_timestamps()

    assert 999203 not in result
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && .venv/bin/python -m pytest tests/adapters/test_postgres_sensor_reading_repository.py -v`
Expected: FAIL com `AttributeError: 'PostgresSensorReadingRepository' object has no attribute 'latest_timestamps'`.

- [ ] **Step 3: Declarar o método no port**

Em `backend/application/ports/sensor_reading_repository.py`, o arquivo passa a ser:

```python
from abc import ABC, abstractmethod
from datetime import datetime

class SensorReadingRepository(ABC):
    @abstractmethod
    def bulk_insert(self, readings: list[dict]) -> int:
        """Returns the number of readings processed, not a guaranteed insert count (duplicates are silently skipped)."""
        raise NotImplementedError

    @abstractmethod
    def latest_timestamps(self) -> dict[int, datetime]:
        """Maps sensor_index to its most recent reading timestamp.

        Sensors with no readings are absent from the mapping — the caller
        decides what window to use for them.
        """
        raise NotImplementedError
```

- [ ] **Step 4: Implementar no adapter Postgres**

Em `backend/adapters/outbound/postgres/postgres_sensor_reading_repository.py`, adicionar ao fim da classe (e incluir `from datetime import datetime` no topo do arquivo):

```python
    def latest_timestamps(self) -> dict[int, datetime]:
        rows = self._session.execute(
            text("SELECT sensor_index, max(time_stamp) AS latest FROM sensor_readings GROUP BY sensor_index")
        ).all()
        return {r.sensor_index: r.latest for r in rows}
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `cd backend && .venv/bin/python -m pytest tests/adapters/test_postgres_sensor_reading_repository.py -v`
Expected: PASS, 6 testes (os 4 que já existiam mais os 2 novos).

- [ ] **Step 6: Commit**

```bash
git add backend/application/ports/sensor_reading_repository.py \
        backend/adapters/outbound/postgres/postgres_sensor_reading_repository.py \
        backend/tests/adapters/test_postgres_sensor_reading_repository.py
git commit -m "feat(backend): adiciona latest_timestamps() para o watermark por sensor"
```

---

### Task 2: Caso de uso `IngestArchivePurpleAir`

**Files:**
- Create: `backend/application/use_cases/ingest_archive_purpleair.py`
- Modify: `backend/infrastructure/settings.py`
- Test: `backend/tests/application/test_ingest_archive_purpleair.py`

**Interfaces:**
- Consumes: `SensorRepository.list_active() -> list[Sensor]`; `SensorReadingRepository.latest_timestamps() -> dict[int, datetime]` (Task 1); `SensorReadingRepository.bulk_insert(readings: list[dict]) -> int`; `PurpleAirClient.fetch_history(sensor_index: int, start: datetime, end: datetime) -> Iterator[list[dict]]`; `IngestionRunRepository.start(source: str) -> int` e `.finish(run_id: int, status: str, records_ingested: int) -> None`.
- Produces: `IngestArchivePurpleAir(sensor_repository, purpleair_client, sensor_reading_repository, ingestion_run_repository, default_lookback_days: int = 7, max_window_days: int = 30)` com `execute(now: datetime | None = None) -> ArchiveRunResult`, onde `ArchiveRunResult` é um dataclass congelado com `inserted: int` e `failed_sensor_indices: list[int]`. Consumido pela Task 7.

**Regra da janela, que é o coração desta task:**

| Situação | `start` | `end` |
|---|---|---|
| Sensor tem watermark | o próprio watermark | `min(start + max_window_days, now)` |
| Sensor sem nenhuma leitura | `now - default_lookback_days` | `min(start + max_window_days, now)` |
| `start >= now` | — | sensor é pulado, sem chamada à API |

O teto (`max_window_days`) é disjuntor, não economia: limita quanto uma única execução automática pode buscar. Buraco de 90 dias fecha em 3 execuções, porque o watermark avança a cada uma.

**Isolamento de falha:** um sensor que levanta exceção é registrado em `failed_sensor_indices` e o laço segue para o próximo. Como o watermark daquele sensor não avança, a execução seguinte cobre o período perdido automaticamente. A execução é finalizada como `"partial"` se houver qualquer falha, `"success"` caso contrário. A coluna `status` de `ingestion_runs` é `sa.String` sem CHECK, então `"partial"` é válido.

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/application/test_ingest_archive_purpleair.py`:

```python
from datetime import datetime, timedelta, timezone

from domain.entities.sensor import Sensor
from application.use_cases.ingest_archive_purpleair import IngestArchivePurpleAir

NOW = datetime(2026, 8, 3, 12, 0, 0, tzinfo=timezone.utc)

class FakeSensorRepository:
    def __init__(self, sensors):
        self._sensors = sensors

    def list_active(self):
        return self._sensors

class FakePurpleAirClient:
    def __init__(self, rows_per_call=None, failing_sensor_indices=()):
        self._rows_per_call = rows_per_call if rows_per_call is not None else [{"pm2_5_atm_a": 10.0}]
        self._failing = set(failing_sensor_indices)
        self.calls = []

    def fetch_realtime(self, sensor_indices):
        raise NotImplementedError

    def fetch_history(self, sensor_index, start, end):
        self.calls.append((sensor_index, start, end))
        if sensor_index in self._failing:
            raise RuntimeError("API fora do ar")
        yield [dict(row, sensor_index=sensor_index) for row in self._rows_per_call]

class FakeSensorReadingRepository:
    def __init__(self, watermarks=None):
        self._watermarks = watermarks or {}
        self.inserted = []

    def bulk_insert(self, readings):
        self.inserted.extend(readings)
        return len(readings)

    def latest_timestamps(self):
        return dict(self._watermarks)

class FakeIngestionRunRepository:
    def __init__(self):
        self.started = []
        self.finished = []

    def start(self, source):
        self.started.append(source)
        return 1

    def finish(self, run_id, status, records_ingested):
        self.finished.append((run_id, status, records_ingested))

def _sensor(sensor_index, municipio="Rio Branco"):
    return Sensor(
        id=sensor_index, code=f"S{sensor_index}", sensor_index=sensor_index,
        name=f"sensor-{sensor_index}", municipio=municipio, active=True,
        latitude=None, longitude=None,
    )

def _build(sensor_repository, client, reading_repository, run_repository, **kwargs):
    return IngestArchivePurpleAir(
        sensor_repository, client, reading_repository, run_repository, **kwargs
    )

def test_window_starts_at_sensor_watermark():
    watermark = NOW - timedelta(hours=1)
    client = FakePurpleAirClient()
    reading_repository = FakeSensorReadingRepository({25549: watermark})

    use_case = _build(
        FakeSensorRepository([_sensor(25549)]), client, reading_repository,
        FakeIngestionRunRepository(),
    )
    use_case.execute(now=NOW)

    assert client.calls == [(25549, watermark, NOW)]

def test_window_uses_default_lookback_when_sensor_has_no_readings():
    client = FakePurpleAirClient()

    use_case = _build(
        FakeSensorRepository([_sensor(25549)]), client, FakeSensorReadingRepository({}),
        FakeIngestionRunRepository(), default_lookback_days=7,
    )
    use_case.execute(now=NOW)

    sensor_index, start, end = client.calls[0]
    assert start == NOW - timedelta(days=7)
    assert end == NOW

def test_window_is_capped_by_max_window_days():
    watermark = NOW - timedelta(days=90)
    client = FakePurpleAirClient()

    use_case = _build(
        FakeSensorRepository([_sensor(25549)]), client,
        FakeSensorReadingRepository({25549: watermark}), FakeIngestionRunRepository(),
        max_window_days=30,
    )
    use_case.execute(now=NOW)

    sensor_index, start, end = client.calls[0]
    assert start == watermark
    assert end == watermark + timedelta(days=30)

def test_sensor_already_up_to_date_is_skipped():
    client = FakePurpleAirClient()

    use_case = _build(
        FakeSensorRepository([_sensor(25549)]), client,
        FakeSensorReadingRepository({25549: NOW}), FakeIngestionRunRepository(),
    )
    result = use_case.execute(now=NOW)

    assert client.calls == []
    assert result.inserted == 0

def test_readings_are_stamped_with_municipio():
    reading_repository = FakeSensorReadingRepository({25549: NOW - timedelta(hours=1)})

    use_case = _build(
        FakeSensorRepository([_sensor(25549, municipio="Xapuri")]), FakePurpleAirClient(),
        reading_repository, FakeIngestionRunRepository(),
    )
    use_case.execute(now=NOW)

    assert reading_repository.inserted[0]["mun_name"] == "Xapuri"

def test_failing_sensor_does_not_stop_the_others():
    watermark = NOW - timedelta(hours=1)
    client = FakePurpleAirClient(failing_sensor_indices=[25549])
    reading_repository = FakeSensorReadingRepository({25549: watermark, 25550: watermark})
    run_repository = FakeIngestionRunRepository()

    use_case = _build(
        FakeSensorRepository([_sensor(25549), _sensor(25550)]), client,
        reading_repository, run_repository,
    )
    result = use_case.execute(now=NOW)

    assert result.failed_sensor_indices == [25549]
    assert result.inserted == 1
    assert [r["sensor_index"] for r in reading_repository.inserted] == [25550]
    assert run_repository.finished == [(1, "partial", 1)]

def test_run_is_marked_success_when_every_sensor_passes():
    run_repository = FakeIngestionRunRepository()

    use_case = _build(
        FakeSensorRepository([_sensor(25549)]), FakePurpleAirClient(),
        FakeSensorReadingRepository({25549: NOW - timedelta(hours=1)}), run_repository,
    )
    use_case.execute(now=NOW)

    assert run_repository.started == ["archive"]
    assert run_repository.finished == [(1, "success", 1)]
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd backend && .venv/bin/python -m pytest tests/application/test_ingest_archive_purpleair.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'application.use_cases.ingest_archive_purpleair'`.

- [ ] **Step 3: Implementar o caso de uso**

Criar `backend/application/use_cases/ingest_archive_purpleair.py`:

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from application.ports.ingestion_run_repository import IngestionRunRepository
from application.ports.purpleair_client import PurpleAirClient
from application.ports.sensor_reading_repository import SensorReadingRepository
from application.ports.sensor_repository import SensorRepository

@dataclass(frozen=True)
class ArchiveRunResult:
    inserted: int
    failed_sensor_indices: list[int] = field(default_factory=list)

class IngestArchivePurpleAir:
    """Busca o histórico bruto de cada sensor desde o ponto onde o arquivo parou.

    Diferente do snapshot que existia antes, o endpoint /history devolve a janela
    inteira, então nenhuma leitura é perdida entre execuções. Como a janela começa
    no watermark do sensor, uma queda de N horas vira uma janela de N horas na
    execução seguinte — o job se recupera sozinho, sem backfill manual.
    """

    def __init__(
        self,
        sensor_repository: SensorRepository,
        purpleair_client: PurpleAirClient,
        sensor_reading_repository: SensorReadingRepository,
        ingestion_run_repository: IngestionRunRepository,
        default_lookback_days: int = 7,
        max_window_days: int = 30,
    ) -> None:
        self._sensor_repository = sensor_repository
        self._purpleair_client = purpleair_client
        self._sensor_reading_repository = sensor_reading_repository
        self._ingestion_run_repository = ingestion_run_repository
        self._default_lookback_days = default_lookback_days
        self._max_window_days = max_window_days

    def execute(self, now: datetime | None = None) -> ArchiveRunResult:
        now = now or datetime.now(timezone.utc)
        sensors = self._sensor_repository.list_active()
        watermarks = self._sensor_reading_repository.latest_timestamps()

        run_id = self._ingestion_run_repository.start("archive")
        inserted = 0
        failed: list[int] = []

        for sensor in sensors:
            window = self._window_for(watermarks.get(sensor.sensor_index), now)
            if window is None:
                continue
            start, end = window
            try:
                inserted += self._ingest_sensor(sensor, start, end)
            except Exception:
                # Falha de um sensor não derruba os demais. O watermark dele não
                # avança, então a execução seguinte cobre o período perdido.
                failed.append(sensor.sensor_index)

        status = "partial" if failed else "success"
        self._ingestion_run_repository.finish(run_id, status, inserted)
        return ArchiveRunResult(inserted=inserted, failed_sensor_indices=failed)

    def _window_for(
        self, watermark: datetime | None, now: datetime
    ) -> tuple[datetime, datetime] | None:
        if watermark is None:
            start = now - timedelta(days=self._default_lookback_days)
        else:
            start = watermark
        if start >= now:
            return None
        end = min(start + timedelta(days=self._max_window_days), now)
        return start, end

    def _ingest_sensor(self, sensor, start: datetime, end: datetime) -> int:
        inserted = 0
        for window_readings in self._purpleair_client.fetch_history(
            sensor.sensor_index, start, end
        ):
            for reading in window_readings:
                reading["mun_name"] = sensor.municipio
            inserted += self._sensor_reading_repository.bulk_insert(window_readings)
        return inserted
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd backend && .venv/bin/python -m pytest tests/application/test_ingest_archive_purpleair.py -v`
Expected: PASS, 7 testes.

- [ ] **Step 5: Adicionar as configurações**

Em `backend/infrastructure/settings.py`, adicionar dentro da classe `Settings`, logo após `ingest_interval_seconds`:

```python
    archive_interval_seconds: int = 3600
    archive_default_lookback_days: int = 7
    archive_max_window_days: int = 30
```

- [ ] **Step 6: Rodar a suíte inteira do backend**

Run: `cd backend && .venv/bin/python -m pytest`
Expected: PASS, contagem anterior + 7.

- [ ] **Step 7: Commit**

```bash
git add backend/application/use_cases/ingest_archive_purpleair.py \
        backend/tests/application/test_ingest_archive_purpleair.py \
        backend/infrastructure/settings.py
git commit -m "feat(backend): adiciona job de arquivo com janela por watermark"
```

---

### Task 3: Tabela `sensor_status`, entidade, port e adapters

**Files:**
- Create: `backend/alembic/versions/0010_create_sensor_status.py`
- Create: `backend/domain/entities/sensor_status.py`
- Create: `backend/application/ports/sensor_status_repository.py`
- Create: `backend/adapters/outbound/postgres/postgres_sensor_status_repository.py`
- Create: `backend/adapters/outbound/memory/in_memory_sensor_status_repository.py`
- Test: `backend/tests/adapters/test_postgres_sensor_status_repository.py`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: entidade `SensorStatus(sensor_index: int, last_seen: datetime, channel_flags: int | None, channel_state: int | None, pm2_5_corrected: float | None, latitude: float | None, longitude: float | None)`; port `SensorStatusRepository` com `upsert_many(statuses: list[dict]) -> int` e `list_all() -> list[SensorStatus]`. Consumido pelas Tasks 4 e 5.

**Sobre a coluna gerada:** `sensor_status` guarda os canais crus (`pm2_5_atm_a`, `pm2_5_atm_b`) que a chamada bulk devolve, mas a interface exibe o valor corrigido — e `/readings/latest-by-sensor` passa a ler desta tabela (Task 5). A expressão LRAPA abaixo é cópia literal de `0002_create_sensor_readings_hypertable.py:83-92`. A duplicação é deliberada: extrair para uma função compartilhada exigiria alterar a coluna gerada de `sensor_readings`, que é o rebuild de 32,4 M linhas que este plano evita.

**Por que não é hypertable:** é uma linha por sensor, sobrescrita a cada ciclo. Não é série temporal.

- [ ] **Step 1: Escrever a migration**

Criar `backend/alembic/versions/0010_create_sensor_status.py`:

```python
"""create sensor_status table

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-03
"""
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # A expressão de pm2_5_corrected é cópia literal da usada em sensor_readings
    # (0002_create_sensor_readings_hypertable.py). Duplicada de propósito:
    # extrair para função compartilhada obrigaria a recriar a coluna gerada de
    # sensor_readings, um rebuild sobre 32,4 M linhas.
    op.execute("""
        CREATE TABLE sensor_status (
            sensor_index integer PRIMARY KEY,
            last_seen timestamptz NOT NULL,
            channel_flags integer,
            channel_state integer,
            pm2_5_atm_a double precision,
            pm2_5_atm_b double precision,
            latitude double precision,
            longitude double precision,
            updated_at timestamptz NOT NULL DEFAULT now(),
            pm2_5_corrected double precision GENERATED ALWAYS AS (
                CASE
                    WHEN pm2_5_atm_a IS NOT NULL AND (0.5 * pm2_5_atm_a - 0.66) < 1000
                         AND pm2_5_atm_b IS NOT NULL AND (0.5 * pm2_5_atm_b - 0.66) < 1000
                        THEN (GREATEST(0.5 * pm2_5_atm_a - 0.66, 0) + GREATEST(0.5 * pm2_5_atm_b - 0.66, 0)) / 2
                    WHEN pm2_5_atm_a IS NOT NULL AND (0.5 * pm2_5_atm_a - 0.66) < 1000
                        THEN GREATEST(0.5 * pm2_5_atm_a - 0.66, 0)
                    WHEN pm2_5_atm_b IS NOT NULL AND (0.5 * pm2_5_atm_b - 0.66) < 1000
                        THEN GREATEST(0.5 * pm2_5_atm_b - 0.66, 0)
                    ELSE NULL
                END
            ) STORED
        )
    """)

def downgrade() -> None:
    op.execute("DROP TABLE sensor_status")
```

- [ ] **Step 2: Aplicar a migration nos dois bancos**

Run:
```bash
cd backend
.venv/bin/alembic upgrade head
TEST_DATABASE_URL="$(.venv/bin/python -c "
from infrastructure.settings import settings
print(settings.database_url.rsplit('/', 1)[0] + '/airquality_test')
")" DATABASE_URL="$(.venv/bin/python -c "
from infrastructure.settings import settings
print(settings.database_url.rsplit('/', 1)[0] + '/airquality_test')
")" .venv/bin/alembic upgrade head
```
Expected: `Running upgrade 0009 -> 0010, create sensor_status table` nas duas execuções. Confirmar com:
```bash
docker exec airquality_js_postgres psql -U airquality_user -d airquality -c "\d sensor_status"
```
Expected: a tabela aparece com `pm2_5_corrected` marcada como `generated always as (...) stored`.

- [ ] **Step 3: Escrever a entidade**

Criar `backend/domain/entities/sensor_status.py`:

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass(frozen=True)
class SensorStatus:
    sensor_index: int
    last_seen: datetime
    channel_flags: int | None
    channel_state: int | None
    pm2_5_corrected: float | None
    latitude: float | None
    longitude: float | None
```

- [ ] **Step 4: Escrever o port**

Criar `backend/application/ports/sensor_status_repository.py`:

```python
from abc import ABC, abstractmethod

from domain.entities.sensor_status import SensorStatus

class SensorStatusRepository(ABC):
    @abstractmethod
    def upsert_many(self, statuses: list[dict]) -> int:
        """Insere ou atualiza uma linha por sensor. Retorna quantas foram gravadas."""
        raise NotImplementedError

    @abstractmethod
    def list_all(self) -> list[SensorStatus]:
        raise NotImplementedError
```

- [ ] **Step 5: Escrever o teste do adapter Postgres**

Criar `backend/tests/adapters/test_postgres_sensor_status_repository.py`:

```python
from datetime import datetime, timezone

from adapters.outbound.postgres.postgres_sensor_status_repository import (
    PostgresSensorStatusRepository,
)

LAST_SEEN = datetime(2026, 8, 3, 12, 0, 0, tzinfo=timezone.utc)

def _status(sensor_index=999301, **overrides):
    base = {
        "sensor_index": sensor_index,
        "last_seen": LAST_SEEN,
        "channel_flags": 0,
        "channel_state": 3,
        "pm2_5_atm_a": 40.0,
        "pm2_5_atm_b": 44.0,
        "latitude": -9.97,
        "longitude": -67.81,
    }
    base.update(overrides)
    return base

def test_upsert_many_inserts_and_computes_corrected_value(db_session):
    repository = PostgresSensorStatusRepository(db_session)

    repository.upsert_many([_status()])

    stored = next(s for s in repository.list_all() if s.sensor_index == 999301)
    assert stored.last_seen == LAST_SEEN
    assert stored.channel_flags == 0
    assert stored.latitude == -9.97
    # Mesma fórmula LRAPA de sensor_readings: (max(0.5*40-0.66,0) + max(0.5*44-0.66,0)) / 2
    assert stored.pm2_5_corrected == 20.34

def test_upsert_many_overwrites_existing_sensor(db_session):
    repository = PostgresSensorStatusRepository(db_session)
    later = datetime(2026, 8, 3, 13, 0, 0, tzinfo=timezone.utc)

    repository.upsert_many([_status()])
    repository.upsert_many([_status(last_seen=later, pm2_5_atm_a=10.0, pm2_5_atm_b=10.0)])

    matching = [s for s in repository.list_all() if s.sensor_index == 999301]
    assert len(matching) == 1
    assert matching[0].last_seen == later
    assert matching[0].pm2_5_corrected == 4.34

def test_upsert_many_accepts_null_measurements(db_session):
    repository = PostgresSensorStatusRepository(db_session)

    repository.upsert_many([_status(sensor_index=999302, pm2_5_atm_a=None, pm2_5_atm_b=None)])

    stored = next(s for s in repository.list_all() if s.sensor_index == 999302)
    assert stored.pm2_5_corrected is None

def test_upsert_many_returns_row_count(db_session):
    repository = PostgresSensorStatusRepository(db_session)

    result = repository.upsert_many([_status(sensor_index=999303), _status(sensor_index=999304)])

    assert result == 2
```

- [ ] **Step 6: Rodar o teste e confirmar que falha**

Run: `cd backend && .venv/bin/python -m pytest tests/adapters/test_postgres_sensor_status_repository.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'adapters.outbound.postgres.postgres_sensor_status_repository'`.

- [ ] **Step 7: Implementar o adapter Postgres**

Criar `backend/adapters/outbound/postgres/postgres_sensor_status_repository.py`:

```python
from sqlalchemy import text
from sqlalchemy.orm import Session

from application.ports.sensor_status_repository import SensorStatusRepository
from domain.entities.sensor_status import SensorStatus

STATUS_COLUMNS = [
    "sensor_index", "last_seen", "channel_flags", "channel_state",
    "pm2_5_atm_a", "pm2_5_atm_b", "latitude", "longitude",
]

# pm2_5_corrected fica de fora do UPDATE: é coluna gerada, o Postgres recalcula
# sozinho a partir dos canais.
_UPDATABLE = [c for c in STATUS_COLUMNS if c != "sensor_index"]

class PostgresSensorStatusRepository(SensorStatusRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def upsert_many(self, statuses: list[dict]) -> int:
        if not statuses:
            return 0

        columns_sql = ", ".join(STATUS_COLUMNS)
        values_sql = ", ".join(f":{c}" for c in STATUS_COLUMNS)
        update_sql = ", ".join(f"{c} = EXCLUDED.{c}" for c in _UPDATABLE)
        stmt = text(
            f"INSERT INTO sensor_status ({columns_sql}, updated_at) "
            f"VALUES ({values_sql}, now()) "
            f"ON CONFLICT (sensor_index) DO UPDATE SET {update_sql}, updated_at = now()"
        )

        params = [{c: status.get(c) for c in STATUS_COLUMNS} for status in statuses]
        self._session.execute(stmt, params)
        self._session.commit()
        return len(params)

    def list_all(self) -> list[SensorStatus]:
        rows = self._session.execute(
            text("""
                SELECT sensor_index, last_seen, channel_flags, channel_state,
                       pm2_5_corrected, latitude, longitude
                FROM sensor_status
            """)
        ).all()
        return [
            SensorStatus(
                sensor_index=r.sensor_index,
                last_seen=r.last_seen,
                channel_flags=r.channel_flags,
                channel_state=r.channel_state,
                pm2_5_corrected=r.pm2_5_corrected,
                latitude=r.latitude,
                longitude=r.longitude,
            )
            for r in rows
        ]
```

- [ ] **Step 8: Implementar o adapter in-memory**

Criar `backend/adapters/outbound/memory/in_memory_sensor_status_repository.py`:

```python
from application.ports.sensor_status_repository import SensorStatusRepository
from domain.entities.sensor_status import SensorStatus

def _corrected(atm_a: float | None, atm_b: float | None) -> float | None:
    """Espelha a coluna gerada de sensor_status (fórmula LRAPA)."""
    values = [
        max(0.5 * value - 0.66, 0)
        for value in (atm_a, atm_b)
        if value is not None and (0.5 * value - 0.66) < 1000
    ]
    if not values:
        return None
    return sum(values) / len(values)

class InMemorySensorStatusRepository(SensorStatusRepository):
    def __init__(self) -> None:
        self._by_sensor_index: dict[int, SensorStatus] = {}

    def upsert_many(self, statuses: list[dict]) -> int:
        for status in statuses:
            sensor_index = status["sensor_index"]
            self._by_sensor_index[sensor_index] = SensorStatus(
                sensor_index=sensor_index,
                last_seen=status["last_seen"],
                channel_flags=status.get("channel_flags"),
                channel_state=status.get("channel_state"),
                pm2_5_corrected=_corrected(
                    status.get("pm2_5_atm_a"), status.get("pm2_5_atm_b")
                ),
                latitude=status.get("latitude"),
                longitude=status.get("longitude"),
            )
        return len(statuses)

    def list_all(self) -> list[SensorStatus]:
        return list(self._by_sensor_index.values())
```

- [ ] **Step 9: Rodar os testes e confirmar que passam**

Run: `cd backend && .venv/bin/python -m pytest tests/adapters/test_postgres_sensor_status_repository.py -v`
Expected: PASS, 4 testes.

- [ ] **Step 10: Commit**

```bash
git add backend/alembic/versions/0010_create_sensor_status.py \
        backend/domain/entities/sensor_status.py \
        backend/application/ports/sensor_status_repository.py \
        backend/adapters/outbound/postgres/postgres_sensor_status_repository.py \
        backend/adapters/outbound/memory/in_memory_sensor_status_repository.py \
        backend/tests/adapters/test_postgres_sensor_status_repository.py
git commit -m "feat(backend): adiciona tabela e repositorio de sensor_status"
```

---

### Task 4: `fetch_status()` no client e caso de uso `RefreshSensorStatus`

**Files:**
- Modify: `backend/application/ports/purpleair_client.py`
- Modify: `backend/adapters/outbound/purpleair/purpleair_api_client.py`
- Create: `backend/application/use_cases/refresh_sensor_status.py`
- Test: `backend/tests/adapters/test_purpleair_api_client.py`
- Test: `backend/tests/application/test_refresh_sensor_status.py`

**Interfaces:**
- Consumes: `SensorStatusRepository.upsert_many(statuses: list[dict]) -> int` (Task 3); `SensorRepository.list_active()`.
- Produces: `PurpleAirClient.fetch_status(sensor_indices: list[int]) -> list[dict]`, cada dict com as chaves `sensor_index`, `last_seen`, `channel_flags`, `channel_state`, `pm2_5_atm_a`, `pm2_5_atm_b`, `latitude`, `longitude`; `RefreshSensorStatus(sensor_repository, purpleair_client, sensor_status_repository)` com `execute() -> int`. Consumido pela Task 7.

**Por que um método novo e não reaproveitar `fetch_realtime`:** `fetch_realtime` pede os ~60 campos de `REALTIME_FIELDS`, porque alimentava o arquivo. O job de status precisa de 7. Como o custo em pontos da PurpleAir escala por campo × linha, pedir 60 onde 7 bastam multiplicaria o custo dessa camada por quase 9.

- [ ] **Step 1: Escrever o teste do client**

Adicionar ao fim de `backend/tests/adapters/test_purpleair_api_client.py`. O arquivo já
importa `datetime`, `timezone`, `httpx` e `pytest`, e já define o helper
`_client_with_handler(handler)` — reusar em vez de montar o transport de novo:

```python
def test_fetch_status_requests_only_the_status_fields():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(
            200,
            json={
                "fields": [
                    "sensor_index", "last_seen", "channel_flags", "channel_state",
                    "pm2.5_atm_a", "pm2.5_atm_b", "latitude", "longitude",
                ],
                # 1785758400 == 2026-08-03 12:00:00 UTC (conferido)
                "data": [[25549, 1785758400, 0, 3, 40.0, 44.0, -9.97, -67.81]],
            },
        )

    client = _client_with_handler(handler)

    result = client.fetch_status([25549])

    assert "show_only=25549" in captured["url"]
    assert "pm10.0_atm" not in captured["url"]
    assert result == [
        {
            "sensor_index": 25549,
            "last_seen": datetime(2026, 8, 3, 12, 0, 0, tzinfo=timezone.utc),
            "channel_flags": 0,
            "channel_state": 3,
            "pm2_5_atm_a": 40.0,
            "pm2_5_atm_b": 44.0,
            "latitude": -9.97,
            "longitude": -67.81,
        }
    ]

def test_fetch_status_returns_empty_without_sensor_indices():
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("não deveria chamar a API sem sensores")

    client = _client_with_handler(handler)

    assert client.fetch_status([]) == []
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && .venv/bin/python -m pytest tests/adapters/test_purpleair_api_client.py -k fetch_status -v`
Expected: FAIL com `AttributeError: 'PurpleAirApiClient' object has no attribute 'fetch_status'`.

- [ ] **Step 3: Declarar no port**

Em `backend/application/ports/purpleair_client.py`, adicionar ao final da classe:

```python
    @abstractmethod
    def fetch_status(self, sensor_indices: list[int]) -> list[dict]:
        raise NotImplementedError
```

- [ ] **Step 4: Implementar no client**

Em `backend/adapters/outbound/purpleair/purpleair_api_client.py`, adicionar após a constante `REALTIME_FIELDS`:

```python
# Campos mínimos do job de status. Custo da API escala por campo × linha, então
# esta camada pede só o necessário para responder "o sensor está vivo?" e
# posicionar/colorir o pino no mapa — não os ~60 campos do arquivo.
STATUS_ONLY_FIELDS = [
    "sensor_index", "last_seen", "channel_flags", "channel_state",
    "pm2.5_atm_a", "pm2.5_atm_b", "latitude", "longitude",
]
```

E adicionar o método na classe `PurpleAirApiClient`, logo após `fetch_realtime`:

```python
    def fetch_status(self, sensor_indices: list[int]) -> list[dict]:
        if not sensor_indices:
            return []

        response = self._request_with_retry(
            "/v1/sensors",
            {
                "show_only": ",".join(str(i) for i in sensor_indices),
                "fields": ",".join(STATUS_ONLY_FIELDS),
            },
        )
        body = response.json()
        field_names = [_normalize_field(f) for f in body["fields"]]

        statuses = []
        for row in body["data"]:
            status = dict(zip(field_names, row))
            status["last_seen"] = datetime.fromtimestamp(
                status.pop("last_seen"), tz=timezone.utc
            )
            status["sensor_index"] = int(status["sensor_index"])
            statuses.append(status)
        return statuses
```

- [ ] **Step 5: Rodar o teste do client e confirmar que passa**

Run: `cd backend && .venv/bin/python -m pytest tests/adapters/test_purpleair_api_client.py -v`
Expected: PASS, os testes que já existiam mais os 2 novos.

- [ ] **Step 6: Escrever o teste do caso de uso**

Criar `backend/tests/application/test_refresh_sensor_status.py`:

```python
from datetime import datetime, timezone

from adapters.outbound.memory.in_memory_sensor_status_repository import (
    InMemorySensorStatusRepository,
)
from domain.entities.sensor import Sensor
from application.use_cases.refresh_sensor_status import RefreshSensorStatus

LAST_SEEN = datetime(2026, 8, 3, 12, 0, 0, tzinfo=timezone.utc)

class FakeSensorRepository:
    def __init__(self, sensors):
        self._sensors = sensors

    def list_active(self):
        return self._sensors

class FakePurpleAirClient:
    def __init__(self, statuses):
        self._statuses = statuses
        self.requested_sensor_indices = None

    def fetch_realtime(self, sensor_indices):
        raise NotImplementedError

    def fetch_history(self, sensor_index, start, end):
        raise NotImplementedError

    def fetch_status(self, sensor_indices):
        self.requested_sensor_indices = sensor_indices
        return self._statuses

def _sensor(sensor_index):
    return Sensor(
        id=sensor_index, code=f"S{sensor_index}", sensor_index=sensor_index,
        name=f"sensor-{sensor_index}", municipio="Rio Branco", active=True,
        latitude=None, longitude=None,
    )

def test_execute_stores_status_for_active_sensors():
    client = FakePurpleAirClient([
        {
            "sensor_index": 25549, "last_seen": LAST_SEEN, "channel_flags": 0,
            "channel_state": 3, "pm2_5_atm_a": 40.0, "pm2_5_atm_b": 44.0,
            "latitude": -9.97, "longitude": -67.81,
        }
    ])
    status_repository = InMemorySensorStatusRepository()

    use_case = RefreshSensorStatus(
        FakeSensorRepository([_sensor(25549)]), client, status_repository
    )
    result = use_case.execute()

    assert result == 1
    assert client.requested_sensor_indices == [25549]
    stored = status_repository.list_all()[0]
    assert stored.sensor_index == 25549
    assert stored.channel_flags == 0
    assert stored.pm2_5_corrected == 20.34

def test_execute_without_active_sensors_does_not_call_the_api():
    client = FakePurpleAirClient([])
    status_repository = InMemorySensorStatusRepository()

    use_case = RefreshSensorStatus(FakeSensorRepository([]), client, status_repository)
    result = use_case.execute()

    assert result == 0
    assert client.requested_sensor_indices is None
    assert status_repository.list_all() == []
```

- [ ] **Step 7: Rodar o teste e confirmar que falha**

Run: `cd backend && .venv/bin/python -m pytest tests/application/test_refresh_sensor_status.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'application.use_cases.refresh_sensor_status'`.

- [ ] **Step 8: Implementar o caso de uso**

Criar `backend/application/use_cases/refresh_sensor_status.py`:

```python
from application.ports.purpleair_client import PurpleAirClient
from application.ports.sensor_repository import SensorRepository
from application.ports.sensor_status_repository import SensorStatusRepository

class RefreshSensorStatus:
    """Mantém uma linha por sensor com o estado mais recente conhecido.

    Existe separado do job de arquivo porque channel_flags e channel_state só
    são oferecidos pelo endpoint realtime — o /history não os tem. Escreve em
    sensor_status, nunca em sensor_readings, para que o arquivo continue com um
    escritor único e o watermark permaneça confiável.
    """

    def __init__(
        self,
        sensor_repository: SensorRepository,
        purpleair_client: PurpleAirClient,
        sensor_status_repository: SensorStatusRepository,
    ) -> None:
        self._sensor_repository = sensor_repository
        self._purpleair_client = purpleair_client
        self._sensor_status_repository = sensor_status_repository

    def execute(self) -> int:
        sensors = self._sensor_repository.list_active()
        if not sensors:
            return 0

        statuses = self._purpleair_client.fetch_status(
            [s.sensor_index for s in sensors]
        )
        return self._sensor_status_repository.upsert_many(statuses)
```

- [ ] **Step 9: Rodar os testes e confirmar que passam**

Run: `cd backend && .venv/bin/python -m pytest tests/application/test_refresh_sensor_status.py tests/adapters/test_purpleair_api_client.py -v`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add backend/application/ports/purpleair_client.py \
        backend/adapters/outbound/purpleair/purpleair_api_client.py \
        backend/application/use_cases/refresh_sensor_status.py \
        backend/tests/adapters/test_purpleair_api_client.py \
        backend/tests/application/test_refresh_sensor_status.py
git commit -m "feat(backend): adiciona chamada de status e caso de uso RefreshSensorStatus"
```

---

### Task 5: `/readings/latest-by-sensor` passa a ler de `sensor_status`

**Files:**
- Modify: `backend/adapters/outbound/postgres/postgres_latest_sensor_reading_repository.py`
- Test: `backend/tests/adapters/test_readings_router.py`

**Interfaces:**
- Consumes: tabela `sensor_status` (Task 3).
- Produces: nenhuma assinatura nova. `LatestSensorReadingRepository.list_latest() -> list[SensorLatestReading]`, o caso de uso `GetLatestSensorReadings` e o formato da resposta HTTP permanecem idênticos — só a fonte da consulta muda.

**Por que trocar só o SQL e não criar um adapter novo:** o port, a entidade `SensorLatestReading` e o caso de uso já modelam exatamente o que a tabela de status contém. Trocar a implementação mantém o contrato com o frontend intacto e reduz o diff ao mínimo.

**Sobre o campo `time_stamp`:** a entidade e a resposta HTTP mantêm o nome `time_stamp`, alimentado agora por `sensor_status.last_seen`. O significado não muda — é o instante da última leitura do sensor — e preservar o nome evita mexer no contrato com o frontend sem necessidade.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `backend/tests/adapters/test_readings_router.py`:

```python
def test_get_latest_by_sensor_reads_from_sensor_status(client, db_connection):
    db_connection.execute(
        text("""
            INSERT INTO sensor_status (
                sensor_index, last_seen, channel_flags, channel_state,
                pm2_5_atm_a, pm2_5_atm_b, latitude, longitude
            )
            VALUES (999401, '2026-08-03T12:00:00Z', 0, 3, 40.0, 44.0, -9.97, -67.81)
        """)
    )
    db_connection.commit()

    response = client.get("/readings/latest-by-sensor")

    assert response.status_code == 200
    row = next(r for r in response.json() if r["sensor_index"] == 999401)
    assert row["pm2_5_corrected"] == 20.34
    assert row["channel_flags"] == 0
    assert row["latitude"] == -9.97
    assert row["longitude"] == -67.81

    db_connection.execute(text("DELETE FROM sensor_status WHERE sensor_index = 999401"))
    db_connection.commit()

def test_get_latest_by_sensor_ignores_sensor_readings(client, db_connection):
    db_connection.execute(
        text("""
            INSERT INTO sensor_readings (time_stamp, sensor_index, pm2_5_atm_a, pm2_5_atm_b, mun_name)
            VALUES ('2026-08-03T12:00:00Z', 999402, 40.0, 44.0, 'Rio Branco')
        """)
    )
    db_connection.commit()

    response = client.get("/readings/latest-by-sensor")

    assert response.status_code == 200
    assert all(r["sensor_index"] != 999402 for r in response.json())
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd backend && .venv/bin/python -m pytest tests/adapters/test_readings_router.py -k latest_by_sensor -v`
Expected: o primeiro teste FALHA (nenhuma linha com `sensor_index` 999401 na resposta, porque a consulta ainda lê `sensor_readings`); o segundo FALHA (a linha 999402 aparece na resposta).

- [ ] **Step 3: Trocar a fonte da consulta**

Substituir o corpo de `list_latest` em `backend/adapters/outbound/postgres/postgres_latest_sensor_reading_repository.py`; o arquivo inteiro passa a ser:

```python
from sqlalchemy import text
from sqlalchemy.orm import Session

from application.ports.latest_sensor_reading_repository import LatestSensorReadingRepository
from domain.entities.sensor_latest_reading import SensorLatestReading

class PostgresLatestSensorReadingRepository(LatestSensorReadingRepository):
    """Lê de sensor_status, não de sensor_readings.

    A tabela de status é atualizada a cada 30 min pelo job de status e traz
    valor, posição e channel_flags do mesmo instante. Ler de sensor_readings
    (atualizada de hora em hora pelo job de arquivo) misturaria dois relógios:
    um sensor que voltasse a reportar apareceria offline por até uma hora,
    porque o arquivo ainda não teria buscado a leitura.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_latest(self) -> list[SensorLatestReading]:
        rows = self._session.execute(
            text("""
                SELECT sensor_index, last_seen, pm2_5_corrected,
                       latitude, longitude, channel_flags
                FROM sensor_status
            """)
        ).all()
        return [
            SensorLatestReading(
                sensor_index=r.sensor_index,
                time_stamp=r.last_seen,
                pm2_5_corrected=r.pm2_5_corrected,
                latitude=r.latitude,
                longitude=r.longitude,
                channel_flags=r.channel_flags,
            )
            for r in rows
        ]
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd backend && .venv/bin/python -m pytest tests/adapters/test_readings_router.py -v`
Expected: PASS, todos.

- [ ] **Step 5: Rodar a suíte inteira do backend**

Run: `cd backend && .venv/bin/python -m pytest`
Expected: PASS. Se algum teste antigo de `latest-by-sensor` semeava `sensor_readings` e esperava vê-lo na resposta, ele agora está errado por design — atualizar para semear `sensor_status`.

- [ ] **Step 6: Commit**

```bash
git add backend/adapters/outbound/postgres/postgres_latest_sensor_reading_repository.py \
        backend/tests/adapters/test_readings_router.py
git commit -m "feat(backend): latest-by-sensor passa a ler de sensor_status"
```

---

### Task 6: Ping do healthchecks.io

**Files:**
- Create: `backend/infrastructure/healthchecks.py`
- Modify: `backend/infrastructure/settings.py`
- Test: `backend/tests/infrastructure/test_healthchecks.py`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `ping(base_url: str, success: bool = True, timeout: float = 5.0) -> None`. Consumido pela Task 7.

**Contrato de comportamento:** URL vazia é no-op (padrão em desenvolvimento e nos testes). Falha de rede nunca propaga — o ping é observabilidade, não pode derrubar a ingestão que ele monitora. Sucesso bate na URL como está; falha bate em `<url>/fail`.

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/infrastructure/test_healthchecks.py`:

```python
import httpx

from infrastructure import healthchecks

def test_ping_success_hits_the_base_url(monkeypatch):
    captured = {}

    def fake_get(url, timeout):
        captured["url"] = url
        return httpx.Response(200)

    monkeypatch.setattr(healthchecks.httpx, "get", fake_get)

    healthchecks.ping("https://hc-ping.com/uuid-de-teste")

    assert captured["url"] == "https://hc-ping.com/uuid-de-teste"

def test_ping_failure_hits_the_fail_endpoint(monkeypatch):
    captured = {}

    def fake_get(url, timeout):
        captured["url"] = url
        return httpx.Response(200)

    monkeypatch.setattr(healthchecks.httpx, "get", fake_get)

    healthchecks.ping("https://hc-ping.com/uuid-de-teste/", success=False)

    assert captured["url"] == "https://hc-ping.com/uuid-de-teste/fail"

def test_ping_without_url_does_nothing(monkeypatch):
    def fail_if_called(url, timeout):
        raise AssertionError("não deveria chamar a rede sem URL configurada")

    monkeypatch.setattr(healthchecks.httpx, "get", fail_if_called)

    healthchecks.ping("")

def test_ping_swallows_network_errors(monkeypatch):
    def fake_get(url, timeout):
        raise httpx.ConnectError("sem rede")

    monkeypatch.setattr(healthchecks.httpx, "get", fake_get)

    healthchecks.ping("https://hc-ping.com/uuid-de-teste")
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd backend && .venv/bin/python -m pytest tests/infrastructure/test_healthchecks.py -v`
Expected: FAIL com `ImportError: cannot import name 'healthchecks' from 'infrastructure'`.

- [ ] **Step 3: Implementar o módulo**

Criar `backend/infrastructure/healthchecks.py`:

```python
import httpx

def ping(base_url: str, success: bool = True, timeout: float = 5.0) -> None:
    """Sinaliza para o healthchecks.io que um ciclo terminou.

    Se o serviço parar de receber pings dentro do prazo configurado lá, ele
    alerta por e-mail — o que detecta container morto e servidor desligado,
    casos em que um alerta gerado pelo próprio processo nunca sairia.

    URL vazia desliga o ping (padrão em desenvolvimento). Erro de rede é
    engolido de propósito: observabilidade não pode derrubar a ingestão que
    ela existe para vigiar.
    """
    if not base_url:
        return

    url = base_url if success else base_url.rstrip("/") + "/fail"
    try:
        httpx.get(url, timeout=timeout)
    except Exception:
        pass
```

- [ ] **Step 4: Adicionar a configuração**

Em `backend/infrastructure/settings.py`, adicionar dentro da classe `Settings`:

```python
    healthchecks_ping_url: str = ""
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `cd backend && .venv/bin/python -m pytest tests/infrastructure/test_healthchecks.py -v`
Expected: PASS, 4 testes.

- [ ] **Step 6: Commit**

```bash
git add backend/infrastructure/healthchecks.py \
        backend/infrastructure/settings.py \
        backend/tests/infrastructure/test_healthchecks.py
git commit -m "feat(backend): adiciona ping do healthchecks para a ingestao"
```

---

### Task 7: Worker com dois jobs e remoção do job de tempo real

**Files:**
- Modify: `backend/worker/main.py`
- Delete: `backend/application/use_cases/ingest_realtime_purpleair.py`
- Delete: `backend/tests/application/test_ingest_realtime_purpleair.py`
- Modify: `backend/infrastructure/settings.py`
- Modify: `infra/docker-compose.yml`
- Modify: `infra/docker-compose.prod.yml`

**Interfaces:**
- Consumes: `IngestArchivePurpleAir(...).execute() -> ArchiveRunResult` (Task 2); `RefreshSensorStatus(...).execute() -> int` (Task 4); `PostgresSensorStatusRepository` (Task 3); `healthchecks.ping(base_url, success)` (Task 6).
- Produces: `worker/main.py` com `run_archive() -> ArchiveRunResult`, `run_status() -> int` e `main()` agendando ambos.

**Por que remover em vez de desativar:** depois desta reforma nada chama `IngestRealtimePurpleAir`. Mantê-lo seria código morto que sugere uma alternativa que não deve ser usada — quem ler o repositório depois pode religá-lo sem saber que ele perde 6 de cada 7 leituras.

**Agendamento:** laço único com tique de 30 s conferindo dois prazos independentes. Não usa APScheduler porque a necessidade é de dois intervalos fixos, sem dependências entre jobs — a decisão de não adotar orquestrador está registrada na spec.

- [ ] **Step 1: Remover o job de tempo real**

```bash
cd /home/willianflores/localhost/airquality-js-app
git rm backend/application/use_cases/ingest_realtime_purpleair.py \
       backend/tests/application/test_ingest_realtime_purpleair.py
```

- [ ] **Step 2: Confirmar que nada mais referencia o caso de uso removido**

Run:
```bash
cd backend && grep -rn "ingest_realtime_purpleair\|IngestRealtimePurpleAir" --include=*.py . | grep -v ".venv"
```
Expected: nenhuma saída. Se algo aparecer (fora de `worker/main.py`, que é reescrito no Step 3), essa referência precisa ser tratada antes de prosseguir.

- [ ] **Step 3: Reescrever o worker**

Substituir o conteúdo de `backend/worker/main.py` por:

```python
import time

from adapters.outbound.postgres.postgres_ingestion_run_repository import (
    PostgresIngestionRunRepository,
)
from adapters.outbound.postgres.postgres_sensor_reading_repository import (
    PostgresSensorReadingRepository,
)
from adapters.outbound.postgres.postgres_sensor_repository import PostgresSensorRepository
from adapters.outbound.postgres.postgres_sensor_status_repository import (
    PostgresSensorStatusRepository,
)
from adapters.outbound.purpleair.purpleair_api_client import PurpleAirApiClient
from application.use_cases.ingest_archive_purpleair import ArchiveRunResult, IngestArchivePurpleAir
from application.use_cases.refresh_sensor_status import RefreshSensorStatus
from infrastructure import healthchecks
from infrastructure.database import SessionLocal
from infrastructure.settings import settings

# Tique curto para conferir dois prazos independentes sem precisar de um
# agendador externo — são dois intervalos fixos, sem dependência entre eles.
TICK_SECONDS = 30

def run_archive() -> ArchiveRunResult:
    session = SessionLocal()
    try:
        use_case = IngestArchivePurpleAir(
            sensor_repository=PostgresSensorRepository(session),
            purpleair_client=PurpleAirApiClient(settings.purpleair_api_key),
            sensor_reading_repository=PostgresSensorReadingRepository(session),
            ingestion_run_repository=PostgresIngestionRunRepository(session),
            default_lookback_days=settings.archive_default_lookback_days,
            max_window_days=settings.archive_max_window_days,
        )
        return use_case.execute()
    finally:
        session.close()

def run_status() -> int:
    session = SessionLocal()
    try:
        use_case = RefreshSensorStatus(
            sensor_repository=PostgresSensorRepository(session),
            purpleair_client=PurpleAirApiClient(settings.purpleair_api_key),
            sensor_status_repository=PostgresSensorStatusRepository(session),
        )
        return use_case.execute()
    finally:
        session.close()

def main() -> None:
    archive_due_at = 0.0
    status_due_at = 0.0

    while True:
        now = time.monotonic()

        if now >= archive_due_at:
            try:
                result = run_archive()
                # Falha parcial também alerta: sensor que ficou para trás não
                # aparece em lugar nenhum se o ping for sempre de sucesso.
                healthchecks.ping(
                    settings.healthchecks_ping_url,
                    success=not result.failed_sensor_indices,
                )
                if result.failed_sensor_indices:
                    print(f"Archive cycle partial: failed sensors {result.failed_sensor_indices}")
            except Exception as exc:
                print(f"Archive cycle failed: {exc}")
                healthchecks.ping(settings.healthchecks_ping_url, success=False)
            archive_due_at = time.monotonic() + settings.archive_interval_seconds

        if now >= status_due_at:
            try:
                run_status()
            except Exception as exc:
                print(f"Status cycle failed: {exc}")
            status_due_at = time.monotonic() + settings.status_interval_seconds

        time.sleep(TICK_SECONDS)

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Ajustar as configurações**

Em `backend/infrastructure/settings.py`, remover `ingest_interval_seconds` (nada mais o usa) e garantir que `status_interval_seconds` existe. A classe deve conter, além do que já havia:

```python
    archive_interval_seconds: int = 3600
    status_interval_seconds: int = 1800
    archive_default_lookback_days: int = 7
    archive_max_window_days: int = 30
    healthchecks_ping_url: str = ""
```

- [ ] **Step 5: Atualizar as variáveis de ambiente do worker nos dois compose**

Em `infra/docker-compose.yml`, no serviço `worker`, substituir a linha `INGEST_INTERVAL_SECONDS: "900"` por:

```yaml
      ARCHIVE_INTERVAL_SECONDS: "3600"
      STATUS_INTERVAL_SECONDS: "1800"
```

Em `infra/docker-compose.prod.yml`, no serviço `worker`, fazer a mesma substituição e acrescentar o ping (vazio por padrão, preenchido no `.env.prod` do servidor):

```yaml
      ARCHIVE_INTERVAL_SECONDS: "3600"
      STATUS_INTERVAL_SECONDS: "1800"
      HEALTHCHECKS_PING_URL: ${HEALTHCHECKS_PING_URL:-}
```

E em `infra/.env.prod.example`, adicionar a linha:

```env
HEALTHCHECKS_PING_URL=
```

- [ ] **Step 6: Validar a sintaxe dos dois compose**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app
docker compose -f infra/docker-compose.yml config > /dev/null && echo "dev OK"
cp infra/.env.prod.example /tmp/env-prod-check
sed -i 's/troque-por-uma-senha-forte-antes-do-deploy/senha-de-teste/' /tmp/env-prod-check
docker compose -f infra/docker-compose.prod.yml --env-file /tmp/env-prod-check config > /dev/null && echo "prod OK"
rm /tmp/env-prod-check
```
Expected: `dev OK` e `prod OK`.

- [ ] **Step 7: Rodar a suíte inteira do backend**

Run: `cd backend && .venv/bin/python -m pytest`
Expected: PASS. A contagem cai 2 em relação à task anterior (os testes de `ingest_realtime_purpleair` foram removidos).

- [ ] **Step 8: Commit**

```bash
git add -A backend/worker/main.py \
           backend/application/use_cases/ingest_realtime_purpleair.py \
           backend/tests/application/test_ingest_realtime_purpleair.py \
           backend/infrastructure/settings.py \
           infra/docker-compose.yml \
           infra/docker-compose.prod.yml \
           infra/.env.prod.example
git commit -m "feat(backend): worker agenda arquivo e status, remove job de tempo real"
```

---

### Task 8: Remover `channel_flags`/`channel_state` de `sensor_readings`

**Files:**
- Create: `backend/alembic/versions/0011_drop_channel_status_from_readings.py`
- Modify: `backend/adapters/outbound/postgres/postgres_sensor_reading_repository.py`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: nenhuma assinatura nova. `READING_COLUMNS` perde dois nomes.

**Por que agora e não antes:** só depois da Task 5 nenhum caminho de leitura depende dessas colunas em `sensor_readings`. Executar esta task antes quebraria `/readings/latest-by-sensor`.

**Por que é seguro:** verificado no banco de produção — das 32.457.773 linhas, **zero** têm `channel_flags` ou `channel_state` preenchidos. A migration 0009 foi aplicada depois de a ingestão ser suspensa, então as colunas nasceram vazias e nunca foram populadas. Depois desta reforma nada as preencheria: `/history` não fornece esses campos e o job de status escreve em `sensor_status`. Para um arquivo destinado a publicação, coluna sempre nula é pior que coluna ausente — sugere um dado que não existe.

- [ ] **Step 1: Confirmar que as colunas continuam vazias antes de dropar**

Run:
```bash
docker exec airquality_js_postgres psql -U airquality_user -d airquality -c "
SET max_parallel_workers_per_gather = 0;
SELECT count(*) FILTER (WHERE channel_flags IS NOT NULL) AS com_flags,
       count(*) FILTER (WHERE channel_state IS NOT NULL) AS com_state
FROM sensor_readings;
"
```
Expected: `com_flags` e `com_state` iguais a `0`. **Se qualquer um for diferente de zero, parar e reportar** — significa que a ingestão rodou desde a verificação e há dado real a preservar.

- [ ] **Step 2: Escrever a migration**

Criar `backend/alembic/versions/0011_drop_channel_status_from_readings.py`:

```python
"""drop channel_flags/channel_state from sensor_readings

Revision ID: 0011
Revises: 0010
Create Date: 2026-08-03

Essas colunas foram criadas na 0009 mas nunca receberam valor: a ingestão
estava suspensa, e depois da reforma nada as preencheria — o endpoint
/history não fornece esses campos, e o job de status grava em sensor_status.
Verificado antes de remover: 0 de 32.457.773 linhas tinham valor.
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.drop_column("sensor_readings", "channel_state")
    op.drop_column("sensor_readings", "channel_flags")

def downgrade() -> None:
    op.add_column("sensor_readings", sa.Column("channel_flags", sa.Integer, nullable=True))
    op.add_column("sensor_readings", sa.Column("channel_state", sa.Integer, nullable=True))
```

- [ ] **Step 3: Remover as colunas da lista de inserção**

Em `backend/adapters/outbound/postgres/postgres_sensor_reading_repository.py`, remover a última entrada de `READING_COLUMNS`:

```python
    "pm10_0_cf_1", "pm10_0_cf_1_a", "pm10_0_cf_1_b",
```

Ou seja: a linha `"channel_flags", "channel_state",` sai da lista, e `"pm10_0_cf_1", "pm10_0_cf_1_a", "pm10_0_cf_1_b",` passa a ser a última.

- [ ] **Step 4: Aplicar a migration nos dois bancos**

Run:
```bash
cd backend
.venv/bin/alembic upgrade head
DATABASE_URL="$(.venv/bin/python -c "
from infrastructure.settings import settings
print(settings.database_url.rsplit('/', 1)[0] + '/airquality_test')
")" .venv/bin/alembic upgrade head
```
Expected: `Running upgrade 0010 -> 0011` nas duas execuções.

- [ ] **Step 5: Rodar a suíte inteira do backend**

Run: `cd backend && .venv/bin/python -m pytest`
Expected: PASS. Se algum teste inseria `channel_flags` diretamente em `sensor_readings`, ele agora falha e precisa ser atualizado — o campo passou a viver em `sensor_status`.

- [ ] **Step 6: Commit**

```bash
git add backend/alembic/versions/0011_drop_channel_status_from_readings.py \
        backend/adapters/outbound/postgres/postgres_sensor_reading_repository.py \
        backend/tests
git commit -m "refactor(backend): remove channel_flags/channel_state de sensor_readings"
```

---

### Task 9: Frontend — separar "sensor vivo" de "temos valor"

**Files:**
- Modify: `frontend/src/domain/reading.ts`
- Modify: `frontend/src/ui/pages/SensoresPage.tsx`
- Test: `frontend/src/domain/reading.test.ts`

**Interfaces:**
- Consumes: resposta de `/readings/latest-by-sensor` (Task 5), com o mesmo formato de antes.
- Produces: `isSensorOnline(reading: SensorLatestReading | undefined, now?: Date) => boolean` (sem exigir `pm2_5_corrected`) e `hasRecentValue(reading: SensorLatestReading | undefined, now?: Date) => boolean` (novo).

**O defeito que isto corrige:** hoje `isSensorOnline` exige `pm2_5_corrected != null`, misturando duas perguntas. Com as fontes separadas, um sensor que volta a reportar depois de dias apareceria **offline por até uma hora** — `last_seen` provaria que está vivo, mas o valor ainda não teria sido buscado pelo job de arquivo. Separar as perguntas elimina isso.

**`ONLINE_WINDOW_MS` continua 60 min:** a recência passa a ser medida pelo `last_seen`, atualizado a cada 30 min pelo job de status. Defasagem máxima de 30 min contra janela de 60 min é margem de 2×.

- [ ] **Step 1: Escrever os testes que falham**

Em `frontend/src/domain/reading.test.ts`, adicionar `hasRecentValue` ao import existente:

```ts
import { hasRecentValue, isBucketRecent, isSensorOnline } from './reading'
```

E acrescentar ao fim do arquivo:

```ts
describe('isSensorOnline sem depender do valor', () => {
  it('is online when last_seen is recent even without a measured value', () => {
    expect(isSensorOnline(reading({ pm2_5_corrected: null }), NOW)).toBe(true)
  })

  it('is offline when the reading is older than the online window', () => {
    expect(isSensorOnline(reading({ time_stamp: '2026-01-01T10:30:00Z' }), NOW)).toBe(false)
  })

  it('is offline when channel_flags signals a degraded channel', () => {
    expect(isSensorOnline(reading({ channel_flags: 2 }), NOW)).toBe(false)
  })
})

describe('hasRecentValue', () => {
  it('is true for a recent reading with a measured value', () => {
    expect(hasRecentValue(reading(), NOW)).toBe(true)
  })

  it('is false when there is no measured value', () => {
    expect(hasRecentValue(reading({ pm2_5_corrected: null }), NOW)).toBe(false)
  })

  it('is false when the value is older than the online window', () => {
    expect(hasRecentValue(reading({ time_stamp: '2026-01-01T10:30:00Z' }), NOW)).toBe(false)
  })

  it('is false when there is no reading at all', () => {
    expect(hasRecentValue(undefined, NOW)).toBe(false)
  })
})
```

O teste existente `'is offline when pm2_5_corrected is null'` passa a contradizer o comportamento novo — **removê-lo**, já que `isSensorOnline` deixou de depender do valor.

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd frontend && npx vitest run src/domain/reading.test.ts`
Expected: FAIL — `hasRecentValue` não existe, e o caso "online sem valor medido" retorna `false`.

- [ ] **Step 3: Reescrever as funções**

Em `frontend/src/domain/reading.ts`, substituir o bloco de `ONLINE_WINDOW_MS` e `isSensorOnline` por:

```ts
// Janela de recência do status. O job de status atualiza last_seen a cada
// 30min, então 60min dá margem de 2x antes de considerar o sensor offline.
export const ONLINE_WINDOW_MS = 60 * 60 * 1000

// "Vivo" é pergunta sobre o SENSOR, não sobre o dado: last_seen recente e
// channel_flags == 0 (0 = normal; PurpleAir sinaliza canal A/B degradado com
// 1/2/3). Não exige valor medido — um sensor que acabou de voltar a reportar
// está vivo mesmo antes de o job de arquivo buscar a leitura dele.
// channel_flags null não desqualifica; só um flag explícito != 0.
export function isSensorOnline(reading: SensorLatestReading | undefined, now: Date = new Date()): boolean {
  if (!reading) return false
  if (reading.channel_flags != null && reading.channel_flags !== 0) return false
  const ageMs = now.getTime() - new Date(reading.time_stamp).getTime()
  return ageMs >= 0 && ageMs < ONLINE_WINDOW_MS
}

// "Temos valor recente pra exibir?" é pergunta sobre o DADO, separada da
// anterior de propósito: sensor vivo sem valor e sensor morto com valor velho
// são situações diferentes e a interface precisa distinguir.
export function hasRecentValue(reading: SensorLatestReading | undefined, now: Date = new Date()): boolean {
  if (!reading || reading.pm2_5_corrected == null) return false
  const ageMs = now.getTime() - new Date(reading.time_stamp).getTime()
  return ageMs >= 0 && ageMs < ONLINE_WINDOW_MS
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd frontend && npx vitest run src/domain/reading.test.ts`
Expected: PASS.

- [ ] **Step 5: Usar `hasRecentValue` na coluna de PM2,5 da tabela de sensores**

Em `frontend/src/ui/pages/SensoresPage.tsx`, na construção de `rows`, trocar a linha do `pm25` para respeitar a recência do valor:

```tsx
        pm25: hasRecentValue(reading) ? (reading?.pm2_5_corrected ?? null) : null,
```

E incluir a função no import existente:

```tsx
import { hasRecentValue, isSensorOnline } from '../../domain/reading'
```

`MunicipioPage.tsx` não muda: o card "Sensores ativos" conta sensores vivos, que é exatamente o que `isSensorOnline` passou a responder.

- [ ] **Step 6: Rodar a suíte do frontend e o type-check**

Run: `cd frontend && npx vitest run && npx tsc --noEmit`
Expected: PASS em ambos, sem saída do `tsc`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/domain/reading.ts \
        frontend/src/domain/reading.test.ts \
        frontend/src/ui/pages/SensoresPage.tsx
git commit -m "feat(frontend): separa sensor vivo de valor recente"
```

---

## Self-Review

**Cobertura da spec** — cada decisão da spec tem task correspondente:

| Decisão da spec | Task |
|---|---|
| Job de arquivo horário, `/history`, `average=0`, todos os campos | 2 |
| Janela = watermark por sensor | 1 (consulta) + 2 (lógica) |
| `ARCHIVE_DEFAULT_LOOKBACK_DAYS = 7` | 2 |
| `ARCHIVE_MAX_WINDOW_DAYS = 30` | 2 |
| Isolamento de falha por sensor | 2 |
| Tabela `sensor_status` + coluna gerada LRAPA | 3 |
| Chamada bulk com campos reduzidos | 4 |
| `/readings/latest-by-sensor` muda de fonte | 5 |
| Alerta via healthchecks.io, `/fail` em falha parcial | 6 (módulo) + 7 (uso) |
| Aposentar `ingest_realtime_purpleair` | 7 |
| Worker com duas cadências | 7 |
| Dropar `channel_flags`/`channel_state` de `sensor_readings` | 8 |
| `isSensorOnline` dividido em duas perguntas | 9 |
| Não tocar em `pm2_5_corrected` de `sensor_readings` nem nos agregados | Global Constraints |
| `BackfillHistoricalPurpleAir` preservado | Global Constraints |

**Placeholders:** nenhum "TBD" ou "implementar depois". Todo passo de código traz o código completo; todo passo de comando traz o comando exato e a saída esperada.

**Consistência de tipos e nomes:** `latest_timestamps() -> dict[int, datetime]` (Task 1) é o que a Task 2 consome; `ArchiveRunResult(inserted, failed_sensor_indices)` (Task 2) é o que a Task 7 consome; `upsert_many`/`list_all` (Task 3) são os nomes usados nas Tasks 4 e 5; `fetch_status` (Task 4) é o nome usado na Task 7; `ping(base_url, success)` (Task 6) é a assinatura chamada na Task 7; `hasRecentValue` (Task 9) tem o mesmo nome no teste, na implementação e no consumidor.

**Desvio da spec registrado:** a chamada de status usa 7 campos (`latitude` e `longitude` a mais que os 5 listados na spec), porque `/readings/latest-by-sensor` devolve a posição do sensor e o mapa depende dela. Está nas Global Constraints e na Task 4.

**Ordem obrigatória:** Task 5 antes da Task 8 — dropar as colunas antes de trocar a fonte da consulta quebraria `/readings/latest-by-sensor`. Task 3 antes das Tasks 4 e 5. Task 1 antes da Task 2.
