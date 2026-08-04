# Reforma da Ingestão e Arquivo Bruto

## Contexto

Trabalho fora do roadmap original da migração (`2026-07-17-migracao-react-python-hexagonal-design.md`),
como `refino-visual` e `admin-publicacoes` — a Fase 7 daquele roadmap já é o "Corte" (desativar o
Next.js e apontar DNS), então esta spec recebe nome descritivo, não número de fase.

A ingestão do `airquality-js-app` tem três problemas, dois deles de projeto e não de falha:

**1. Perda por design.** O worker de tempo real chama `fetch_realtime` (`/v1/sensors`), que devolve
um *snapshot* — a última leitura de cada sensor naquele instante — e roda a cada 15 minutos. Medido
no banco: os sensores entregam **567 linhas/sensor/dia**, uma leitura a cada ~2,5 minutos. Com poll
de 15 minutos, aproximadamente 6 de cada 7 leituras nunca chegam ao banco. Não é bug: é a semântica
do endpoint.

**2. Sem auto-recuperação.** Se o worker cai, o buraco só é recuperável por backfill manual. Nada no
sistema fecha a lacuna sozinho.

**3. Sem alerta.** `ingestion_runs` registra cada execução e seu status, mas ninguém é notificado —
a falha fica silenciosa até alguém abrir o painel.

O objetivo declarado pelo usuário torna o problema 1 inaceitável: a base é para virar um **arquivo
bruto completo, disponibilizado à sociedade no futuro**. Isso elimina qualquer solução que reduza
campos ou substitua leituras por médias móveis da PurpleAir.

**Estado atual:** a ingestão está suspensa desde o incidente de perda de dados (banco tem dados até
2025-12-05 04:59:58 UTC; 32,4 M linhas; 13 sensores ativos nos 30 dias anteriores ao corte). A Fase 6
(deploy) tem código pronto e enviado ao GitHub, mas o Runbook manual no servidor ainda não foi
executado. Decisão do usuário: **esta reforma entra antes do deploy**, para que o Runbook já suba a
stack com a ingestão definitiva e instale o cron de uma vez.

**Orçamento de pontos:** não é restrição. Existe acordo com a PurpleAir para concessão de pontos
adicionais conforme necessário, e o saldo atual (~200 M) cobre o horizonte previsto. Referência
empírica do próprio usuário: um backfill anterior consumiu pouco mais de 80 M pontos, bem abaixo do
que o modelo teórico projetaria — ao solicitar pontos novos, usar o consumo medido, não estimativa.

## Decisões

- **Um job de arquivo, não dois jobs.** O worker de 15 minutos é aposentado: o caso de uso
  `application/use_cases/ingest_realtime_purpleair.py` e seus testes são **removidos**, não apenas
  desativados — nada mais o chama depois desta reforma, e mantê-lo seria código morto que sugere
  uma alternativa que não deve ser usada. Em seu lugar, um job horário que busca pelo endpoint
  `/history`, com `average=0` e todos os campos de `FIELDS`. Como o `/history` devolve a janela
  inteira, ele captura tudo que o snapshot perdia.
- **Janela = watermark do sensor até agora**, não "última hora fechada". Essa é a diferença que
  torna o job auto-curável: após uma queda de 6 horas, a execução seguinte calcula uma janela de
  6 horas e fecha o buraco sozinha. Em operação normal os dois formatos são idênticos (o watermark
  fica sempre ~1 hora atrás); a diferença só aparece depois de uma falha, que é quando importa.
- **Watermark por sensor, não global.** `MAX(time_stamp) WHERE sensor_index = X`. Além de ser o
  correto para o job, evita desperdiçar pontos pedindo dezembro/2025 para um sensor que já tem dado
  de julho/2026.
- **Escritor único em `sensor_readings`.** É o que mantém `MAX(time_stamp)` válido como watermark.
  Se dois jobs escrevessem na mesma tabela em granularidades diferentes, o job de 15 minutos
  avançaria o marcador sem preencher o intervalo, e o arquivo ganharia buracos permanentes e
  silenciosos — a tabela teria uma linha a cada 15 minutos e pareceria saudável.
- **Tabela nova `sensor_status`, alimentada por job separado a cada 30 minutos.** Existe porque
  `channel_flags` e `channel_state` só são oferecidos pelo endpoint realtime; o `/history` não os
  tem (ver comentário em `purpleair_api_client.py:39-43`). Chamada bulk `/v1/sensors` pedindo
  `last_seen`, `channel_flags`, `channel_state`, `pm2.5_atm_a`, `pm2.5_atm_b`, `latitude`,
  `longitude` — sete campos. `latitude`/`longitude` entraram ao escrever o plano: como
  `/readings/latest-by-sensor` passa a ler desta tabela e devolve a posição do sensor, o mapa do
  frontend depende dela. Custo adicional desprezível (2 pontos por linha). Uma linha por sensor,
  sobrescrita a cada ciclo — tabela comum, não hypertable.
