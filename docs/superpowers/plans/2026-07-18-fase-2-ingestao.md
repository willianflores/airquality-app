# Fase 2 — Ingestão Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingestão contínua de dados PurpleAir (real-time, a cada 10-15min) + backfill histórico reutilizável (fecha o gap Dez/2025→hoje agora, e serve pra trazer histórico de sensor novo no futuro).

**Architecture:** Hexagonal — `PurpleAirClient` (port+adapter) fala com a API externa; `SensorReadingRepository` e `IngestionRunRepository` (port+adapter) gravam no Postgres; dois use cases (`IngestRealtimePurpleAir`, `BackfillHistoricalPurpleAir`) orquestram; worker (processo separado, mesmo código do backend) agenda o real-time e expõe o backfill como comando manual.

**Tech Stack:** Python/FastAPI/SQLAlchemy (já em uso), `httpx` (já em `requirements.txt`, reusado como cliente HTTP), stdlib `csv`/`argparse` — sem dependências novas.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-18-fase-2-ingestao-design.md`
- `time_stamp` em `sensor_readings` **nunca** sofre conversão de timezone — grava exatamente como a API PurpleAir retorna (UTC). Decisão da Fase 1b já fixou isso; o script antigo (`getPurpleairApiHistoricalData.py`) convertia pra `-05:00` — **não replicar**.
- `mun_name` em cada leitura vem do `municipio` do sensor lido do banco (`sensors.municipio`), nunca de dicionário hardcoded (o script antigo tinha `munLabel` fixo — não replicar).
- `Sensor` (domínio) ganha campo `sensor_index: int` — 6 campos agora: `id, code, sensor_index, name, municipio, active`. Coluna `sensors.sensor_index` no banco é `varchar` (schema Fase 1a) — `PostgresSensorRepository` faz `int(row.sensor_index)` ao montar o domínio; não migrar o tipo da coluna (não há FK entre `sensors` e `sensor_readings`, e mudar o tipo é risco desnecessário fora do escopo desta fase).
- `sensor_readings` ganha `UNIQUE (sensor_index, time_stamp)` (migration 0006) — todo insert de leitura usa `ON CONFLICT (sensor_index, time_stamp) DO NOTHING`. **Antes de aplicar essa migration na base de produção `airquality`** (que já tem 32.969.558 linhas da Fase 1b), é obrigatório rodar a query de detecção de duplicata do Task 9 e escalar pro humano se algo for encontrado — nunca apagar linha unilateralmente.
- `ingest_realtime_purpleair` lê sensores via `SensorRepository.list_active()` — desativar sensor na tabela já tira ele do polling, sem mudança de código (decisão de design já confirmada).
- `backfill_historical_purpleair(sensor_indices: list[int] | None, start: datetime, end: datetime)` — `None` = todos os sensores ativos. Reutilizável tanto pro fechamento do gap (Task 9) quanto, no futuro, pra trazer histórico de sensor novo (fora do escopo desta fase, cabe na fase Admin).
- Worker vive em `backend/worker/` (subpacote do backend, reusa `application`/`adapters`/`infrastructure` por import direto) — não é um diretório top-level separado. Mesma imagem Docker do backend, `command:` diferente no `docker-compose.yml`.
- `PURPLEAIR_API_KEY` só via variável de ambiente — nunca hardcoded em código ou commitado. (O app antigo tinha a chave em texto puro em `config.env`; reusar o mesmo valor real via env var, não repetir o erro.)
- Sem dependências novas — `httpx` já está em `requirements.txt`, parsing de CSV via `csv` stdlib, CLI via `argparse` stdlib.
- Composition roots (`worker/main.py`, `worker/backfill_cli.py`) não ganham teste unitário dedicado — mesmo padrão já estabelecido pra `infrastructure/main.py` (testado indiretamente via `test_http_routes.py`, sem teste de wiring direto). Ganham teste de fumaça manual (documentado no report).

---

### Task 1: `Sensor` entity ganha `sensor_index`

**Files:**
- Modify: `backend/domain/entities/sensor.py`
- Modify: `backend/adapters/outbound/postgres/postgres_sensor_repository.py`
- Modify: `backend/tests/application/test_list_sensors.py`
- Modify: `backend/tests/adapters/test_postgres_sensor_repository.py`

**Interfaces:**
- Produces: `Sensor(id, code, sensor_index, name, municipio, active)` — usado por todos os use cases das próximas tasks pra obter o `sensor_index` (ID PurpleAir) de cada sensor.

- [ ] **Step 1: Atualizar os testes existentes pra esperar `sensor_index`**

Em `backend/tests/application/test_list_sensors.py`, substitua o corpo do teste:

```python
from domain.entities.sensor import Sensor
from application.use_cases.list_sensors import ListSensors
from adapters.outbound.memory.in_memory_sensor_repository import InMemorySensorRepository


def test_list_sensors_returns_only_active():
    sensors = [
        Sensor(id=1, code="RBR1", sensor_index=25549, name="MPAC_RBR", municipio="Rio Branco", active=True),
        Sensor(id=2, code="CZS1", sensor_index=25550, name="UFAC_CZS", municipio="Cruzeiro do Sul", active=False),
    ]
    use_case = ListSensors(InMemorySensorRepository(sensors))

    result = use_case.execute()

    assert result == [sensors[0]]
```

Em `backend/tests/adapters/test_postgres_sensor_repository.py`, acrescente ao final de
`test_list_active_returns_domain_sensor_objects`:

```python
def test_list_active_returns_domain_sensor_objects(db_session):
    repository = PostgresSensorRepository(db_session)

    sensors = repository.list_active()

    rbr1 = next(s for s in sensors if s.code == "RBR1")
    assert rbr1.name == "MPAC_RBR"
    assert rbr1.municipio == "Rio Branco"
    assert rbr1.active is True
    assert isinstance(rbr1.id, int)
    assert rbr1.sensor_index == 25549
    assert isinstance(rbr1.sensor_index, int)
```

(seed de `RBR1` na migration 0001 tem `sensor_index="25549"` como string — o teste prova que vira `int`.)

- [ ] **Step 2: Rodar os testes, confirmar que falham**

Run: `cd backend && pytest tests/application/test_list_sensors.py tests/adapters/test_postgres_sensor_repository.py -v`
Expected: FAIL — `TypeError: Sensor.__init__() got an unexpected keyword argument 'sensor_index'`

- [ ] **Step 3: Adicionar o campo em `Sensor`**

`backend/domain/entities/sensor.py`:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Sensor:
    id: int
    code: str
    sensor_index: int
    name: str
    municipio: str
    active: bool
```

- [ ] **Step 4: Popular o campo no adapter Postgres**

`backend/adapters/outbound/postgres/postgres_sensor_repository.py`:

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

from adapters.outbound.postgres.models import SensorModel
from application.ports.sensor_repository import SensorRepository
from domain.entities.sensor import Sensor


