# Fase 1a — Schema TimescaleDB + Adapter Postgres Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the real PostgreSQL + TimescaleDB schema (dimension tables, raw-reading hypertable,
continuous aggregates) via Alembic migrations, and replace Fase 0's `InMemorySensorRepository`
placeholder with a real `PostgresSensorRepository` — all provable against the local Postgres
container without touching the old `airquality-app`'s database.

**Architecture:** Alembic migrations create the schema (plain `op.create_table` for relational
dimension tables, raw `op.execute` SQL for TimescaleDB-specific objects — hypertables and continuous
aggregates aren't expressible through Alembic's standard ops). A new
`adapters/outbound/postgres/` package holds the SQLAlchemy-backed repository implementing the same
`SensorRepository` port Fase 0 defined, so `ListSensors` and the `/sensors` HTTP route are unchanged
— only the adapter wired into `infrastructure/dependencies.py` changes.

**Tech Stack:** SQLAlchemy 2.x (Core + a thin declarative model for `sensors`), Alembic (migrations),
psycopg2 (driver), TimescaleDB 2.17 (already running via `infra/docker-compose.yml` from Fase 0).

## Global Constraints

- Hexagonal dependency rule (from Fase 0, still binding): `domain` imports nothing; `application`
  imports only `domain` and defines `ports`; `adapters` implement `ports`; `infrastructure` wires via
  DI. `PostgresSensorRepository` lives under `adapters/outbound/postgres/` and implements
  `application/ports/sensor_repository.py`'s `SensorRepository` exactly as `InMemorySensorRepository`
  already does.
- **Do not change the `Sensor` domain entity** (`id: int, code: str, name: str, municipio: str,
  active: bool`, from Fase 0). The real `sensors` table has more columns (`sensor_index`,
  `institution`, `location`, `latitude`, `longitude`, `created_at`, `updated_at`) per the design spec
  — those columns exist in the database now because Fase 2/3 (ingestion, admin CRUD) will need them,
  but no domain/application code reads them yet. YAGNI: the adapter selects only the five columns the
  domain entity has; the rest stay unread until a use case needs them.
- Continuous aggregates apply the EPA correction formula (`0.5 * pm2_5_atm - 0.66`, clamped to `>= 0`,
  discarded as invalid if `>= 1000`) exactly as `backend/scripts/purpleairFunctions.py`'s
  `setPSQLPm25Data` does in the old app — copied verbatim from
  `airquality-app/docs/superpowers/specs/2026-07-17-migracao-react-python-hexagonal-design.md`'s data
  model section, as a generated column on `sensor_readings`, not duplicated per-aggregate.
  `sensor_readings` replicates the full raw PurpleAir payload schema from that same spec section —
  do not trim columns.
- This plan does **not** touch the old `airquality-app` database or migrate any historical data —
  that's Fase 1b, planned separately once old-database access is available. `sensor_readings` and the
  continuous aggregates are created empty; only `sensors` gets the same two seed rows Fase 0 used
  (`RBR1`/`Rio Branco`, `CZS1`/`Cruzeiro do Sul`), to keep `GET /sensors`'s observable behavior
  identical after the swap from in-memory to Postgres.
- All new Postgres-touching code is verified against the real `postgres` service from
  `infra/docker-compose.yml` (`timescale/timescaledb:2.17.2-pg16`, `localhost:5435`) — no mocks for
  anything that talks to the database.

---

## Task 1: SQLAlchemy + Alembic scaffold, `sensors` table migration

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/infrastructure/settings.py`
- Create: `backend/infrastructure/database.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/0001_create_sensors_table.py`
- Create: `backend/adapters/outbound/postgres/__init__.py`
- Create: `backend/adapters/outbound/postgres/models.py`
- Create: `backend/tests/conftest.py`
- Test: `backend/tests/adapters/test_sensors_migration.py`

**Interfaces:**
- Produces: `settings.database_url: str` (new field on `Settings`); a SQLAlchemy `Engine` importable
  as `infrastructure.database.engine`; a `SensorModel` SQLAlchemy declarative class (table `sensors`)
  in `adapters/outbound/postgres/models.py` with columns `id, code, sensor_index, name, municipio,
  institution, location, active, latitude, longitude, created_at, updated_at`; a `db_engine` /
  `db_session` pytest fixture pair in `tests/conftest.py`, reused by every later task's integration
  tests in this plan.

- [ ] **Step 1: Add dependencies**

Edit `backend/requirements.txt` to add three lines at the end:
```
sqlalchemy>=2.0.0
alembic>=1.13.0
psycopg2-binary>=2.9.0
```

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
source .venv/bin/activate
pip install -r requirements.txt
```
Expected: all three packages install with no errors.