- **`/readings/latest-by-sensor` passa a ler de `sensor_status`.** Motivo: com o valor vindo de
  `sensor_readings` (horário) e o status vindo de `sensor_status` (30 min), a interface juntaria
  dois relógios diferentes. Lendo tudo da mesma tabela, tudo vem do mesmo instante.
- **`isSensorOnline` dividido em duas perguntas.** Hoje a função responde "sensor vivo?" e "temos
  valor?" de uma vez, porque só havia uma fonte. Isso produz um defeito concreto: um sensor que
  volta depois de dias aparece **offline por até uma hora**, porque `pm2_5_corrected` ainda não foi
  buscado pelo job de arquivo, mesmo com `last_seen` provando que está vivo. Passam a ser: "vivo?"
  (`last_seen` recente + `channel_flags == 0`) e "temos valor recente para exibir?".
- **`pm2_5_corrected` é mantida.** A proposta de aposentá-la foi levantada e **cancelada** pelo
  usuário. Consequência: nenhum rebuild dos três continuous aggregates
  (`municipio_hourly_pm25`, `municipio_daily_pm25`, `who_exceedance_days`, todos com
  `avg(pm2_5_corrected)`) sobre 32,4 M linhas. Essa era a parte de maior risco do escopo original e
  está fora.
- **`sensor_status` ganha sua própria coluna gerada com a expressão LRAPA**, duplicando a fórmula
  que existe em `0002_create_sensor_readings_hypertable.py:83-92`. A alternativa (extrair para uma
  função `IMMUTABLE` compartilhada) exigiria alterar a coluna gerada de `sensor_readings` — o
  rebuild de 32,4 M linhas que a decisão anterior justamente evita. Duplicação aceita, com
  comentário na migration nova apontando a 0002 como origem.

  **Por que existem duas colunas `pm2_5_corrected`** (ponto que gerou confusão na revisão da spec,
  registrado aqui para quem for implementar): a tabela `sensor_status` guarda os canais crus
  (`pm2.5_atm_a`, `pm2.5_atm_b`) que a chamada bulk devolve, mas a interface exibe o valor
  corrigido. Como `/readings/latest-by-sensor` passa a ler dessa tabela, ela precisa saber produzir
  esse valor — senão a fórmula LRAPA iria parar num terceiro lugar (SQL do endpoint ou frontend).

  Não são medidas diferentes: mesmo sensor, mesmo dado físico, mesma fórmula. O que difere é
  **qual leitura** cada tabela guarda — `sensor_readings` guarda todas as leituras da janela,
  `sensor_status` guarda apenas a mais recente. Referindo-se ao mesmo `time_stamp`, as duas
  produzem valor idêntico. Divergem no dia a dia só porque apontam para instantes diferentes
  (status até 30 min atrás, arquivo até 1 h atrás).

  | | `sensor_readings.pm2_5_corrected` | `sensor_status.pm2_5_corrected` |
  |---|---|---|
  | Alimentada por | job de arquivo (1 h) | job de status (30 min) |
  | Consumida por | continuous aggregates → gráficos, card do município | `/readings/latest-by-sensor` → tabela de sensores, pinos |
  | Volume | série completa, 32,4 M linhas | 1 linha por sensor, sobrescrita |

- **Isolamento de falha por sensor.** Hoje `BackfillHistoricalPurpleAir` aborta o lote inteiro se um
  sensor falha. No job de arquivo, um sensor que falha simplesmente não avança seu watermark e é
  retentado na hora seguinte com janela mais larga; os demais seguem. A execução é registrada como
  parcial, não perdida.
- **Piso de lookback para sensor sem histórico.** Sensor recém-cadastrado tem `MAX(time_stamp)`
  nulo. Sem piso, cadastrar um sensor dispararia anos de histórico e um gasto grande de pontos sem
  ninguém pedir. Padrão: `ARCHIVE_DEFAULT_LOOKBACK_DAYS = 7`. Histórico profundo continua sendo
  ação deliberada pelo painel admin, que já existe.
