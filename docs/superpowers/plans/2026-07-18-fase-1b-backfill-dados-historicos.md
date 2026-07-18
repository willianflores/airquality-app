# Fase 1b — Backfill de Dados Históricos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the real historical PurpleAir raw readings (~33M rows) and the real sensor
dimension data (30 sensors) from the old `airquality-app` database backup into the new
`sensor_readings`/`sensors` schema built in Fase 1a, then recompute all continuous aggregates over
the full historical range — fixing a timezone bucketing bug discovered during planning before any
history-scale data lands in them.

**Architecture:** No application code changes. This is a one-time data operation: extract the two
relevant `COPY` blocks directly from the compressed `pg_dump` backup (streaming, no full staging
restore needed — the source dump's column lists for `sc_padata.tb_parealtimedata` and
`public.sensors` match the target schema's `sensor_readings`/`sensors` tables exactly), load them
into the already-running local Postgres via `psql`, then trigger a full-range
`refresh_continuous_aggregate` on the three views from Fase 1a.

**Tech Stack:** `awk`/`zcat` (streaming extraction, no new dependency), `psql` (bulk load via
`COPY ... FROM stdin`), Alembic (one new migration to fix aggregate bucketing timezone).

## Global Constraints

- **The source dump is read-only.** Every step in this plan only reads
  `/home/willianflores/backups/airquality-app/db_airquality_20260514_050651.sql.gz` — never write to
  it, never decompress it in place, never move or delete it.
- **Scope, confirmed with the user**: migrate ONLY `sc_padata.tb_parealtimedata` → `sensor_readings`
  (32,969,558 rows) and `public.sensors` → `sensors` (30 rows). Do NOT migrate `day`, `hour`,
  `hour_up`, `aqmatrix`, `mun_days_up`, or `un_days_up` — those are pandas-computed derived tables
  from the old pipeline containing synthetic non-municipio rows (`media`, `up_pm2_5`) mixed in with
  real município rows. The new architecture recomputes the equivalent metrics directly from
  `sensor_readings` via the continuous aggregates from Fase 1a, which is more correct and doesn't
  import that legacy artifact.
- **Timezone**: raw `time_stamp` values are correctly stored as UTC (`timestamptz`, confirmed via
  sample rows showing explicit `+00` offset, consistent with the PurpleAir API's own UTC
  convention) — `sensor_readings` needs no timezone change. The OLD app's day/hour aggregation
  (`purpleairFunctions.py`) converted to `America/Lima` (UTC-5, same offset as Acre) before
  bucketing — so user-facing daily/hourly boundaries were always local-calendar, not UTC-calendar.
  Fase 1a's continuous aggregates (migration `0003`) bucket in UTC with no timezone parameter — this
  plan's Task 1 fixes that by recreating them with `time_bucket(..., time_stamp, 'America/Rio_Branco')`
  before any historical data is loaded, so the fix happens once instead of needing a second full
  re-aggregation later.
- **Row-count verification is mandatory, not optional**: every backfill task must confirm the exact
  row count loaded matches the dump's known count (`sensors`: 30, `sensor_readings`: 32,969,558) —
  established once during planning via a full scan of the dump (`awk` counting lines inside each
  `COPY ... FROM stdin; ... \.` block) and treated as ground truth for this plan.
- **Continuous aggregate refresh calls must run outside any transaction** (`CALL
  refresh_continuous_aggregate(...)` is a procedure that errors inside a transaction block — this was
  independently discovered and fixed in Fase 1a's Task 3). Run refresh calls via plain
  `psql -c "CALL ..."` (psql's default autocommit-per-statement mode), never inside an explicit
  `BEGIN`/`COMMIT` or a Python `with connection.begin():` block.
- Extracted intermediate files (the raw `COPY` blocks pulled out of the dump) are scratch artifacts —
  write them to `/home/willianflores/backups/airquality-app/staging/` (outside any git repo, created
  fresh by this plan), not into `airquality-js-app/` — a 32.9M-row extract is several GB of text and
  must never risk being committed.
- Postgres (`infra/docker-compose.yml`'s `postgres` service, `timescale/timescaledb:2.17.2-pg16`,
  `localhost:5435`) must be running throughout this plan, with Fase 1a's schema
  (migrations `0001`-`0004`) already applied — it is, as of Fase 1a's completion.

---

## Task 1: Fix continuous aggregates to bucket in local time (`America/Rio_Branco`)

**Files:**
- Create: `backend/alembic/versions/0005_fix_continuous_aggregate_timezone.py`
- Test: `backend/tests/adapters/test_continuous_aggregate_timezone.py`

**Interfaces:**
- Consumes: `sensor_readings.pm2_5_corrected` (Fase 1a, unchanged).
- Produces: the same three view names (`municipio_hourly_pm25`, `municipio_daily_pm25`,
  `who_exceedance_days`) with an identical column shape to Fase 1a's version — only the bucket
  boundary semantics change (local calendar day/hour instead of UTC). No consumer outside this
  migration exists yet, so there's nothing else to update.

- [ ] **Step 1: Write the migration**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
source .venv/bin/activate
alembic revision -m "fix continuous aggregate timezone"
```
Rename the generated file to
`backend/alembic/versions/0005_fix_continuous_aggregate_timezone.py` and replace its content with:

```python
"""fix continuous aggregate timezone

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-18
"""
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

LOCAL_TZ = "America/Rio_Branco"


def upgrade() -> None:
    op.execute("SELECT remove_continuous_aggregate_policy('who_exceedance_days')")
    op.execute("SELECT remove_continuous_aggregate_policy('municipio_daily_pm25')")
    op.execute("SELECT remove_continuous_aggregate_policy('municipio_hourly_pm25')")
    op.execute("DROP MATERIALIZED VIEW who_exceedance_days")
    op.execute("DROP MATERIALIZED VIEW municipio_daily_pm25")
    op.execute("DROP MATERIALIZED VIEW municipio_hourly_pm25")

    op.execute(f"""
        CREATE MATERIALIZED VIEW municipio_hourly_pm25
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 hour', time_stamp, '{LOCAL_TZ}') AS bucket,
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

    op.execute(f"""
        CREATE MATERIALIZED VIEW municipio_daily_pm25
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 day', time_stamp, '{LOCAL_TZ}') AS bucket,
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

    op.execute(f"""
        CREATE MATERIALIZED VIEW who_exceedance_days
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 day', time_stamp, '{LOCAL_TZ}') AS bucket,
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
    op.execute("SELECT remove_continuous_aggregate_policy('who_exceedance_days')")
    op.execute("SELECT remove_continuous_aggregate_policy('municipio_daily_pm25')")
    op.execute("SELECT remove_continuous_aggregate_policy('municipio_hourly_pm25')")
    op.execute("DROP MATERIALIZED VIEW who_exceedance_days")
    op.execute("DROP MATERIALIZED VIEW municipio_daily_pm25")
    op.execute("DROP MATERIALIZED VIEW municipio_hourly_pm25")

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
```

- [ ] **Step 2: Apply the migration**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
alembic upgrade head
```
Expected: `Running upgrade 0004 -> 0005, fix continuous aggregate timezone`, no errors.

- [ ] **Step 3: Write the verification test**

`backend/tests/adapters/test_continuous_aggregate_timezone.py`:
```python
import pytest
from sqlalchemy import text


@pytest.mark.parametrize(
    "view_name",
    ["municipio_hourly_pm25", "municipio_daily_pm25", "who_exceedance_days"],
)
def test_continuous_aggregate_buckets_in_local_time(db_connection, view_name):
    row = db_connection.execute(
        text("""
            SELECT view_definition FROM timescaledb_information.continuous_aggregates
            WHERE view_name = :view_name
        """),
        {"view_name": view_name},
    ).fetchone()

    assert row is not None
    assert "America/Rio_Branco" in row[0]


def test_municipio_daily_pm25_bucket_reflects_local_midnight(db_connection):
    # 2026-01-15 02:00 UTC is 2026-01-14 21:00 in America/Rio_Branco (UTC-5) —
    # it must land in the LOCAL day (2026-01-14), not the UTC day (2026-01-15).
    db_connection.execute(
        text("""
            INSERT INTO sensor_readings (time_stamp, sensor_index, pm2_5_atm_a, pm2_5_atm_b, mun_name)
            VALUES ('2026-01-15 02:00:00+00', 25549, 40.0, 44.0, 'Rio Branco')
        """)
    )
    db_connection.commit()

    with db_connection.execution_options(isolation_level="AUTOCOMMIT"):
        pass  # placeholder to keep the fixture's connection API consistent; the CALL below
              # uses a dedicated autocommit connection instead, per the plan's global constraint

    from infrastructure.settings import settings
    from sqlalchemy import create_engine

    autocommit_engine = create_engine(settings.database_url).execution_options(
        isolation_level="AUTOCOMMIT"
    )
    with autocommit_engine.connect() as autocommit_conn:
        autocommit_conn.execute(
            text("CALL refresh_continuous_aggregate('municipio_daily_pm25', NULL, NULL)")
        )

    row = db_connection.execute(
        text("""
            SELECT bucket FROM municipio_daily_pm25
            WHERE municipio = 'Rio Branco' AND pm2_5_avg = 20.34
        """)
    ).fetchone()

    assert row is not None
    # bucket is stored as a timestamptz; its UTC-rendered date must be 2026-01-14T05:00:00+00
    # (midnight local time in UTC-5), not 2026-01-15.
    assert str(row[0]).startswith("2026-01-14")
```
This test lives in `tests/adapters/`, so the `cleanup_sensor_readings` autouse fixture (relocated
there in Fase 1a's final review fix) cleans up the inserted row automatically afterward.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pytest tests/adapters/test_continuous_aggregate_timezone.py -v`
Expected: PASS — all four tests (three view-definition checks + one bucket-boundary check).

- [ ] **Step 5: Run the full backend suite**

Run: `pytest -v`
Expected: PASS — every test from Fase 1a plus this task's new ones.

- [ ] **Step 6: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add backend/alembic/versions/0005_fix_continuous_aggregate_timezone.py \
        backend/tests/adapters/test_continuous_aggregate_timezone.py
git commit -m "fix(backend): bucket continuous aggregates in America/Rio_Branco, not UTC"
```

---

## Task 2: Extraction tooling — pull a table's `COPY` block out of the compressed dump

**Files:**
- Create: `scripts/extract_copy_block.sh`

**Interfaces:**
- Produces: a reusable shell script, `scripts/extract_copy_block.sh SOURCE_DUMP.gz SOURCE_TABLE
  TARGET_TABLE OUTPUT.sql`, that Tasks 3 and 4 both call. Writes a self-contained SQL file
  containing one rewritten `COPY <target_table> (...) FROM stdin; <data rows> \.` block, loadable
  directly via `psql -f`.

- [ ] **Step 1: Create the staging directory**

Run:
```bash
mkdir -p /home/willianflores/backups/airquality-app/staging
```

- [ ] **Step 2: Write the script**

`scripts/extract_copy_block.sh` (create `scripts/` at the monorepo root if it doesn't exist yet):
```bash
#!/usr/bin/env bash
# Extracts one table's COPY block from a gzipped pg_dump plain-SQL file, rewriting the
# COPY statement's target table name (column list is left untouched — callers are
# responsible for ensuring the source and target column lists actually match).
#
# Usage: extract_copy_block.sh SOURCE_DUMP.gz SOURCE_TABLE TARGET_TABLE OUTPUT.sql
set -euo pipefail

if [ $# -ne 4 ]; then
  echo "usage: extract_copy_block.sh SOURCE_DUMP.gz SOURCE_TABLE TARGET_TABLE OUTPUT.sql" >&2
  exit 2
fi

dump=$1
source_table=$2
target_table=$3
out=$4

zcat "$dump" | awk -v src="$source_table" -v tgt="$target_table" '
  BEGIN { pattern = "^COPY " src " \\(" }
  $0 ~ pattern && !found {
    sub("COPY " src " ", "COPY " tgt " ")
    print
    found = 1
    next
  }
  found && /^\\\.$/ { print; exit }
  found { print }
' > "$out"

if [ ! -s "$out" ]; then
  echo "no COPY block found for table '${source_table}' in ${dump}" >&2
  exit 3
fi

echo "wrote ${out}: $(wc -l < "$out") lines"
```

Run:
```bash
chmod +x /home/willianflores/localhost/airquality-js-app/scripts/extract_copy_block.sh
```

- [ ] **Step 3: Verify it against the small `sensors` table**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app
./scripts/extract_copy_block.sh \
  /home/willianflores/backups/airquality-app/db_airquality_20260514_050651.sql.gz \
  "public.sensors" \
  sensors \
  /home/willianflores/backups/airquality-app/staging/sensors.sql
head -3 /home/willianflores/backups/airquality-app/staging/sensors.sql
tail -3 /home/willianflores/backups/airquality-app/staging/sensors.sql
```
Expected: the script reports `wrote .../sensors.sql: 33 lines` (1 `COPY` header line + 30 data rows
+ 1 `\.` terminator + typically 1 trailing blank line from pg_dump's formatting — verify the actual
count, it should be close to 32-33), the header line reads
`COPY sensors (id, code, sensor_index, name, municipio, institution, location, active, latitude, longitude, created_at, updated_at) FROM stdin;`,
and the last data line is followed by a bare `\.`.

- [ ] **Step 4: Commit**

```bash
git add scripts/extract_copy_block.sh
git commit -m "chore(scripts): add pg_dump COPY-block extraction tool for Fase 1b backfill"
```

---

## Task 3: Backfill `sensors` (30 real sensors, replacing Fase 0/1a placeholders)

**Files:**
- None created — this is a data operation against the already-migrated `sensors` table schema
  (Task 1's migrations aren't touched; no new migration file).
- Verification: ad-hoc SQL run via `psql`, documented in this task's steps (no pytest — this is a
  one-time data load, not application behavior to regression-test).

**Interfaces:**
- Consumes: `scripts/extract_copy_block.sh` (Task 2).
- Produces: 30 real rows in `sensors`, replacing the 2 placeholder seed rows
  (`RBR1`/`CZS1`) from Fase 1a's migration `0001`. `sensors_id_seq` ends up at the same value the
  old database had (`30`), so any future `INSERT ... DEFAULT` continues from `31`, matching the old
  system's numbering instead of colliding with it.

- [ ] **Step 1: Extract the `sensors` COPY block**

(Already done in Task 2, Step 3 — reuse `/home/willianflores/backups/airquality-app/staging/sensors.sql`.
If it's missing, re-run Task 2's Step 3 command.)

- [ ] **Step 2: Truncate the placeholder seed data**

Run:
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -c "TRUNCATE sensors RESTART IDENTITY"
```
Expected: `TRUNCATE TABLE`. This removes Fase 1a's two placeholder rows (`RBR1`, `CZS1` with fake
`sensor_index` values `"25549"`/`"25550"`) and resets the id sequence to start at 1 again.

- [ ] **Step 3: Load the real 30 sensors**

Run:
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -f /home/willianflores/backups/airquality-app/staging/sensors.sql
```
Expected: `COPY 30`.

- [ ] **Step 4: Restore the id sequence to match the old database**

Run:
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -c "SELECT setval('sensors_id_seq', (SELECT MAX(id) FROM sensors))"
```
Expected: returns `30` (the `setval` result). This must run after the `COPY`, since explicit-id
inserts don't advance the sequence on their own — skipping this step would make the next
sequence-defaulted insert collide with an existing id.

- [ ] **Step 5: Verify the row count and spot-check known data**

Run:
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -c "SELECT count(*) FROM sensors" \
  -c "SELECT code, sensor_index, municipio, active FROM sensors ORDER BY code LIMIT 5"
```
Expected: `count` is exactly `30`; the sample rows show real PurpleAir `sensor_index` values (numeric
strings, not the Fase 1a placeholders `"25549"`/`"25550"`) and real município names.

- [ ] **Step 6: Manual smoke test through the running app**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
source .venv/bin/activate
uvicorn infrastructure.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/sensors | python3 -m json.tool | head -20
kill %1
```
Expected: JSON array of 30 sensors (only the 5-field domain projection —
`id, code, name, municipio` — per Fase 1a's YAGNI constraint on the `Sensor` entity), no trace of
`RBR1`/`CZS1` placeholders unless one of the real 30 sensors happens to share that code.

- [ ] **Step 7: Record the operation (no code diff, but note it in the plan's tracking)**

This task has no git-trackable file changes (no new migration, no new script). Skip the commit step
— proceed directly to Task 4. (If a reviewer asks "what got committed for Task 3," the answer is
correctly "nothing — it's a verified data operation against already-migrated schema," not a gap.)

---

## Task 4: Backfill `sensor_readings` (32,969,558 raw readings)

**Files:**
- None created — data operation.

**Interfaces:**
- Consumes: `scripts/extract_copy_block.sh` (Task 2).
- Produces: 32,969,558 rows in `sensor_readings`, each with `pm2_5_corrected` computed automatically
  by the generated column (Fase 1a, migration `0002`) at insert time.

- [ ] **Step 1: Extract the `sensor_readings` COPY block**

This is the large extraction (~33M rows, likely several GB of text) — run it as a background task
since it involves a full scan of the 11GB decompressed dump:

Run (in background — do not wait synchronously if your tooling supports backgrounding a long shell
command; otherwise budget several minutes):
```bash
cd /home/willianflores/localhost/airquality-js-app
./scripts/extract_copy_block.sh \
  /home/willianflores/backups/airquality-app/db_airquality_20260514_050651.sql.gz \
  "sc_padata.tb_parealtimedata" \
  sensor_readings \
  /home/willianflores/backups/airquality-app/staging/sensor_readings.sql
```
Expected: `wrote .../sensor_readings.sql: 32969560 lines` (32,969,558 data rows + 1 header + 1
terminator). Verify the file size is reasonable (several GB):
```bash
ls -lh /home/willianflores/backups/airquality-app/staging/sensor_readings.sql
```

- [ ] **Step 2: Load into `sensor_readings`**

Run (also budget significant time for 33M rows into a hypertable — background this if your tooling
supports it, and poll for completion rather than assuming a fixed duration):
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -f /home/willianflores/backups/airquality-app/staging/sensor_readings.sql
```
Expected: `COPY 32969558`.

- [ ] **Step 3: Verify the exact row count**

Run:
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -c "SELECT count(*) FROM sensor_readings"
```
Expected: exactly `32969558` — this must match the dump's known count precisely. If it doesn't,
STOP and investigate before proceeding to Task 5 (do not silently continue with a partial load).

- [ ] **Step 4: Sanity-check the date range and generated column on real data**

Run:
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -c "SELECT min(time_stamp), max(time_stamp) FROM sensor_readings" \
  -c "SELECT time_stamp, sensor_index, pm2_5_atm_a, pm2_5_atm_b, pm2_5_corrected, mun_name FROM sensor_readings ORDER BY time_stamp LIMIT 3"
```
Expected: a plausible multi-year date range (the dump's earliest sample rows were from 2019); the
three sample rows' `pm2_5_corrected` values match hand-computing the EPA formula
(`0.5*pm2_5_atm_x - 0.66`, floored at 0, discarded if `>= 1000`, averaged across channels) from
their own `pm2_5_atm_a`/`pm2_5_atm_b` — this is the same formula independently verified against the
legacy Python source during Fase 1a's Task 2 review, now being spot-checked against real historical
data instead of synthetic test rows.

- [ ] **Step 5: Confirm the hypertable's chunk count grew (sanity check on Timescale's own bookkeeping)**

Run:
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -c "SELECT count(*) FROM timescaledb_information.chunks WHERE hypertable_name = 'sensor_readings'"
```
Expected: more than 1 chunk (Fase 1a's empty hypertable had 0; a multi-year backfill should span many
chunks, since `create_hypertable` defaults to roughly weekly chunk intervals for a `timestamptz`
partition column). This isn't a strict pass/fail threshold, just confirms the data landed as
partitioned hypertable rows, not into some unpartitioned fallback state.

---

## Task 5: Full-range continuous aggregate refresh + verification

**Files:**
- None created — data operation.

**Interfaces:**
- Consumes: `sensor_readings` (now backfilled, Task 4) and the three continuous aggregates with
  corrected local-time bucketing (Task 1).
- Produces: fully populated `municipio_hourly_pm25`, `municipio_daily_pm25`, `who_exceedance_days`
  covering the entire historical range — previously they only had the (empty, since
  `sensor_readings` was empty until Task 4) rolling window their policies define.

- [ ] **Step 1: Refresh each continuous aggregate over its full range**

Each call must run via plain `psql -c` (autocommit), never inside an explicit transaction — run each
as its own `psql` invocation, not batched into one `-c "CALL ...; CALL ...; CALL ..."` (a single
`-c` with multiple statements separated by `;` still runs as one implicit transaction in some psql
configurations; keep them fully separate to guarantee autocommit semantics per call). Budget
significant time for the hourly aggregate especially, since it computes the most buckets — background
these if your tooling supports it:

```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -c "CALL refresh_continuous_aggregate('municipio_hourly_pm25', NULL, NULL)"
```
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -c "CALL refresh_continuous_aggregate('municipio_daily_pm25', NULL, NULL)"
```
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -c "CALL refresh_continuous_aggregate('who_exceedance_days', NULL, NULL)"
```
Expected: each `CALL` completes with no error (no output on success is normal for a `CALL` with no
return value).

- [ ] **Step 2: Verify each aggregate has data across the full range**

Run:
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" \
  -c "SELECT count(*), min(bucket), max(bucket) FROM municipio_daily_pm25" \
  -c "SELECT count(*), min(bucket), max(bucket) FROM municipio_hourly_pm25" \
  -c "SELECT count(*), min(bucket), max(bucket) FROM who_exceedance_days"
```
Expected: each `count` is well above zero (roughly `municipios × days_in_range` for the daily views,
`municipios × hours_in_range` for the hourly view — exact numbers depend on the real date range and
how many municípios had active sensors when, so don't hardcode an exact expected count — just confirm
it's non-trivial and `min(bucket)`/`max(bucket)` span the same range as `sensor_readings`'s
`min(time_stamp)`/`max(time_stamp)` from Task 4, Step 4).

- [ ] **Step 3: Cross-check one bucket's computed value against a manual raw-SQL aggregate**

Pick one município and one recent day from the range confirmed in Step 2 (substitute real values from
your own query output — do not reuse a hardcoded example date, since it must actually exist in the
loaded data):
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" -c "
  SELECT municipio, bucket, pm2_5_avg FROM municipio_daily_pm25
  WHERE municipio = 'Rio Branco'
  ORDER BY bucket DESC
  LIMIT 1
"
```
Take the `bucket` value from that result and run the equivalent manual aggregate directly against
`sensor_readings` for the same município and the same local-time day boundary:
```bash
psql "postgresql://airquality_user:devpassword@localhost:5435/airquality" -c "
  SELECT avg(pm2_5_corrected) FROM sensor_readings
  WHERE mun_name = 'Rio Branco'
    AND time_bucket('1 day', time_stamp, 'America/Rio_Branco') = '<bucket value from previous query>'
"
```
Expected: the two `avg` values match exactly (or within floating-point rounding). This validates the
continuous aggregate mechanism itself is computing what it claims to, independent of trusting the old
app's `day`/`hour` tables (which this plan deliberately does not migrate or compare against, per the
Global Constraints).

- [ ] **Step 4: Clean up the staging extraction files**

Run:
```bash
rm -rf /home/willianflores/backups/airquality-app/staging
```
Expected: the multi-GB intermediate `sensor_readings.sql` and small `sensors.sql` extraction files
are removed, reclaiming disk space. The original compressed dump
(`db_airquality_20260514_050651.sql.gz`) is untouched — confirm with `ls -lh
/home/willianflores/backups/airquality-app/` that it's still present at its original size.

- [ ] **Step 5: Final report**

No git commit for this task (pure data operation + verification, same as Tasks 3-4). Summarize in
the task report: final row counts (`sensors`: 30, `sensor_readings`: 32969558), aggregate row counts
from Step 2, and the cross-check result from Step 3.

---

## Self-Review

**Spec coverage** (against the user-confirmed Fase 1b scope):
- Timezone fix before backfill: Task 1.
- Backfill raw `sc_padata.tb_parealtimedata` → `sensor_readings`: Task 4 (extraction tooling in
  Task 2).
- Backfill real `sensors`: Task 3.
- Continuous aggregates recomputed over full history, replacing the old derived tables
  (`day`/`hour`/`hour_up`/`aqmatrix`/`mun_days_up`/`un_days_up`), which are explicitly NOT migrated
  per the user's confirmed decision: Task 5.
- Source dump treated as read-only throughout: every task's commands only read
  `db_airquality_20260514_050651.sql.gz`, and Task 5's cleanup step explicitly verifies it's still
  present and untouched afterward.

**Placeholder scan:** no TBD/TODO. Task 5's cross-check step deliberately doesn't hardcode a specific
date/value (real backfilled data wasn't known at plan-writing time) — it's written as "query for a
real value, then verify against it," which is a genuine verification procedure, not a vague
placeholder instruction (it says exactly what to query and what relationship must hold).

**Type consistency:** the extraction script's interface (`SOURCE_DUMP SOURCE_TABLE TARGET_TABLE
OUTPUT.sql`) is used identically in Task 2's Step 3 (small table) and Task 4's Step 1 (large table) —
same four positional arguments, same expected `wrote <path>: <N> lines` output contract. Row-count
expectations (`sensors`: 30, `sensor_readings`: 32969558) are stated once in Global Constraints and
referenced consistently in Tasks 2-4's verification steps, not re-derived differently in each place.