- [ ] **Step 2: Add `database_url` to settings**

Edit `backend/infrastructure/settings.py`:
```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Portal de Qualidade do Ar API"
    environment: str = "development"
    database_url: str = "postgresql://airquality_user:devpassword@localhost:5435/airquality"

    class Config:
        env_file = ".env"


settings = Settings()
```
(The default matches `infra/docker-compose.yml`'s `postgres` service — host `localhost`, port
`5435`, from Fase 0's Task 5.)

- [ ] **Step 3: Write the SQLAlchemy engine module**

`backend/infrastructure/database.py`:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from infrastructure.settings import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
```

- [ ] **Step 4: Write the `SensorModel` declarative model**

```bash
mkdir -p /home/willianflores/localhost/airquality-js-app/backend/adapters/outbound/postgres
touch /home/willianflores/localhost/airquality-js-app/backend/adapters/outbound/postgres/__init__.py
```

`backend/adapters/outbound/postgres/models.py`:
```python
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class SensorModel(Base):
    __tablename__ = "sensors"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String, unique=True)
    sensor_index: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    municipio: Mapped[str] = mapped_column(String)
    institution: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 5: Initialize Alembic**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
alembic init alembic
```
Expected: creates `backend/alembic/`, `backend/alembic.ini`, `backend/alembic/env.py`,
`backend/alembic/script.py.mako`, `backend/alembic/versions/` (empty).

- [ ] **Step 6: Replace the generated `alembic.ini`'s `sqlalchemy.url` line**

Edit `backend/alembic.ini`: find the line `sqlalchemy.url = driver://user:pass@localhost/dbname`
and replace it with:
```ini
sqlalchemy.url =
```
(Left blank — `env.py` sets it from `settings.database_url` at runtime, so there's one source of
truth for the connection string, not two.)

- [ ] **Step 7: Rewrite `alembic/env.py` to read `DATABASE_URL` from app settings**

Replace the generated `backend/alembic/env.py`'s content with:
```python
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure.settings import settings

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```
`target_metadata = None` is deliberate: this plan writes migrations by hand (`op.create_table`,
`op.execute`), not via `alembic revision --autogenerate`, so there's no ORM metadata for Alembic to
diff against — autogenerate can't see hypertables or continuous aggregates anyway.