- **Teto de janela automática: `ARCHIVE_MAX_WINDOW_DAYS = 30`.** Se o watermark estiver mais atrás
  que o teto, a execução busca apenas até o teto e o watermark avança progressivamente — um buraco
  de 90 dias fecha em 3 execuções (3 horas), ainda sem intervenção. Protege o cenário "worker ficou
  meses fora e voltou sozinho", em que a primeira execução dispararia o gasto inteiro de pontos sem
  ninguém observando.

  Não economiza pontos: as mesmas linhas são buscadas de um jeito ou de outro. O que muda é o
  ritmo — com o teto, o alerta do healthchecks dispara e dá tempo de intervir depois do primeiro
  pedaço, em vez de descobrir o gasto já consumado. Em operação normal o teto nunca é atingido
  (watermark fica ~1 h atrás).

  **Não confundir com `HISTORY_WINDOW_DAYS = 30`**, que já existe no client
  (`purpleair_api_client.py:177-182`): aquele fatia um intervalo grande em várias chamadas HTTP, e
  por isso um buraco de 90 dias tecnicamente já funciona sem o teto. O teto é decisão de job, não
  requisito de API. Escolher 30 nos dois alinha as fronteiras: cada execução vira exatamente uma
  chamada por sensor.
- **Alerta via healthchecks.io.** O worker faz um ping HTTP ao fim de cada ciclo; se parar de pingar
  dentro do prazo configurado, o serviço notifica por e-mail. Escolhido em vez de SMTP próprio
  porque detecta container morto e servidor desligado — casos que um alerta gerado pelo próprio
  processo não pega, já que processo morto não manda e-mail. Ping de sucesso só quando todos os
  sensores passaram; ping em `/fail` se algum falhou, para que falha parcial também alerte.
- **Sem Airflow ou qualquer orquestrador.** Avaliado e descartado: não resolve o problema 1 (que é
  semântica de endpoint, não de agendamento), e o servidor tem 7,8 Gi de RAM já divididos com a
  stack do `nokekoi-js-app`. O watermark entrega o catchup que o Airflow venderia, sem a
  infraestrutura.

## Arquitetura

```text
ESCRITA

  Job de arquivo (horário)                    Job de status (30 min)
  GET /sensors/:id/history                    GET /sensors (bulk)
  average=0, todos os campos de FIELDS        last_seen, channel_flags, channel_state,
  janela = watermark(sensor) → agora          pm2.5_atm_a, pm2.5_atm_b
          │                                            │
          ▼                                            ▼
  sensor_readings (hypertable)                 sensor_status (tabela comum)
  append, ON CONFLICT DO NOTHING               upsert, 1 linha por sensor
  ESCRITOR ÚNICO                               + coluna gerada pm2_5_corrected

LEITURA

  /readings/current    ─┐
  /readings/history     ├─→ continuous aggregates sobre sensor_readings   [INALTERADO]
  /metrics/*           ─┘
  /readings/count-today ──→ sensor_readings                               [INALTERADO]
  /readings/latest-by-sensor ──→ sensor_status                            [MUDA DE FONTE]

OBSERVABILIDADE

  fim de cada ciclo → ping healthchecks.io (sucesso ou /fail)
```

## Componentes

**Backend**

- `application/use_cases/ingest_archive_purpleair.py` (novo) — job de arquivo. Calcula a janela por
  sensor a partir do watermark, aplica o piso quando não há histórico, isola falhas por sensor,
  registra em `ingestion_runs`.
- `application/use_cases/refresh_sensor_status.py` (novo) — job de status. Chamada bulk, upsert em
  `sensor_status`.
- `application/ports/sensor_status_repository.py` + adapter Postgres e in-memory (novos).
- `application/ports/sensor_reading_repository.py` — ganha `latest_timestamp_by_sensor()` para o
  watermark.
- `adapters/outbound/purpleair/purpleair_api_client.py` — ganha um método para a chamada de status
  com campos reduzidos (o `fetch_realtime` atual pede todos os campos; o job de status pede cinco).
- `infrastructure/settings.py` — `archive_interval_seconds`, `status_interval_seconds`,
  `archive_default_lookback_days`, `healthchecks_ping_url`.
- `worker/main.py` — passa a agendar os dois jobs em cadências diferentes, no lugar do laço único
  atual.
- Alembic: migration criando `sensor_status`.

**Preservado sem alteração**

- `BackfillHistoricalPurpleAir` e `worker/backfill_cli.py` continuam existindo para backfill manual
  de intervalo explícito — o painel admin depende deles
  (`admin_sensors_router.py:136`), e o Runbook da Fase 6 usa o CLI para a recuperação do gap.
- Os três continuous aggregates e a coluna `pm2_5_corrected` de `sensor_readings`.

**Frontend**

- `src/domain/reading.ts` — `isSensorOnline` deixa de exigir `pm2_5_corrected`; entra uma função
  separada para "temos valor recente para exibir?".
- Consumidores de `isSensorOnline`: `SensoresPage.tsx:38` (coluna Status) e `MunicipioPage.tsx:140`
  (card "Sensores ativos").

**Ponta solta assumida**