class PostgresSensorRepository(SensorRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_active(self) -> list[Sensor]:
        rows = self._session.execute(
            select(SensorModel).where(SensorModel.active.is_(True))
        ).scalars()
        return [
            Sensor(
                id=row.id,
                code=row.code,
                sensor_index=int(row.sensor_index),
                name=row.name,
                municipio=row.municipio,
                active=row.active,
            )
            for row in rows
        ]
```

- [ ] **Step 5: Rodar os testes, confirmar que passam**

Run: `cd backend && pytest tests/application/test_list_sensors.py tests/adapters/test_postgres_sensor_repository.py -v`
Expected: PASS (3 testes)

- [ ] **Step 6: Rodar a suíte completa**

Run: `cd backend && pytest -v`
Expected: todos os testes anteriores continuam passando (17 antes desta task).

- [ ] **Step 7: Commit**

```bash
cd backend
git add domain/entities/sensor.py adapters/outbound/postgres/postgres_sensor_repository.py \
  tests/application/test_list_sensors.py tests/adapters/test_postgres_sensor_repository.py
git commit -m "feat(sensors): expõe sensor_index no domínio Sensor"
```

---

### Task 2: Migration 0006 — `UNIQUE (sensor_index, time_stamp)` em `sensor_readings`

**Files:**
- Create: `backend/alembic/versions/0006_add_sensor_readings_unique_constraint.py`
- Create: `backend/tests/adapters/test_sensor_readings_unique_constraint.py`

**Interfaces:**
- Produces: constraint `uq_sensor_readings_sensor_time` — usada pelo `ON CONFLICT (sensor_index, time_stamp) DO NOTHING` do `PostgresSensorReadingRepository` (Task 3).

Esta task só toca a base `airquality_test` (via `alembic upgrade head` com `DATABASE_URL` apontando pra
ela, do mesmo jeito que toda migration anterior foi desenvolvida). **Não aplique esta migration na
base `airquality` de produção nesta task** — isso é feito com verificação prévia de duplicata no
Task 9.

- [ ] **Step 1: Escrever o teste (RED)**

`backend/tests/adapters/test_sensor_readings_unique_constraint.py`:

```python
import pytest
from sqlalchemy import text


def test_duplicate_sensor_index_time_stamp_rejected(db_connection):
    db_connection.execute(
        text("""
            INSERT INTO sensor_readings (time_stamp, sensor_index, mun_name)
            VALUES ('2026-01-01T00:00:00Z', 999001, 'Rio Branco')
        """)
    )
    db_connection.commit()

    with pytest.raises(Exception):
        db_connection.execute(
            text("""
                INSERT INTO sensor_readings (time_stamp, sensor_index, mun_name)
                VALUES ('2026-01-01T00:00:00Z', 999001, 'Rio Branco')
            """)
        )
        db_connection.commit()
    db_connection.rollback()
```

- [ ] **Step 2: Rodar o teste, confirmar que falha**

Run: `cd backend && pytest tests/adapters/test_sensor_readings_unique_constraint.py -v`
Expected: FAIL — o segundo insert é aceito (nenhuma constraint impedindo hoje).

- [ ] **Step 3: Escrever a migration**

`backend/alembic/versions/0006_add_sensor_readings_unique_constraint.py`:

```python
"""add unique constraint to sensor_readings

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-18
"""
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE sensor_readings "
        "ADD CONSTRAINT uq_sensor_readings_sensor_time UNIQUE (sensor_index, time_stamp)"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE sensor_readings DROP CONSTRAINT uq_sensor_readings_sensor_time"
    )
```

- [ ] **Step 4: Aplicar a migration na base de teste**

Run:
```bash
cd backend
DATABASE_URL=$(python -c "from infrastructure.settings import settings; print(settings.database_url.rsplit('/',1)[0] + '/airquality_test')") \
  alembic upgrade head
```
Expected: `Running upgrade 0005 -> 0006, add unique constraint to sensor_readings`

- [ ] **Step 5: Rodar o teste, confirmar que passa**

Run: `cd backend && pytest tests/adapters/test_sensor_readings_unique_constraint.py -v`
Expected: PASS

- [ ] **Step 6: Rodar a suíte completa**

Run: `cd backend && pytest -v`
Expected: todos os testes passam.

- [ ] **Step 7: Commit**

```bash
cd backend
git add alembic/versions/0006_add_sensor_readings_unique_constraint.py \
  tests/adapters/test_sensor_readings_unique_constraint.py
git commit -m "feat(schema): adiciona UNIQUE(sensor_index, time_stamp) em sensor_readings"
```

---

### Task 3: `SensorReadingRepository` (port + adapter Postgres)

**Files:**
- Create: `backend/application/ports/sensor_reading_repository.py`
- Create: `backend/adapters/outbound/postgres/postgres_sensor_reading_repository.py`
- Create: `backend/tests/adapters/test_postgres_sensor_reading_repository.py`

**Interfaces:**
- Consumes: constraint `uq_sensor_readings_sensor_time` (Task 2).
- Produces: `SensorReadingRepository.bulk_insert(readings: list[dict]) -> int` — usado pelos dois use
  cases (Tasks 6 e 7). `readings` é uma lista de dicts com chaves `time_stamp` (datetime UTC-aware),
  `sensor_index` (int), `mun_name` (str) + as colunas de medição PurpleAir (ver `READING_COLUMNS`
  abaixo); chaves ausentes num dict individual são tratadas como `NULL`. Retorno é o número de
  leituras processadas no lote (não necessariamente todas inseridas — `ON CONFLICT DO NOTHING`
  pode descartar duplicatas silenciosamente; o valor serve só pra registrar em `ingestion_runs`,
  não é uma contagem garantida de linhas novas).

- [ ] **Step 1: Escrever o teste (RED)**

`backend/tests/adapters/test_postgres_sensor_reading_repository.py`:

```python
from datetime import datetime, timezone

from sqlalchemy import text

from adapters.outbound.postgres.postgres_sensor_reading_repository import (
    PostgresSensorReadingRepository,
)


def test_bulk_insert_writes_rows(db_session):
    repository = PostgresSensorReadingRepository(db_session)
    readings = [
        {
            "time_stamp": datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
            "sensor_index": 999101,
            "mun_name": "Rio Branco",
            "pm2_5_atm_a": 10.0,
            "pm2_5_atm_b": 12.0,
        }
    ]

    repository.bulk_insert(readings)

    row = db_session.execute(
        text("SELECT pm2_5_atm_a, pm2_5_atm_b, mun_name FROM sensor_readings WHERE sensor_index = 999101")
    ).fetchone()
    assert tuple(row) == (10.0, 12.0, "Rio Branco")


def test_bulk_insert_ignores_missing_fields_as_null(db_session):
    repository = PostgresSensorReadingRepository(db_session)
    readings = [
        {
            "time_stamp": datetime(2026, 1, 1, 13, 0, 0, tzinfo=timezone.utc),
            "sensor_index": 999102,
            "mun_name": "Rio Branco",
        }
    ]

    repository.bulk_insert(readings)

    row = db_session.execute(
        text("SELECT pm2_5_atm_a FROM sensor_readings WHERE sensor_index = 999102")
    ).fetchone()
    assert row[0] is None


def test_bulk_insert_is_idempotent_on_conflict(db_session):
    repository = PostgresSensorReadingRepository(db_session)
    reading = {
        "time_stamp": datetime(2026, 1, 1, 14, 0, 0, tzinfo=timezone.utc),
        "sensor_index": 999103,
        "mun_name": "Rio Branco",
        "pm2_5_atm_a": 5.0,
        "pm2_5_atm_b": 5.0,
    }

    repository.bulk_insert([reading])
    repository.bulk_insert([reading])

    count = db_session.execute(
        text("SELECT COUNT(*) FROM sensor_readings WHERE sensor_index = 999103")
    ).scalar_one()
    assert count == 1