- [ ] **Step 8: Write the first migration — `sensors` table with seed data**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
alembic revision -m "create sensors table"
```
Expected: creates a new file `backend/alembic/versions/<hash>_create_sensors_table.py`. Rename it to
`backend/alembic/versions/0001_create_sensors_table.py` and replace its content with:

```python
"""create sensors table

Revision ID: 0001
Revises:
Create Date: 2026-07-17
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sensors",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("code", sa.String, nullable=False, unique=True),
        sa.Column("sensor_index", sa.String, nullable=False, unique=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("municipio", sa.String, nullable=False),
        sa.Column("institution", sa.String, nullable=True),
        sa.Column("location", sa.String, nullable=True),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("latitude", sa.Float, nullable=True),
        sa.Column("longitude", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    sensors = sa.table(
        "sensors",
        sa.column("code", sa.String),
        sa.column("sensor_index", sa.String),
        sa.column("name", sa.String),
        sa.column("municipio", sa.String),
        sa.column("active", sa.Boolean),
    )
    op.bulk_insert(
        sensors,
        [
            {"code": "RBR1", "sensor_index": "25549", "name": "MPAC_RBR", "municipio": "Rio Branco", "active": True},
            {"code": "CZS1", "sensor_index": "25550", "name": "UFAC_CZS", "municipio": "Cruzeiro do Sul", "active": True},
        ],
    )


def downgrade() -> None:
    op.drop_table("sensors")
```
(`sensor_index` values `"25549"`/`"25550"` are placeholders distinguishing the two seed rows — real
PurpleAir sensor indices arrive with Fase 1b's backfill, not this task.)

- [ ] **Step 9: Write the shared pytest DB fixtures**

`backend/tests/conftest.py`:
```python
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from infrastructure.settings import settings


@pytest.fixture(scope="session")
def db_engine():
    return create_engine(settings.database_url)


@pytest.fixture
def db_connection(db_engine):
    connection = db_engine.connect()
    yield connection
    connection.close()


@pytest.fixture
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    yield session
    session.close()
    transaction.rollback()
    connection.close()
```
`db_connection` is for tests that only need to run raw SQL (e.g. checking Timescale system catalogs
in later tasks); `db_session` wraps each test in a transaction that's rolled back afterward, so tests
that insert rows through `SensorModel` never leave data behind for the next test.

- [ ] **Step 10: Bring up Postgres and apply the migration**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/infra
docker compose up -d postgres
cd /home/willianflores/localhost/airquality-js-app/backend
source .venv/bin/activate
alembic upgrade head
```
Expected: `Running upgrade  -> 0001, create sensors table`, no errors.

- [ ] **Step 11: Write the verification test**

`backend/tests/adapters/test_sensors_migration.py`:
```python
from sqlalchemy import text


def test_sensors_table_has_seed_rows(db_connection):
    rows = db_connection.execute(
        text("SELECT code, municipio, active FROM sensors ORDER BY code")
    ).fetchall()

    assert [tuple(row) for row in rows] == [
        ("CZS1", "Cruzeiro do Sul", True),
        ("RBR1", "Rio Branco", True),
    ]
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `pytest tests/adapters/test_sensors_migration.py -v`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add backend/requirements.txt backend/infrastructure/settings.py backend/infrastructure/database.py \
        backend/alembic.ini backend/alembic/env.py backend/alembic/script.py.mako \
        backend/alembic/versions/0001_create_sensors_table.py \
        backend/adapters/outbound/postgres/__init__.py backend/adapters/outbound/postgres/models.py \
        backend/tests/conftest.py backend/tests/adapters/test_sensors_migration.py
git commit -m "feat(backend): add Alembic and create sensors table with seed data"
```

---

## Task 2: `sensor_readings` hypertable

**Files:**
- Create: `backend/alembic/versions/0002_create_sensor_readings_hypertable.py`
- Test: `backend/tests/adapters/test_sensor_readings_migration.py`

**Interfaces:**
- Consumes: nothing from Task 1's Python code (this is a pure schema task); depends on Task 1's
  migration having already run (`down_revision = "0001"`).
- Produces: the `sensor_readings` hypertable and its `pm2_5_corrected` generated column — the column
  every continuous aggregate in Task 3 reads from.

- [ ] **Step 1: Write the migration**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
alembic revision -m "create sensor readings hypertable"
```
Rename the generated file to
`backend/alembic/versions/0002_create_sensor_readings_hypertable.py` and replace its content with:

```python
"""create sensor readings hypertable

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-17
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")

    op.execute("""
        CREATE TABLE sensor_readings (
            time_stamp timestamptz NOT NULL,
            sensor_index bigint NOT NULL,
            private bigint,
            rssi double precision,
            uptime double precision,
            pa_latency double precision,
            memory double precision,
            latitude double precision,
            longitude double precision,
            altitude double precision,
            humidity double precision,
            humidity_a double precision,
            humidity_b double precision,
            temperature double precision,
            temperature_a double precision,
            temperature_b double precision,
            pressure double precision,
            pressure_a double precision,
            pressure_b double precision,
            voc double precision,
            voc_a double precision,
            voc_b double precision,
            analog_input double precision,
            pm2_5_alt double precision,
            pm2_5_alt_a double precision,
            pm2_5_alt_b double precision,
            "0_3_um_count" double precision,
            "0_3_um_count_a" double precision,
            "0_3_um_count_b" double precision,
            "0_5_um_count" double precision,
            "0_5_um_count_a" double precision,
            "0_5_um_count_b" double precision,
            "1_0_um_count" double precision,
            "1_0_um_count_a" double precision,
            "1_0_um_count_b" double precision,
            "2_5_um_count" double precision,
            "2_5_um_count_a" double precision,
            "2_5_um_count_b" double precision,
            "5_0_um_count" double precision,
            "5_0_um_count_a" double precision,
            "5_0_um_count_b" double precision,
            "10_0_um_count" double precision,
            "10_0_um_count_a" double precision,
            "10_0_um_count_b" double precision,
            pm1_0_cf_1 double precision,
            pm1_0_cf_1_a double precision,
            pm1_0_cf_1_b double precision,
            pm1_0_atm double precision,
            pm1_0_atm_a double precision,
            pm1_0_atm_b double precision,
            pm2_5_atm double precision,
            pm2_5_atm_a double precision,
            pm2_5_atm_b double precision,
            pm2_5_cf_1 double precision,
            pm2_5_cf_1_a double precision,
            pm2_5_cf_1_b double precision,
            pm10_0_atm double precision,
            pm10_0_atm_a double precision,
            pm10_0_atm_b double precision,
            pm10_0_cf_1 double precision,
            pm10_0_cf_1_a double precision,
            pm10_0_cf_1_b double precision,
            mun_name text,
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

    op.execute("SELECT create_hypertable('sensor_readings', 'time_stamp')")
    op.execute("CREATE INDEX ix_sensor_readings_sensor_time ON sensor_readings (sensor_index, time_stamp DESC)")


def downgrade() -> None:
    op.execute("DROP TABLE sensor_readings")
```

`pm2_5_corrected` reproduces `purpleairFunctions.py`'s `setPSQLPm25Data` exactly: each channel's raw
`pm2_5_atm_{a,b}` is converted (`0.5*x - 0.66`), floored at 0, discarded (`NULL`) if `>= 1000`, then
the two channels are averaged — falling back to whichever channel is valid if only one is.

- [ ] **Step 2: Apply the migration**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
alembic upgrade head
```
Expected: `Running upgrade 0001 -> 0002, create sensor readings hypertable`, no errors.

- [ ] **Step 3: Write the verification test**

`backend/tests/adapters/test_sensor_readings_migration.py`:
```python
from sqlalchemy import text


def test_sensor_readings_is_a_hypertable(db_connection):
    row = db_connection.execute(
        text("""
            SELECT hypertable_name FROM timescaledb_information.hypertables
            WHERE hypertable_name = 'sensor_readings'
        """)
    ).fetchone()

    assert row is not None


def test_pm2_5_corrected_applies_epa_formula(db_connection):
    db_connection.execute(
        text("""
            INSERT INTO sensor_readings (time_stamp, sensor_index, pm2_5_atm_a, pm2_5_atm_b, mun_name)
            VALUES (now(), 25549, 40.0, 44.0, 'Rio Branco')
        """)
    )
    db_connection.commit()

    row = db_connection.execute(
        text("SELECT pm2_5_corrected FROM sensor_readings WHERE sensor_index = 25549")
    ).fetchone()

    # a: 0.5*40-0.66=19.34, b: 0.5*44-0.66=21.34, avg=20.34
    assert row[0] == pytest.approx(20.34, abs=0.01)


def test_pm2_5_corrected_discards_out_of_range_channel(db_connection):
    db_connection.execute(
        text("""
            INSERT INTO sensor_readings (time_stamp, sensor_index, pm2_5_atm_a, pm2_5_atm_b, mun_name)
            VALUES (now(), 25550, 40.0, 3000.0, 'Cruzeiro do Sul')
        """)
    )
    db_connection.commit()

    row = db_connection.execute(
        text("SELECT pm2_5_corrected FROM sensor_readings WHERE sensor_index = 25550")
    ).fetchone()

    # b's corrected value (0.5*3000-0.66=1499.34) is >= 1000, discarded; falls back to a alone
    assert row[0] == pytest.approx(19.34, abs=0.01)
```
Add `import pytest` at the top of the file (needed for `pytest.approx`).

Note: these two data-insertion tests write directly to `sensor_readings` and do **not** use the
`db_session` fixture (whose rollback wouldn't apply here since we `commit()` explicitly to make the
generated column visible to a fresh read within the same test) — instead, add a `cleanup_sensor_readings`
fixture:

`backend/tests/conftest.py` — append:
```python
@pytest.fixture(autouse=True)
def cleanup_sensor_readings(db_engine):
    yield
    with db_engine.connect() as connection:
        connection.execute(text("DELETE FROM sensor_readings"))
        connection.commit()
```
Add `from sqlalchemy import text` to the top of `conftest.py` if not already imported (it already is,
from Task 1's `db_connection`/`db_session` fixtures — reuse the same import).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pytest tests/adapters/test_sensor_readings_migration.py -v`
Expected: PASS — all three tests (hypertable check, EPA formula check, out-of-range discard check).

- [ ] **Step 5: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add backend/alembic/versions/0002_create_sensor_readings_hypertable.py \
        backend/tests/adapters/test_sensor_readings_migration.py backend/tests/conftest.py
git commit -m "feat(backend): create sensor_readings hypertable with EPA-corrected generated column"
```

---

## Task 3: Continuous aggregates

**Files:**
- Create: `backend/alembic/versions/0003_create_continuous_aggregates.py`
- Test: `backend/tests/adapters/test_continuous_aggregates_migration.py`

**Interfaces:**
- Consumes: `sensor_readings.pm2_5_corrected` from Task 2.
- Produces: three continuous aggregates (`municipio_hourly_pm25`, `municipio_daily_pm25`,
  `who_exceedance_days`) that Fase 2/3 use cases will query — this task only proves they exist and
  refresh correctly, no use case reads them yet.

- [ ] **Step 1: Write the migration**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
alembic revision -m "create continuous aggregates"
```
Rename the generated file to
`backend/alembic/versions/0003_create_continuous_aggregates.py` and replace its content with:

```python
"""create continuous aggregates

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-17
"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE MATERIALIZED VIEW municipio_hourly_pm25
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 hour', time_stamp) AS bucket,
            mun_name AS municipio,
            avg(pm2_5_corrected) AS pm2_5_avg
        FROM sensor_readings
        GROUP BY bucket, mun_name
        WITH NO DATA
    """)
    op.execute("""
        SELECT add_continuous_aggregate_policy('municipio_hourly_pm25',
            start_offset => INTERVAL '3 hours',
            end_offset => INTERVAL '15 minutes',
            schedule_interval => INTERVAL '15 minutes')
    """)

    op.execute("""
        CREATE MATERIALIZED VIEW municipio_daily_pm25
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 day', time_stamp) AS bucket,
            mun_name AS municipio,
            avg(pm2_5_corrected) AS pm2_5_avg
        FROM sensor_readings
        GROUP BY bucket, mun_name
        WITH NO DATA
    """)
    op.execute("""
        SELECT add_continuous_aggregate_policy('municipio_daily_pm25',
            start_offset => INTERVAL '3 days',
            end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '1 hour')
    """)

    op.execute("""
        CREATE MATERIALIZED VIEW who_exceedance_days
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 day', time_stamp) AS bucket,
            mun_name AS municipio,
            avg(pm2_5_corrected) AS pm2_5_avg,
            (avg(pm2_5_corrected) > 15) AS exceeds_who_threshold
        FROM sensor_readings
        GROUP BY bucket, mun_name
        WITH NO DATA
    """)
    op.execute("""
        SELECT add_continuous_aggregate_policy('who_exceedance_days',
            start_offset => INTERVAL '3 days',
            end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '1 hour')
    """)


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW who_exceedance_days")
    op.execute("DROP MATERIALIZED VIEW municipio_daily_pm25")
    op.execute("DROP MATERIALIZED VIEW municipio_hourly_pm25")
```

`who_exceedance_days` is deliberately its own daily-bucket aggregate (not derived by a second query
over `municipio_daily_pm25`) to keep each of the three aggregates named in the design spec as an
independent, directly queryable object — a future `get_metrics_summary` use case (Fase 3) can
`COUNT(*) FILTER (WHERE exceeds_who_threshold)` over this view grouped by municipio/year, which is
cheap since it's already pre-aggregated to one row per municipio per day.

- [ ] **Step 2: Apply the migration**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
alembic upgrade head
```
Expected: `Running upgrade 0002 -> 0003, create continuous aggregates`, no errors.

- [ ] **Step 3: Write the verification test**

`backend/tests/adapters/test_continuous_aggregates_migration.py`:
```python
import pytest
from sqlalchemy import text


@pytest.mark.parametrize(
    "view_name",
    ["municipio_hourly_pm25", "municipio_daily_pm25", "who_exceedance_days"],
)
def test_continuous_aggregate_exists(db_connection, view_name):
    row = db_connection.execute(
        text("""
            SELECT view_name FROM timescaledb_information.continuous_aggregates
            WHERE view_name = :view_name
        """),
        {"view_name": view_name},
    ).fetchone()

    assert row is not None


def test_municipio_daily_pm25_reflects_inserted_reading(db_connection):
    db_connection.execute(
        text("""
            INSERT INTO sensor_readings (time_stamp, sensor_index, pm2_5_atm_a, pm2_5_atm_b, mun_name)
            VALUES (now(), 25549, 40.0, 44.0, 'Rio Branco')
        """)
    )
    db_connection.commit()

    db_connection.execute(text("CALL refresh_continuous_aggregate('municipio_daily_pm25', NULL, NULL)"))
    db_connection.commit()

    row = db_connection.execute(
        text("SELECT pm2_5_avg FROM municipio_daily_pm25 WHERE municipio = 'Rio Branco'")
    ).fetchone()

    assert row is not None
    assert row[0] == pytest.approx(20.34, abs=0.01)
```
`refresh_continuous_aggregate` is called manually here because the policy's `schedule_interval`
(15 minutes / 1 hour) is far longer than a test should wait — this proves the aggregate computes the
right value on demand, without waiting for its background refresh job.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pytest tests/adapters/test_continuous_aggregates_migration.py -v`
Expected: PASS — all four tests (three existence checks + one value check).

- [ ] **Step 5: Run the full backend suite**

Run: `pytest -v`
Expected: PASS — every test from Tasks 1, 2, and 3 passes together.

- [ ] **Step 6: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add backend/alembic/versions/0003_create_continuous_aggregates.py \
        backend/tests/adapters/test_continuous_aggregates_migration.py
git commit -m "feat(backend): create hourly/daily/WHO-exceedance continuous aggregates"
```

---

## Task 4: `admin_users`, `admin_sessions`, `ingestion_runs` tables

**Files:**
- Create: `backend/alembic/versions/0004_create_admin_and_ingestion_tables.py`
- Test: `backend/tests/adapters/test_admin_ingestion_tables_migration.py`

**Interfaces:**
- Produces: three plain relational tables that Fase 2 (ingestion) and Fase 3 (admin auth API) will
  read/write — this task only proves they exist with the right columns/constraints, no application
  code touches them yet.

- [ ] **Step 1: Write the migration**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
alembic revision -m "create admin and ingestion tables"
```
Rename the generated file to
`backend/alembic/versions/0004_create_admin_and_ingestion_tables.py` and replace its content with:

```python
"""create admin and ingestion tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-17
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String, nullable=False, unique=True),
        sa.Column("password_hash", sa.String, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "admin_sessions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("admin_id", sa.Integer, sa.ForeignKey("admin_users.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "ingestion_runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("source", sa.String, nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String, nullable=False),
        sa.Column("records_ingested", sa.Integer, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("ingestion_runs")
    op.drop_table("admin_sessions")
    op.drop_table("admin_users")
```

- [ ] **Step 2: Apply the migration**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
alembic upgrade head
```
Expected: `Running upgrade 0003 -> 0004, create admin and ingestion tables`, no errors.

- [ ] **Step 3: Write the verification test**

`backend/tests/adapters/test_admin_ingestion_tables_migration.py`:
```python
import pytest
from sqlalchemy import text


@pytest.mark.parametrize("table_name", ["admin_users", "admin_sessions", "ingestion_runs"])
def test_table_exists(db_connection, table_name):
    row = db_connection.execute(
        text("SELECT to_regclass(:table_name)"),
        {"table_name": table_name},
    ).fetchone()

    assert row[0] == table_name


def test_admin_sessions_foreign_key_enforced(db_connection):
    with pytest.raises(Exception):
        db_connection.execute(
            text("""
                INSERT INTO admin_sessions (admin_id, expires_at)
                VALUES (999999, now() + interval '8 hours')
            """)
        )
        db_connection.commit()
    db_connection.rollback()
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pytest tests/adapters/test_admin_ingestion_tables_migration.py -v`
Expected: PASS — all four tests (three existence checks + one FK enforcement check).

- [ ] **Step 5: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add backend/alembic/versions/0004_create_admin_and_ingestion_tables.py \
        backend/tests/adapters/test_admin_ingestion_tables_migration.py
git commit -m "feat(backend): create admin_users, admin_sessions and ingestion_runs tables"
```

---

## Task 5: `PostgresSensorRepository` adapter

**Files:**
- Create: `backend/adapters/outbound/postgres/postgres_sensor_repository.py`
- Modify: `backend/infrastructure/dependencies.py`
- Test: `backend/tests/adapters/test_postgres_sensor_repository.py`

**Interfaces:**
- Consumes: `Sensor` (Fase 0), `SensorRepository` port (Fase 0), `SensorModel` (Task 1),
  `infrastructure.database.engine`/`SessionLocal` (Task 1).
- Produces: `PostgresSensorRepository`, a drop-in replacement for `InMemorySensorRepository` in the
  DI wiring — `ListSensors` and the `/sensors` HTTP route need no changes.

- [ ] **Step 1: Write the failing test**

`backend/tests/adapters/test_postgres_sensor_repository.py`:
```python
from adapters.outbound.postgres.postgres_sensor_repository import PostgresSensorRepository


def test_list_active_returns_only_active_sensors_from_db(db_session):
    from adapters.outbound.postgres.models import SensorModel

    db_session.add(
        SensorModel(
            code="INACTIVE1",
            sensor_index="99999",
            name="Test Inactive Sensor",
            municipio="Xapuri",
            active=False,
        )
    )
    db_session.flush()

    repository = PostgresSensorRepository(db_session)
    sensors = repository.list_active()

    codes = {s.code for s in sensors}
    assert "INACTIVE1" not in codes
    assert "RBR1" in codes
    assert "CZS1" in codes


def test_list_active_returns_domain_sensor_objects(db_session):
    repository = PostgresSensorRepository(db_session)

    sensors = repository.list_active()

    rbr1 = next(s for s in sensors if s.code == "RBR1")
    assert rbr1.name == "MPAC_RBR"
    assert rbr1.municipio == "Rio Branco"
    assert rbr1.active is True
    assert isinstance(rbr1.id, int)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pytest tests/adapters/test_postgres_sensor_repository.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named
'adapters.outbound.postgres.postgres_sensor_repository'`.

- [ ] **Step 3: Write the adapter**

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
            Sensor(id=row.id, code=row.code, name=row.name, municipio=row.municipio, active=row.active)
            for row in rows
        ]
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pytest tests/adapters/test_postgres_sensor_repository.py -v`
Expected: PASS — both tests.

- [ ] **Step 5: Wire the Postgres adapter into DI, replacing the in-memory fake**

Replace `backend/infrastructure/dependencies.py`'s content with:
```python
from sqlalchemy.orm import Session

from application.use_cases.list_sensors import ListSensors
from adapters.outbound.postgres.postgres_sensor_repository import PostgresSensorRepository
from infrastructure.database import SessionLocal


def get_db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def get_list_sensors_use_case(session: Session = None) -> ListSensors:
    if session is None:
        session = SessionLocal()
    return ListSensors(PostgresSensorRepository(session))
```

Then update `backend/adapters/inbound/http/sensors_router.py` to use FastAPI's `Depends` for the
session properly (the router's existing `Depends(get_list_sensors_use_case)` call pattern from Fase 0
needs the use case to receive a request-scoped session, not construct its own):

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from application.use_cases.list_sensors import ListSensors
from adapters.outbound.postgres.postgres_sensor_repository import PostgresSensorRepository
from infrastructure.dependencies import get_db_session

router = APIRouter()


def get_list_sensors_use_case(session: Session = Depends(get_db_session)) -> ListSensors:
    return ListSensors(PostgresSensorRepository(session))


@router.get("/sensors")
def get_sensors(use_case: ListSensors = Depends(get_list_sensors_use_case)) -> list[dict]:
    sensors = use_case.execute()
    return [
        {"id": s.id, "code": s.code, "name": s.name, "municipio": s.municipio}
        for s in sensors
    ]
```
(`get_list_sensors_use_case` moves into `sensors_router.py` itself, since it's a FastAPI dependency
tied to this one route, not shared wiring — `infrastructure/dependencies.py` now only exports the
generic `get_db_session` dependency.)

Delete the in-memory fake's seed-data import: confirm
`backend/adapters/outbound/memory/in_memory_sensor_repository.py` is no longer imported by any
`infrastructure/` or `adapters/inbound/` file (it's still used by Fase 0's
`tests/application/test_list_sensors.py`, which is correct — that test exists specifically to prove
the use case works with a fake port, and must keep doing so. Do not delete the file itself, only its
now-unused import from `dependencies.py`).

- [ ] **Step 6: Update the existing HTTP integration test for the new response**

`backend/tests/adapters/test_http_routes.py`'s `test_get_sensors_returns_seeded_active_sensors` test
(from Fase 0) currently asserts `len(body) == 2` and `body[0]["code"] == "RBR1"`. With Postgres now
the source (ordered by insertion, not alphabetically), confirm this still holds — read the current
file, and if the assertion needs a `sorted()` to stay order-independent, apply it:

```python
def test_get_sensors_returns_seeded_active_sensors():
    response = client.get("/sensors")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert {s["code"] for s in body} == {"RBR1", "CZS1"}
```
(Switched from `body[0]["code"] == "RBR1"` to a set comparison — the API contract was never "first
result is RBR1", and pinning to Postgres's incidental row order would make this test flaky.)

- [ ] **Step 7: Run the full backend suite**

Run: `pytest -v`
Expected: PASS — every test across all five tasks so far, including the updated HTTP test hitting the
now-Postgres-backed `/sensors` route through the full FastAPI `TestClient` stack.

- [ ] **Step 8: Manual smoke test through the running app**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
source .venv/bin/activate
uvicorn infrastructure.main:app --reload &
sleep 2
curl -s http://localhost:8000/sensors
kill %1
```
Expected: JSON array with the two seeded sensors, now served from Postgres instead of the Fase 0
in-memory list.

- [ ] **Step 9: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add backend/adapters/outbound/postgres/postgres_sensor_repository.py \
        backend/infrastructure/dependencies.py backend/adapters/inbound/http/sensors_router.py \
        backend/tests/adapters/test_postgres_sensor_repository.py \
        backend/tests/adapters/test_http_routes.py
git commit -m "feat(backend): replace in-memory sensor repository with PostgresSensorRepository"
```

---

## Task 6: CI runs migrations against a real Postgres service

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `backend/alembic.ini`, all four migrations from Tasks 1-4.
- Produces: a `backend` CI job that starts a real `timescale/timescaledb` service container,
  applies migrations, then runs the full test suite — the integration tests from Tasks 1-5 (which
  need a live Postgres) now actually run in CI instead of only locally.

- [ ] **Step 1: Read the current workflow**

Read `.github/workflows/ci.yml` (written in Fase 0's Task 6) before editing — the `frontend` job must
stay untouched, and the `backend` job's existing `checkout`/`setup-python`/`pip install` steps stay,
only gaining a `services:` block and one new step before `pytest -v`.

- [ ] **Step 2: Add the Postgres service and migration step to the `backend` job**

Edit `.github/workflows/ci.yml`'s `backend` job to match:
```yaml
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    services:
      postgres:
        image: timescale/timescaledb:2.17.2-pg16
        env:
          POSTGRES_USER: airquality_user
          POSTGRES_PASSWORD: devpassword
          POSTGRES_DB: airquality
        ports:
          - 5435:5432
        options: >-
          --health-cmd "pg_isready -U airquality_user -d airquality"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: alembic upgrade head
        env:
          DATABASE_URL: postgresql://airquality_user:devpassword@localhost:5435/airquality
      - run: pytest -v
        env:
          DATABASE_URL: postgresql://airquality_user:devpassword@localhost:5435/airquality
```
The `DATABASE_URL` env var overrides `Settings.database_url`'s default (pydantic-settings reads env
vars case-insensitively over the field default) — CI's Postgres service is reachable at
`localhost:5435` from the job's steps, matching the port convention Fase 0 established locally.

- [ ] **Step 3: Validate the YAML**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
```
Expected: no output (parses successfully), exit code 0.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run Alembic migrations against a real Postgres service before backend tests"
```

---

## Self-Review

**Spec coverage** (against the design spec's Fase 1 data-model section, scoped to 1a per the
controller's decomposition):
- Schema TimescaleDB (Alembic): Task 1 (scaffold), Tasks 1-4 (all four migrations).
- Hypertable `sensor_readings` with EPA-corrected generated column: Task 2.
- Continuous aggregates (`municipio_hourly_pm25`, `municipio_daily_pm25`, `who_exceedance_days`):
  Task 3.
- `admin_users`, `admin_sessions`, `ingestion_runs`: Task 4.
- Replacing the Fase 0 in-memory fake with a real Postgres-backed adapter: Task 5.
- CI running migrations + tests against a real Postgres service: Task 6.
- Historical data backfill (`day`/`hour`/`hour_up`/`aqmatrix`/`mun_days_up`,
  `sc_padata.tb_parealtimedata`) is explicitly Fase 1b, out of scope here per the controller's
  decision — not listed as a gap.

**Placeholder scan:** no TBD/TODO. The seed `sensor_index` values (`"25549"`/`"25550"`) in Task 1 are
flagged inline as placeholders standing in for real PurpleAir indices, which is accurate — Fase 1b
supplies the real ones, this task only needs two distinguishable seed rows to preserve Fase 0's
`GET /sensors` behavior.

**Type consistency:** `Sensor(id, code, name, municipio, active)` — same five fields used in Task 1's
`SensorModel`/migration column subset consumed by it, Task 5's `PostgresSensorRepository.list_active()
-> list[Sensor]`, and Task 5's tests. `SensorRepository.list_active()` signature is unchanged from
Fase 0 across every task. `db_connection`/`db_session`/`cleanup_sensor_readings` fixtures introduced
in Task 1 (with one addition in Task 2) are reused verbatim by Tasks 2, 3, and 4 — no redefinition or
drift.