`sensor_readings.channel_flags` e `channel_state` (migration 0009) passam a ficar sempre nulos em
linhas novas — o `/history` não fornece esses campos e o job de status escreve em outra tabela.
Ficam na tabela como nulos; remover exigiria migration sobre a hypertable sem ganho prático.

## Cadências e custo

| Job | Cadência | Endpoint | Requests/ciclo | Observação |
|---|---|---|---|---|
| Arquivo | 1 h | `/sensors/:id/history` | 1 por sensor | 13 sensores × 1 s de espaçamento = ~13 s por ciclo |
| Status | 30 min | `/sensors` (bulk) | 1 | Todos os sensores em uma chamada |

Fórmula oficial da PurpleAir: `total_cost = endpoint_base_cost + (custo_dos_campos × linhas)`.
Custos-base: `Get Sensors Data` = 5, `Get Sensor Data` = 1, `Get Sensor History` = 2. Campo comum
custa 1 ponto; campo que é média dos dois canais custa 2.

A cadência do job de arquivo é praticamente livre em pontos: o total de linhas por dia é o mesmo
rodando de hora em hora ou a cada 15 minutos — muda apenas o tamanho de cada lote e o número de
requests. A escolha de 1 hora é do usuário.

**Ajuste que a cadência horária exige:** `ONLINE_WINDOW_MS` (hoje 60 min em
`frontend/src/domain/reading.ts`) fica adequado porque a recência passa a ser medida pelo `last_seen`
da tabela de status, atualizado a cada 30 minutos — defasagem máxima de 30 min contra janela de
60 min, margem de 2×. Se a recência fosse medida por `sensor_readings.time_stamp` (horário), a janela
precisaria subir para ~90 min.

## Tratamento de erro

- **Falha em um sensor** — registra, segue para os próximos. O watermark daquele sensor não avança,
  então a janela da hora seguinte cobre o período perdido automaticamente.
- **HTTP 429 e 5xx** — já cobertos pelo throttle (1 s entre requests) e retry exponencial do
  `PurpleAirApiClient`.
- **Execução parcial** — registrada em `ingestion_runs` com contagem real de linhas inseridas
  (a contagem foi corrigida em commit anterior: `bulk_insert` agora soma `rowcount` por linha em vez
  de retornar `len(readings)`).
- **Ciclo com qualquer falha** — ping em `/fail` do healthchecks, não no endpoint de sucesso.

## Testes

- **Caso de uso do arquivo** (fakes): cálculo de janela por sensor a partir do watermark; piso de
  lookback quando não há histórico; isolamento — um sensor que levanta exceção não impede os demais
  nem avança o próprio watermark.
- **Repositório de watermark** contra Postgres real, no padrão já usado em `tests/adapters/`.
- **`sensor_status`**: upsert idempotente (dois ciclos seguidos deixam uma linha por sensor); coluna
  gerada produzindo o mesmo valor que a de `sensor_readings` para as mesmas entradas.
- **Caso de uso do status** (fakes): mapeamento dos campos da resposta bulk para a tabela.
- **Frontend**: `isSensorOnline` continua verdadeiro para sensor vivo sem valor recente (o defeito
  que motivou a separação); função nova de "valor recente" isolada.
- **Ping do healthchecks**: sucesso apenas quando todos os sensores passaram; `/fail` quando algum
  falhou.

## Integração com o Runbook da Fase 6

Como esta reforma entra **antes** do deploy, o Runbook de
`2026-08-02-fase-6-hardening-deploy.md` precisa de dois ajustes na hora de executar:

- **Passo 10 (backfill do gap)** continua usando `worker/backfill_cli.py`, que não muda. A mudança
  de assinatura para janela por sensor beneficia justamente esse passo — hoje ele exige uma chamada
  separada por sensor com datas diferentes; depois da reforma, o cálculo por watermark pode fazê-lo
  numa execução só.
- **Passo 17** ainda descreve "iniciar o worker de ingestão em tempo real". Depois desta reforma o
  worker passa a rodar o job de arquivo (horário) e o de status (30 min) — não existe mais ingestão
  de tempo real. O texto do passo precisa ser atualizado; o comando
  (`docker compose ... up -d worker`) segue igual, assim como o gate de autorização explícita.

## Fora de escopo

- Aposentar `pm2_5_corrected` e recriar os continuous aggregates — proposto e cancelado.
- Airflow, Dagster, Prefect ou qualquer orquestrador.
- Correção retroativa de município dos sensores 31101 e 31109.
- Cor dos pinos do mapa por status de sensor — adiado anteriormente pelo usuário, segue adiado.
- Publicação do dataset à sociedade (portal, licença, formato de exportação) — é o objetivo que
  justifica o arquivo bruto, mas não faz parte desta entrega.