```

- [ ] **Step 2: Rodar o teste, confirmar que falha**

Run: `cd backend && pytest tests/adapters/test_postgres_sensor_reading_repository.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'adapters.outbound.postgres.postgres_sensor_reading_repository'`

- [ ] **Step 3: Escrever o port**

`backend/application/ports/sensor_reading_repository.py`:

```python
from abc import ABC, abstractmethod


class SensorReadingRepository(ABC):
    @abstractmethod
    def bulk_insert(self, readings: list[dict]) -> int:
        raise NotImplementedError
```

- [ ] **Step 4: Escrever o adapter Postgres**

`backend/adapters/outbound/postgres/postgres_sensor_reading_repository.py`:

```python
from sqlalchemy import text
from sqlalchemy.orm import Session

from application.ports.sensor_reading_repository import SensorReadingRepository

READING_COLUMNS = [
    "time_stamp", "sensor_index", "mun_name",
    "private", "rssi", "uptime", "pa_latency", "memory",
    "latitude", "longitude", "altitude",
    "humidity", "humidity_a", "humidity_b",
    "temperature", "temperature_a", "temperature_b",
    "pressure", "pressure_a", "pressure_b",
    "voc", "voc_a", "voc_b",
    "analog_input",
    "pm2_5_alt", "pm2_5_alt_a", "pm2_5_alt_b",
    "0_3_um_count", "0_3_um_count_a", "0_3_um_count_b",
    "0_5_um_count", "0_5_um_count_a", "0_5_um_count_b",
    "1_0_um_count", "1_0_um_count_a", "1_0_um_count_b",
    "2_5_um_count", "2_5_um_count_a", "2_5_um_count_b",
    "5_0_um_count", "5_0_um_count_a", "5_0_um_count_b",
    "10_0_um_count", "10_0_um_count_a", "10_0_um_count_b",
    "pm1_0_cf_1", "pm1_0_cf_1_a", "pm1_0_cf_1_b",
    "pm1_0_atm", "pm1_0_atm_a", "pm1_0_atm_b",
    "pm2_5_atm", "pm2_5_atm_a", "pm2_5_atm_b",
    "pm2_5_cf_1", "pm2_5_cf_1_a", "pm2_5_cf_1_b",
    "pm10_0_atm", "pm10_0_atm_a", "pm10_0_atm_b",
    "pm10_0_cf_1", "pm10_0_cf_1_a", "pm10_0_cf_1_b",
]

# Colunas cujo nome começa com dígito não servem como nome de bind param
# (":0_3_um_count" não é sintaxe válida) — usam um alias "p_" só no param.
_DIGIT_PREFIXED = {c for c in READING_COLUMNS if c[0].isdigit()}


def _param_name(column: str) -> str:
    return f"p_{column}" if column in _DIGIT_PREFIXED else column


def _quoted_column(column: str) -> str:
    return f'"{column}"' if column in _DIGIT_PREFIXED else column


class PostgresSensorReadingRepository(SensorReadingRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def bulk_insert(self, readings: list[dict]) -> int:
        if not readings:
            return 0

        columns_sql = ", ".join(_quoted_column(c) for c in READING_COLUMNS)
        values_sql = ", ".join(f":{_param_name(c)}" for c in READING_COLUMNS)
        stmt = text(
            f"INSERT INTO sensor_readings ({columns_sql}) VALUES ({values_sql}) "
            f"ON CONFLICT (sensor_index, time_stamp) DO NOTHING"
        )

        params = [
            {_param_name(c): reading.get(c) for c in READING_COLUMNS}
            for reading in readings
        ]

        self._session.execute(stmt, params)
        self._session.commit()
        return len(readings)
```

- [ ] **Step 5: Rodar o teste, confirmar que passa**

Run: `cd backend && pytest tests/adapters/test_postgres_sensor_reading_repository.py -v`
Expected: PASS (3 testes)

- [ ] **Step 6: Rodar a suíte completa**

Run: `cd backend && pytest -v`
Expected: todos os testes passam.

- [ ] **Step 7: Commit**

```bash
cd backend
git add application/ports/sensor_reading_repository.py \
  adapters/outbound/postgres/postgres_sensor_reading_repository.py \
  tests/adapters/test_postgres_sensor_reading_repository.py
git commit -m "feat(ingestao): adiciona SensorReadingRepository com insert idempotente"
```

---

### Task 4: `IngestionRunRepository` (port + adapter Postgres)

**Files:**
- Create: `backend/application/ports/ingestion_run_repository.py`
- Create: `backend/adapters/outbound/postgres/postgres_ingestion_run_repository.py`
- Create: `backend/tests/adapters/test_postgres_ingestion_run_repository.py`

**Interfaces:**
- Produces: `IngestionRunRepository.start(source: str) -> int` (retorna `id` da run),
  `IngestionRunRepository.finish(run_id: int, status: str, records_ingested: int) -> None`. Usado
  pelos dois use cases (Tasks 6 e 7) com `source="realtime"` ou `source="backfill"` e
  `status` em `"success"`/`"failed"`.

- [ ] **Step 1: Escrever o teste (RED)**

`backend/tests/adapters/test_postgres_ingestion_run_repository.py`:

```python
from sqlalchemy import text

from adapters.outbound.postgres.postgres_ingestion_run_repository import (
    PostgresIngestionRunRepository,
)


def test_start_creates_running_row(db_session):
    repository = PostgresIngestionRunRepository(db_session)

    run_id = repository.start("realtime")

    row = db_session.execute(
        text("SELECT source, status, finished_at FROM ingestion_runs WHERE id = :id"),
        {"id": run_id},
    ).fetchone()
    assert row.source == "realtime"
    assert row.status == "running"
    assert row.finished_at is None


def test_finish_updates_status_and_records(db_session):
    repository = PostgresIngestionRunRepository(db_session)
    run_id = repository.start("backfill")

    repository.finish(run_id, "success", 42)

    row = db_session.execute(
        text("SELECT status, records_ingested, finished_at FROM ingestion_runs WHERE id = :id"),
        {"id": run_id},
    ).fetchone()
    assert row.status == "success"
    assert row.records_ingested == 42
    assert row.finished_at is not None
```

- [ ] **Step 2: Rodar o teste, confirmar que falha**

Run: `cd backend && pytest tests/adapters/test_postgres_ingestion_run_repository.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Escrever o port**

`backend/application/ports/ingestion_run_repository.py`:

```python
from abc import ABC, abstractmethod


class IngestionRunRepository(ABC):
    @abstractmethod
    def start(self, source: str) -> int:
        raise NotImplementedError

    @abstractmethod
    def finish(self, run_id: int, status: str, records_ingested: int) -> None:
        raise NotImplementedError
```

- [ ] **Step 4: Escrever o adapter Postgres**

`backend/adapters/outbound/postgres/postgres_ingestion_run_repository.py`:

```python
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from application.ports.ingestion_run_repository import IngestionRunRepository


class PostgresIngestionRunRepository(IngestionRunRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def start(self, source: str) -> int:
        result = self._session.execute(
            text(
                "INSERT INTO ingestion_runs (source, started_at, status) "
                "VALUES (:source, :started_at, 'running') RETURNING id"
            ),
            {"source": source, "started_at": datetime.now(timezone.utc)},
        )
        run_id = result.scalar_one()
        self._session.commit()
        return run_id

    def finish(self, run_id: int, status: str, records_ingested: int) -> None:
        self._session.execute(
            text(
                "UPDATE ingestion_runs SET finished_at = :finished_at, status = :status, "
                "records_ingested = :records_ingested WHERE id = :run_id"
            ),
            {
                "finished_at": datetime.now(timezone.utc),
                "status": status,
                "records_ingested": records_ingested,
                "run_id": run_id,
            },
        )
        self._session.commit()
```

- [ ] **Step 5: Rodar o teste, confirmar que passa**

Run: `cd backend && pytest tests/adapters/test_postgres_ingestion_run_repository.py -v`
Expected: PASS (2 testes)

- [ ] **Step 6: Rodar a suíte completa**

Run: `cd backend && pytest -v`
Expected: todos os testes passam.

- [ ] **Step 7: Commit**

```bash
cd backend
git add application/ports/ingestion_run_repository.py \
  adapters/outbound/postgres/postgres_ingestion_run_repository.py \
  tests/adapters/test_postgres_ingestion_run_repository.py
git commit -m "feat(ingestao): adiciona IngestionRunRepository"
```

---

### Task 5: `PurpleAirClient` (port + adapter)

**Files:**
- Create: `backend/application/ports/purpleair_client.py`
- Create: `backend/adapters/outbound/purpleair/__init__.py`
- Create: `backend/adapters/outbound/purpleair/purpleair_api_client.py`
- Create: `backend/tests/adapters/test_purpleair_api_client.py`

**Interfaces:**
- Produces: `PurpleAirClient.fetch_realtime(sensor_indices: list[int]) -> list[dict]`,
  `PurpleAirClient.fetch_history(sensor_index: int, start: datetime, end: datetime) -> list[dict]`.
  Cada dict tem `time_stamp` (datetime UTC-aware, **sem conversão de timezone**), `sensor_index`
  (int) e as colunas de medição normalizadas (`.` → `_`, batendo com `READING_COLUMNS` da Task 3
  menos `mun_name` — o client não sabe município, isso é responsabilidade do use case). Usado
  pelos use cases das Tasks 6 e 7.

**Nota importante pro implementador:** a forma exata da resposta JSON do endpoint bulk
`/v1/sensors` (nomes de campo pra timestamp por sensor, se `sensor_index` vem sempre no payload)
é documentada de memória aqui, não verificada contra a API ao vivo nesta escrita do plano. **Depois
de implementar, faça um teste de fumaça real** (Step 7 abaixo) contra a API de verdade usando
`PURPLEAIR_API_KEY` real (valor está em
`/home/willianflores/localhost/airquality-app/backend/scripts/config.env`, chave `PURPLEAIR_API_KEY` —
export como variável de ambiente, não copie pro código). Se a resposta real divergir do que os
testes mockados assumem (nome de campo diferente, estrutura diferente), corrija o adapter e
documente a divergência encontrada no report.

- [ ] **Step 1: Escrever os testes (RED)**

`backend/tests/adapters/test_purpleair_api_client.py`:

```python
from datetime import datetime, timezone

import httpx
import pytest

from adapters.outbound.purpleair.purpleair_api_client import PurpleAirApiClient


def _client_with_handler(handler) -> PurpleAirApiClient:
    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(base_url="https://api.purpleair.com", transport=transport)
    return PurpleAirApiClient(api_key="test-key", client=http_client)


def test_fetch_realtime_parses_bulk_response_without_timezone_conversion():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["api_key"] == "test-key"
        return httpx.Response(
            200,
            json={
                "fields": ["sensor_index", "last_seen", "pm2.5_atm_a", "pm2.5_atm_b"],
                "data": [
                    [25549, 1735689600, 10.5, 11.5],  # 2025-01-01T00:00:00Z
                ],
            },
        )

    client = _client_with_handler(handler)

    readings = client.fetch_realtime([25549])

    assert len(readings) == 1
    reading = readings[0]
    assert reading["sensor_index"] == 25549
    assert reading["pm2_5_atm_a"] == 10.5
    assert reading["pm2_5_atm_b"] == 11.5
    assert reading["time_stamp"] == datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)


def test_fetch_realtime_empty_sensor_list_makes_no_request():
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("não deveria fazer request com lista vazia")

    client = _client_with_handler(handler)

    assert client.fetch_realtime([]) == []


def test_fetch_realtime_retries_on_failure_then_succeeds(monkeypatch):
    monkeypatch.setattr("adapters.outbound.purpleair.purpleair_api_client.time.sleep", lambda _: None)
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        if calls["count"] < 2:
            return httpx.Response(503)
        return httpx.Response(
            200,
            json={
                "fields": ["sensor_index", "last_seen"],
                "data": [[25549, 1735689600]],
            },
        )

    client = _client_with_handler(handler)

    readings = client.fetch_realtime([25549])

    assert calls["count"] == 2
    assert len(readings) == 1


def test_fetch_history_parses_csv_without_timezone_conversion():
    csv_body = (
        "time_stamp,sensor_index,pm2.5_atm_a,pm2.5_atm_b\n"
        "2025-01-01T00:00:00Z,25549,10.5,11.5\n"
        "2025-01-01T00:02:00Z,25549,,12.0\n"
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert "25549/history/csv" in str(request.url)
        return httpx.Response(200, text=csv_body)

    client = _client_with_handler(handler)

    readings = client.fetch_history(
        25549,
        datetime(2025, 1, 1, tzinfo=timezone.utc),
        datetime(2025, 1, 2, tzinfo=timezone.utc),
    )

    assert len(readings) == 2
    assert readings[0]["time_stamp"] == datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    assert readings[0]["pm2_5_atm_a"] == 10.5
    assert readings[1]["pm2_5_atm_a"] is None  # campo vazio no CSV vira None, não ""
    assert readings[1]["pm2_5_atm_b"] == 12.0


def test_fetch_history_paginates_in_30_day_windows():
    requests_made = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests_made.append(
            (request.url.params["start_timestamp"], request.url.params["end_timestamp"])
        )
        return httpx.Response(200, text="time_stamp,sensor_index\n")

    client = _client_with_handler(handler)

    client.fetch_history(
        25549,
        datetime(2025, 1, 1, tzinfo=timezone.utc),
        datetime(2025, 3, 1, tzinfo=timezone.utc),  # 59 dias > janela de 30
    )

    assert len(requests_made) == 3  # 30 + 30 + resto
```

- [ ] **Step 2: Rodar os testes, confirmar que falham**

Run: `cd backend && pytest tests/adapters/test_purpleair_api_client.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'adapters.outbound.purpleair'`

- [ ] **Step 3: Escrever o port**

`backend/application/ports/purpleair_client.py`:

```python
from abc import ABC, abstractmethod
from datetime import datetime


class PurpleAirClient(ABC):
    @abstractmethod
    def fetch_realtime(self, sensor_indices: list[int]) -> list[dict]:
        raise NotImplementedError

    @abstractmethod
    def fetch_history(self, sensor_index: int, start: datetime, end: datetime) -> list[dict]:
        raise NotImplementedError
```

- [ ] **Step 4: Criar `backend/adapters/outbound/purpleair/__init__.py`**

Arquivo vazio.

- [ ] **Step 5: Escrever o adapter**

`backend/adapters/outbound/purpleair/purpleair_api_client.py`:

```python
import csv
import time
from datetime import datetime, timedelta, timezone
from io import StringIO

import httpx

from application.ports.purpleair_client import PurpleAirClient

BASE_URL = "https://api.purpleair.com"

# Nomes de campo como a API PurpleAir espera (com ".", não "_") — normalizados
# pra "_" na resposta antes de virar chave de dict. Bate com READING_COLUMNS
# do PostgresSensorReadingRepository, menos time_stamp/sensor_index/mun_name.
FIELDS = [
    "private", "rssi", "uptime", "pa_latency", "memory",
    "latitude", "longitude", "altitude",
    "humidity", "humidity_a", "humidity_b",
    "temperature", "temperature_a", "temperature_b",
    "pressure", "pressure_a", "pressure_b",
    "voc", "voc_a", "voc_b",
    "analog_input",
    "pm2.5_alt", "pm2.5_alt_a", "pm2.5_alt_b",
    "0.3_um_count", "0.3_um_count_a", "0.3_um_count_b",
    "0.5_um_count", "0.5_um_count_a", "0.5_um_count_b",
    "1.0_um_count", "1.0_um_count_a", "1.0_um_count_b",
    "2.5_um_count", "2.5_um_count_a", "2.5_um_count_b",
    "5.0_um_count", "5.0_um_count_a", "5.0_um_count_b",
    "10.0_um_count", "10.0_um_count_a", "10.0_um_count_b",
    "pm1.0_cf_1", "pm1.0_cf_1_a", "pm1.0_cf_1_b",
    "pm1.0_atm", "pm1.0_atm_a", "pm1.0_atm_b",
    "pm2.5_atm", "pm2.5_atm_a", "pm2.5_atm_b",
    "pm2.5_cf_1", "pm2.5_cf_1_a", "pm2.5_cf_1_b",
    "pm10.0_atm", "pm10.0_atm_a", "pm10.0_atm_b",
    "pm10.0_cf_1", "pm10.0_cf_1_a", "pm10.0_cf_1_b",
]

# Endpoint bulk não devolve "time_stamp" por sensor — devolve "last_seen"
# (epoch da última leitura daquele sensor). Vira time_stamp na normalização.
REALTIME_FIELDS = ["sensor_index", "last_seen"] + FIELDS

MAX_RETRIES = 5
RETRY_BASE_SECONDS = 2
HISTORY_WINDOW_DAYS = 30


def _normalize_field(name: str) -> str:
    return name.replace(".", "_")


def _parse_csv_value(raw: str) -> float | None:
    if raw is None or raw == "":
        return None
    return float(raw)


class PurpleAirApiClient(PurpleAirClient):
    def __init__(self, api_key: str, client: httpx.Client | None = None) -> None:
        self._api_key = api_key
        self._client = client or httpx.Client(base_url=BASE_URL, timeout=30.0)

    def fetch_realtime(self, sensor_indices: list[int]) -> list[dict]:
        if not sensor_indices:
            return []

        response = self._request_with_retry(
            "/v1/sensors",
            {
                "api_key": self._api_key,
                "sensor_index": ",".join(str(i) for i in sensor_indices),
                "fields": ",".join(REALTIME_FIELDS),
            },
        )
        body = response.json()
        field_names = [_normalize_field(f) for f in body["fields"]]

        readings = []
        for row in body["data"]:
            reading = dict(zip(field_names, row))
            reading["time_stamp"] = datetime.fromtimestamp(
                reading.pop("last_seen"), tz=timezone.utc
            )
            reading["sensor_index"] = int(reading["sensor_index"])
            readings.append(reading)
        return readings

    def fetch_history(self, sensor_index: int, start: datetime, end: datetime) -> list[dict]:
        readings = []
        for window_start, window_end in self._time_windows(start, end):
            response = self._request_with_retry(
                f"/v1/sensors/{sensor_index}/history/csv",
                {
                    "api_key": self._api_key,
                    "start_timestamp": int(window_start.timestamp()),
                    "end_timestamp": int(window_end.timestamp()),
                    "average": 0,
                    "fields": ",".join(FIELDS),
                },
            )
            reader = csv.DictReader(StringIO(response.text))
            for row in reader:
                reading = {}
                for key, value in row.items():
                    normalized_key = _normalize_field(key)
                    if normalized_key in ("time_stamp", "sensor_index"):
                        continue
                    reading[normalized_key] = _parse_csv_value(value)
                reading["time_stamp"] = datetime.fromisoformat(
                    row["time_stamp"].replace("Z", "+00:00")
                )
                reading["sensor_index"] = int(row["sensor_index"])
                readings.append(reading)
        return readings

    def _request_with_retry(self, path: str, params: dict) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES):
            try:
                response = self._client.get(path, params=params)
                response.raise_for_status()
                return response
            except httpx.HTTPError as error:
                last_error = error
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_BASE_SECONDS * (2**attempt))
        raise last_error

    @staticmethod
    def _time_windows(start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
        windows = []
        window_start = start
        while window_start < end:
            window_end = min(window_start + timedelta(days=HISTORY_WINDOW_DAYS), end)
            windows.append((window_start, window_end))
            window_start = window_end
        return windows
```

- [ ] **Step 6: Rodar os testes, confirmar que passam**

Run: `cd backend && pytest tests/adapters/test_purpleair_api_client.py -v`
Expected: PASS (6 testes)

- [ ] **Step 7: Teste de fumaça real (obrigatório)**

```bash
cd backend
source .venv/bin/activate
export PURPLEAIR_API_KEY=<valor de config.env do app antigo>
python -c "
from adapters.outbound.purpleair.purpleair_api_client import PurpleAirApiClient
import os
client = PurpleAirApiClient(api_key=os.environ['PURPLEAIR_API_KEY'])
readings = client.fetch_realtime([25549])
print(readings)
"
```

Confirme: retorna 1 leitura, `time_stamp` é um `datetime` UTC plausível (próximo de agora, não
deslocado -5h), `sensor_index == 25549`. Se a resposta real tiver forma diferente do esperado
(campo renomeado, ausente, `KeyError`), ajuste o adapter e os testes mockados até bater com a
realidade, e documente a divergência no report. Repita o teste de fumaça com `fetch_history`
usando um intervalo de 1-2 dias recente.

- [ ] **Step 8: Rodar a suíte completa**

Run: `cd backend && pytest -v`
Expected: todos os testes passam.

- [ ] **Step 9: Commit**

```bash
cd backend
git add application/ports/purpleair_client.py adapters/outbound/purpleair/ \
  tests/adapters/test_purpleair_api_client.py
git commit -m "feat(ingestao): adiciona PurpleAirApiClient (bulk realtime + history)"
```

---

### Task 6: Use case `IngestRealtimePurpleAir`

**Files:**
- Create: `backend/application/use_cases/ingest_realtime_purpleair.py`
- Create: `backend/tests/application/test_ingest_realtime_purpleair.py`

**Interfaces:**
- Consumes: `SensorRepository.list_active()` (Task 1), `PurpleAirClient.fetch_realtime()` (Task 5),
  `SensorReadingRepository.bulk_insert()` (Task 3), `IngestionRunRepository.start()/finish()`
  (Task 4).
- Produces: `IngestRealtimePurpleAir(sensor_repository, purpleair_client, sensor_reading_repository, ingestion_run_repository).execute() -> int`.
  Usado pelo worker (Task 8).

- [ ] **Step 1: Escrever o teste (RED)**

`backend/tests/application/test_ingest_realtime_purpleair.py`:

```python
import pytest

from domain.entities.sensor import Sensor
from application.use_cases.ingest_realtime_purpleair import IngestRealtimePurpleAir


class FakeSensorRepository:
    def __init__(self, sensors):
        self._sensors = sensors

    def list_active(self):
        return self._sensors


class FakePurpleAirClient:
    def __init__(self, realtime_readings):
        self._realtime_readings = realtime_readings
        self.requested_sensor_indices = None

    def fetch_realtime(self, sensor_indices):
        self.requested_sensor_indices = sensor_indices
        return self._realtime_readings

    def fetch_history(self, sensor_index, start, end):
        raise NotImplementedError


class FakeSensorReadingRepository:
    def __init__(self):
        self.inserted = []

    def bulk_insert(self, readings):
        self.inserted.extend(readings)
        return len(readings)


class FakeIngestionRunRepository:
    def __init__(self):
        self.started = []
        self.finished = []

    def start(self, source):
        self.started.append(source)
        return 1

    def finish(self, run_id, status, records_ingested):
        self.finished.append((run_id, status, records_ingested))


def _sensors():
    return [
        Sensor(id=1, code="RBR1", sensor_index=25549, name="MPAC_RBR", municipio="Rio Branco", active=True),
    ]


def test_execute_attaches_municipio_and_inserts_readings():
    sensor_repository = FakeSensorRepository(_sensors())
    purpleair_client = FakePurpleAirClient([{"sensor_index": 25549, "pm2_5_atm_a": 10.0}])
    sensor_reading_repository = FakeSensorReadingRepository()
    ingestion_run_repository = FakeIngestionRunRepository()

    use_case = IngestRealtimePurpleAir(
        sensor_repository, purpleair_client, sensor_reading_repository, ingestion_run_repository
    )
    result = use_case.execute()

    assert result == 1
    assert purpleair_client.requested_sensor_indices == [25549]
    assert sensor_reading_repository.inserted[0]["mun_name"] == "Rio Branco"
    assert ingestion_run_repository.started == ["realtime"]
    assert ingestion_run_repository.finished == [(1, "success", 1)]


def test_execute_marks_run_failed_and_reraises_on_error():
    sensor_repository = FakeSensorRepository(_sensors())

    class FailingClient(FakePurpleAirClient):
        def fetch_realtime(self, sensor_indices):
            raise RuntimeError("API fora do ar")

    purpleair_client = FailingClient([])
    sensor_reading_repository = FakeSensorReadingRepository()
    ingestion_run_repository = FakeIngestionRunRepository()

    use_case = IngestRealtimePurpleAir(
        sensor_repository, purpleair_client, sensor_reading_repository, ingestion_run_repository
    )

    with pytest.raises(RuntimeError):
        use_case.execute()

    assert ingestion_run_repository.finished == [(1, "failed", 0)]
```

- [ ] **Step 2: Rodar o teste, confirmar que falha**

Run: `cd backend && pytest tests/application/test_ingest_realtime_purpleair.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Escrever o use case**

`backend/application/use_cases/ingest_realtime_purpleair.py`:

```python
from application.ports.ingestion_run_repository import IngestionRunRepository
from application.ports.purpleair_client import PurpleAirClient
from application.ports.sensor_reading_repository import SensorReadingRepository
from application.ports.sensor_repository import SensorRepository


class IngestRealtimePurpleAir:
    def __init__(
        self,
        sensor_repository: SensorRepository,
        purpleair_client: PurpleAirClient,
        sensor_reading_repository: SensorReadingRepository,
        ingestion_run_repository: IngestionRunRepository,
    ) -> None:
        self._sensor_repository = sensor_repository
        self._purpleair_client = purpleair_client
        self._sensor_reading_repository = sensor_reading_repository
        self._ingestion_run_repository = ingestion_run_repository

    def execute(self) -> int:
        sensors = self._sensor_repository.list_active()
        run_id = self._ingestion_run_repository.start("realtime")

        try:
            municipio_by_index = {s.sensor_index: s.municipio for s in sensors}
            readings = self._purpleair_client.fetch_realtime(
                [s.sensor_index for s in sensors]
            )
            for reading in readings:
                reading["mun_name"] = municipio_by_index.get(reading["sensor_index"])

            inserted = self._sensor_reading_repository.bulk_insert(readings)
            self._ingestion_run_repository.finish(run_id, "success", inserted)
            return inserted
        except Exception:
            self._ingestion_run_repository.finish(run_id, "failed", 0)
            raise
```

- [ ] **Step 4: Rodar o teste, confirmar que passa**

Run: `cd backend && pytest tests/application/test_ingest_realtime_purpleair.py -v`
Expected: PASS (2 testes)

- [ ] **Step 5: Rodar a suíte completa**

Run: `cd backend && pytest -v`
Expected: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
cd backend
git add application/use_cases/ingest_realtime_purpleair.py \
  tests/application/test_ingest_realtime_purpleair.py
git commit -m "feat(ingestao): adiciona use case IngestRealtimePurpleAir"
```

---

### Task 7: Use case `BackfillHistoricalPurpleAir`

**Files:**
- Create: `backend/application/use_cases/backfill_historical_purpleair.py`
- Create: `backend/tests/application/test_backfill_historical_purpleair.py`

**Interfaces:**
- Consumes: mesmas 4 portas da Task 6, mais `PurpleAirClient.fetch_history()` (Task 5).
- Produces: `BackfillHistoricalPurpleAir(sensor_repository, purpleair_client, sensor_reading_repository, ingestion_run_repository).execute(sensor_indices: list[int] | None, start: datetime, end: datetime) -> int`.
  Usado pelo `worker/backfill_cli.py` (Task 8) e pelo fechamento do gap (Task 9). `sensor_indices=None`
  significa todos os sensores ativos.

- [ ] **Step 1: Escrever o teste (RED)**

`backend/tests/application/test_backfill_historical_purpleair.py`:

```python
from datetime import datetime, timezone

import pytest

from domain.entities.sensor import Sensor
from application.use_cases.backfill_historical_purpleair import BackfillHistoricalPurpleAir


class FakeSensorRepository:
    def __init__(self, sensors):
        self._sensors = sensors

    def list_active(self):
        return self._sensors


class FakePurpleAirClient:
    def __init__(self, history_by_sensor):
        self._history_by_sensor = history_by_sensor
        self.requested = []

    def fetch_realtime(self, sensor_indices):
        raise NotImplementedError

    def fetch_history(self, sensor_index, start, end):
        self.requested.append((sensor_index, start, end))
        return self._history_by_sensor.get(sensor_index, [])


class FakeSensorReadingRepository:
    def __init__(self):
        self.inserted = []

    def bulk_insert(self, readings):
        self.inserted.extend(readings)
        return len(readings)


class FakeIngestionRunRepository:
    def __init__(self):
        self.started = []
        self.finished = []

    def start(self, source):
        self.started.append(source)
        return 1

    def finish(self, run_id, status, records_ingested):
        self.finished.append((run_id, status, records_ingested))


def _sensors():
    return [
        Sensor(id=1, code="RBR1", sensor_index=25549, name="MPAC_RBR", municipio="Rio Branco", active=True),
        Sensor(id=2, code="CZS1", sensor_index=25550, name="UFAC_CZS", municipio="Cruzeiro do Sul", active=True),
    ]


def test_execute_with_none_backfills_all_active_sensors():
    sensor_repository = FakeSensorRepository(_sensors())
    purpleair_client = FakePurpleAirClient(
        {25549: [{"sensor_index": 25549, "pm2_5_atm_a": 1.0}], 25550: [{"sensor_index": 25550, "pm2_5_atm_a": 2.0}]}
    )
    sensor_reading_repository = FakeSensorReadingRepository()
    ingestion_run_repository = FakeIngestionRunRepository()
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    end = datetime(2026, 1, 2, tzinfo=timezone.utc)

    use_case = BackfillHistoricalPurpleAir(
        sensor_repository, purpleair_client, sensor_reading_repository, ingestion_run_repository
    )
    result = use_case.execute(None, start, end)

    assert result == 2
    assert {r[0] for r in purpleair_client.requested} == {25549, 25550}
    mun_names = {r["sensor_index"]: r["mun_name"] for r in sensor_reading_repository.inserted}
    assert mun_names == {25549: "Rio Branco", 25550: "Cruzeiro do Sul"}
    assert ingestion_run_repository.finished == [(1, "success", 2)]


def test_execute_with_sensor_indices_filters_to_those_sensors():
    sensor_repository = FakeSensorRepository(_sensors())
    purpleair_client = FakePurpleAirClient({25549: [{"sensor_index": 25549}]})
    sensor_reading_repository = FakeSensorReadingRepository()
    ingestion_run_repository = FakeIngestionRunRepository()
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    end = datetime(2026, 1, 2, tzinfo=timezone.utc)

    use_case = BackfillHistoricalPurpleAir(
        sensor_repository, purpleair_client, sensor_reading_repository, ingestion_run_repository
    )
    use_case.execute([25549], start, end)

    assert [r[0] for r in purpleair_client.requested] == [25549]


def test_execute_marks_run_failed_and_reraises_on_error():
    sensor_repository = FakeSensorRepository(_sensors())

    class FailingClient(FakePurpleAirClient):
        def fetch_history(self, sensor_index, start, end):
            raise RuntimeError("API fora do ar")

    purpleair_client = FailingClient({})
    sensor_reading_repository = FakeSensorReadingRepository()
    ingestion_run_repository = FakeIngestionRunRepository()

    use_case = BackfillHistoricalPurpleAir(
        sensor_repository, purpleair_client, sensor_reading_repository, ingestion_run_repository
    )

    with pytest.raises(RuntimeError):
        use_case.execute(None, datetime(2026, 1, 1, tzinfo=timezone.utc), datetime(2026, 1, 2, tzinfo=timezone.utc))

    assert ingestion_run_repository.finished == [(1, "failed", 0)]
```

- [ ] **Step 2: Rodar o teste, confirmar que falha**

Run: `cd backend && pytest tests/application/test_backfill_historical_purpleair.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Escrever o use case**

`backend/application/use_cases/backfill_historical_purpleair.py`:

```python
from datetime import datetime

from application.ports.ingestion_run_repository import IngestionRunRepository
from application.ports.purpleair_client import PurpleAirClient
from application.ports.sensor_reading_repository import SensorReadingRepository
from application.ports.sensor_repository import SensorRepository


class BackfillHistoricalPurpleAir:
    def __init__(
        self,
        sensor_repository: SensorRepository,
        purpleair_client: PurpleAirClient,
        sensor_reading_repository: SensorReadingRepository,
        ingestion_run_repository: IngestionRunRepository,
    ) -> None:
        self._sensor_repository = sensor_repository
        self._purpleair_client = purpleair_client
        self._sensor_reading_repository = sensor_reading_repository
        self._ingestion_run_repository = ingestion_run_repository

    def execute(
        self, sensor_indices: list[int] | None, start: datetime, end: datetime
    ) -> int:
        sensors = self._sensor_repository.list_active()
        if sensor_indices is not None:
            wanted = set(sensor_indices)
            sensors = [s for s in sensors if s.sensor_index in wanted]

        run_id = self._ingestion_run_repository.start("backfill")
        total_inserted = 0

        try:
            for sensor in sensors:
                readings = self._purpleair_client.fetch_history(
                    sensor.sensor_index, start, end
                )
                for reading in readings:
                    reading["mun_name"] = sensor.municipio
                total_inserted += self._sensor_reading_repository.bulk_insert(readings)

            self._ingestion_run_repository.finish(run_id, "success", total_inserted)
            return total_inserted
        except Exception:
            self._ingestion_run_repository.finish(run_id, "failed", total_inserted)
            raise
```

- [ ] **Step 4: Rodar o teste, confirmar que passa**

Run: `cd backend && pytest tests/application/test_backfill_historical_purpleair.py -v`
Expected: PASS (3 testes)

- [ ] **Step 5: Rodar a suíte completa**

Run: `cd backend && pytest -v`
Expected: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
cd backend
git add application/use_cases/backfill_historical_purpleair.py \
  tests/application/test_backfill_historical_purpleair.py
git commit -m "feat(ingestao): adiciona use case BackfillHistoricalPurpleAir"
```

---

### Task 8: Worker (processo separado) + docker-compose

**Files:**
- Create: `backend/worker/__init__.py`
- Create: `backend/worker/main.py`
- Create: `backend/worker/backfill_cli.py`
- Modify: `backend/infrastructure/settings.py`
- Modify: `infra/docker-compose.yml`

**Interfaces:**
- Consumes: `IngestRealtimePurpleAir` (Task 6), `BackfillHistoricalPurpleAir` (Task 7),
  `PostgresSensorRepository`/`PostgresSensorReadingRepository`/`PostgresIngestionRunRepository`
  (Tasks 1/3/4), `PurpleAirApiClient` (Task 5).

Sem RED/GREEN nesta task — `main.py` e `backfill_cli.py` são composition roots (ligam adapters
concretos aos use cases), mesmo padrão de `infrastructure/main.py`, que não tem teste unitário
dedicado. Verificação é via teste de fumaça manual no Step 5.

- [ ] **Step 1: Adicionar configuração ao `Settings`**

`backend/infrastructure/settings.py`:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Portal de Qualidade do Ar API"
    environment: str = "development"
    database_url: str = "postgresql://airquality_user:devpassword@localhost:5435/airquality"
    purpleair_api_key: str = ""
    ingest_interval_seconds: int = 900

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 2: Criar `backend/worker/__init__.py`**

Arquivo vazio.

- [ ] **Step 3: Criar `backend/worker/main.py`**

```python
import time

from adapters.outbound.postgres.postgres_ingestion_run_repository import (
    PostgresIngestionRunRepository,
)
from adapters.outbound.postgres.postgres_sensor_reading_repository import (
    PostgresSensorReadingRepository,
)
from adapters.outbound.postgres.postgres_sensor_repository import PostgresSensorRepository
from adapters.outbound.purpleair.purpleair_api_client import PurpleAirApiClient
from application.use_cases.ingest_realtime_purpleair import IngestRealtimePurpleAir
from infrastructure.database import SessionLocal
from infrastructure.settings import settings


def run_once() -> int:
    session = SessionLocal()
    try:
        use_case = IngestRealtimePurpleAir(
            sensor_repository=PostgresSensorRepository(session),
            purpleair_client=PurpleAirApiClient(settings.purpleair_api_key),
            sensor_reading_repository=PostgresSensorReadingRepository(session),
            ingestion_run_repository=PostgresIngestionRunRepository(session),
        )
        return use_case.execute()
    finally:
        session.close()


def main() -> None:
    while True:
        run_once()
        time.sleep(settings.ingest_interval_seconds)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Criar `backend/worker/backfill_cli.py`**

```python
import argparse
from datetime import datetime, timezone

from adapters.outbound.postgres.postgres_ingestion_run_repository import (
    PostgresIngestionRunRepository,
)
from adapters.outbound.postgres.postgres_sensor_reading_repository import (
    PostgresSensorReadingRepository,
)
from adapters.outbound.postgres.postgres_sensor_repository import PostgresSensorRepository
from adapters.outbound.purpleair.purpleair_api_client import PurpleAirApiClient
from application.use_cases.backfill_historical_purpleair import BackfillHistoricalPurpleAir
from infrastructure.database import SessionLocal
from infrastructure.settings import settings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill histórico PurpleAir")
    parser.add_argument("--start", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end", required=True, help="YYYY-MM-DD")
    parser.add_argument(
        "--sensor-indices",
        default=None,
        help="Lista separada por vírgula (ex: 25549,25550). Omitido = todos ativos.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    start = datetime.strptime(args.start, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end = datetime.strptime(args.end, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    sensor_indices = (
        [int(s) for s in args.sensor_indices.split(",")]
        if args.sensor_indices
        else None
    )

    session = SessionLocal()
    try:
        use_case = BackfillHistoricalPurpleAir(
            sensor_repository=PostgresSensorRepository(session),
            purpleair_client=PurpleAirApiClient(settings.purpleair_api_key),
            sensor_reading_repository=PostgresSensorReadingRepository(session),
            ingestion_run_repository=PostgresIngestionRunRepository(session),
        )
        inserted = use_case.execute(sensor_indices, start, end)
        print(f"Backfill concluído: {inserted} registros inseridos")
    finally:
        session.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Adicionar serviço `worker` ao `docker-compose.yml`**

`infra/docker-compose.yml` — acrescentar após o serviço `backend` (mantendo `name: airquality_js`,
`postgres`, `backend`, `frontend`, `volumes` como estão hoje):

```yaml
  worker:
    build:
      context: ../backend
    container_name: airquality_js_worker
    command: python -m worker.main
    environment:
      DATABASE_URL: postgresql://airquality_user:${POSTGRES_PASSWORD:-devpassword}@postgres:5432/airquality
      PURPLEAIR_API_KEY: ${PURPLEAIR_API_KEY}
      INGEST_INTERVAL_SECONDS: "900"
    depends_on:
      postgres:
        condition: service_healthy
```

- [ ] **Step 6: Rodar a suíte completa (garantir que nada quebrou)**

Run: `cd backend && pytest -v`
Expected: todos os testes passam (nenhum teste novo nesta task, é só wiring).

- [ ] **Step 7: Teste de fumaça manual — subir o worker via Docker**

```bash
cd infra
export PURPLEAIR_API_KEY=<valor de config.env do app antigo>
docker compose up -d postgres
docker compose run --rm worker python -c "from worker.main import run_once; print(run_once())"
```

Confirme: roda sem exceção, imprime um inteiro (nº de leituras processadas), e uma nova linha
aparece em `ingestion_runs` com `source='realtime'`, `status='success'`
(`docker compose exec postgres psql -U airquality_user -d airquality -c "SELECT * FROM ingestion_runs ORDER BY id DESC LIMIT 1"`).

- [ ] **Step 8: Commit**

```bash
cd backend
git add worker/ infrastructure/settings.py
git commit -m "feat(worker): adiciona processo de ingestão real-time e CLI de backfill"
cd ../infra
git add docker-compose.yml
git commit -m "feat(infra): adiciona serviço worker ao docker-compose"
```

---

### Task 9: Fechar o gap de ingestão (operação de dados, sem dispatch de subagente)

Esta task mexe na base de produção `airquality` (32.969.558 linhas da Fase 1b). Execute
diretamente como controlador, do mesmo jeito que as Tasks 3-5 da Fase 1b foram — não dispatche
subagente pra isso.

**Files:** nenhum (operação de dados + aplicar migration pendente em produção).

- [ ] **Step 1: Checar duplicata `(sensor_index, time_stamp)` na base de produção**

```bash
docker compose exec postgres psql -U airquality_user -d airquality -c "
  SELECT sensor_index, time_stamp, COUNT(*)
  FROM sensor_readings
  GROUP BY sensor_index, time_stamp
  HAVING COUNT(*) > 1
  LIMIT 20;
"
```

Se retornar qualquer linha: **pare aqui**, reporte ao usuário quantas duplicatas e peça decisão
antes de prosseguir (não apagar nada sem confirmação explícita). Se vazio, prossiga.

- [ ] **Step 2: Aplicar a migration 0006 (e quaisquer pendentes) na base de produção**

```bash
cd backend
DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality alembic current
DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality alembic upgrade head
```

Confirme: `alembic current` mostra `0006 (head)` depois do upgrade.

- [ ] **Step 3: Rodar o backfill pra fechar o gap**

```bash
cd infra
export PURPLEAIR_API_KEY=<valor de config.env do app antigo>
docker compose run --rm worker python -m worker.backfill_cli --start 2025-12-05 --end $(date -u +%F)
```

- [ ] **Step 4: Verificar o resultado**

```bash
docker compose exec postgres psql -U airquality_user -d airquality -c "
  SELECT MAX(time_stamp), COUNT(*) FROM sensor_readings;
"
```

Confirme: `MAX(time_stamp)` avançou de `2025-12-05 04:59:58+00` pra próximo do horário atual, e
`COUNT(*)` cresceu além de `32969558`. Reporte os números exatos encontrados (max anterior, max
novo, total de linhas inseridas segundo o `records_ingested` da run em `ingestion_runs`).

- [ ] **Step 5: Subir o worker definitivamente**

```bash
cd infra
docker compose up -d worker
```

Confirme com `docker compose logs worker --tail 20` que está rodando sem erro.

---

## Self-Review

**1. Cobertura da spec:**
- PurpleAirClient (fetch_realtime + fetch_history, sem conversão de tz) → Task 5 ✅
- Sensor ganha sensor_index → Task 1 ✅
- Migration UNIQUE constraint → Task 2 (código+teste) + Task 9 (aplicação em produção com
  verificação de duplicata) ✅
- SensorReadingRepository → Task 3 ✅
- IngestionRunRepository → Task 4 ✅
- ingest_realtime_purpleair → Task 6 ✅
- backfill_historical_purpleair (parametrizado, reutilizável) → Task 7 ✅
- Worker separado, loop simples, backfill como comando manual → Task 8 ✅
- Fechamento do gap Dez/2025→hoje → Task 9 ✅
- mun_name do banco, não hardcoded → Tasks 6/7 (municipio_by_index / sensor.municipio) ✅

**2. Placeholder scan:** nenhum TBD/TODO: todo código é completo e executável como escrito.

**3. Consistência de tipos:** `Sensor.sensor_index: int` (Task 1) usado consistentemente em
`PurpleAirClient` (`list[int]`), `SensorReadingRepository` (`reading["sensor_index"]: int`),
`BackfillHistoricalPurpleAir.execute(sensor_indices: list[int] | None, ...)` — todos batem.
`SensorReadingRepository.bulk_insert(readings: list[dict]) -> int` usado igual nas Tasks 6 e 7.

---

## Execution Handoff

Plano completo, salvo em `docs/superpowers/plans/2026-07-18-fase-2-ingestao.md`. Duas opções de execução:

**1. Subagent-Driven (recomendado)** — dispatch de subagente fresco por task, review entre tasks
(exceto Task 9, executada diretamente por mim como controlador, igual às tasks de dados da Fase 1b).

**2. Inline Execution** — executo as tasks nesta sessão, com checkpoints pra revisão.

Qual abordagem?
