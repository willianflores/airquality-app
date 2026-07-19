# Fase 4 — Frontend Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir as 5 páginas públicas do frontend (home, município, geral, sensores,
publicações) consumindo a API da Fase 3, com roteamento, mapa, gráficos e heatmap funcionais.

**Architecture:** SPA React + Vite, roteamento client-side, dados via React Query, camadas
`domain/application/infrastructure/ui` espelhando o padrão hexagonal já usado no backend. Visual
é Tailwind utilitário funcional — refino via Figma é fase futura, não esta.

**Tech Stack:** React 19, `react-router-dom`, `@tanstack/react-query`, `recharts`, `react-leaflet`
+ `leaflet` (tiles OpenStreetMap, sem chave de API), Vitest + Testing Library (já configurado).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-18-fase-4-frontend-core-design.md`
- Nenhuma decisão visual final (paleta/tipografia/componentes de design system) — Tailwind
  utilitário funcional, mobile-first, refino fica pra sub-fase futura via Figma.
- Heatmap mês×hora é grade CSS Grid custom — **não** usa `recharts` (sem tipo heatmap nativo) nem
  reintroduz `echarts` (contradiz a consolidação de lib já decidida na spec mestre).
- Cor por faixa PM2.5 tem fonte única (`colorForPm25` em `AqScaleTable.tsx`, Task 5) — reusada
  pelo mapa (Task 6) e pela lista de sensores (Task 11), nunca duplicada.
- Mapa colore pin por leitura do **sensor individual** (`/readings/latest-by-sensor`, exceção
  deliberada à regra "sempre agregado por município" da Fase 3, decisão do usuário) — junção
  entre `/sensors` e `/readings/latest-by-sensor` é por `sensor_index` (por isso o `/sensors`
  precisa passar a expor esse campo, Task 1).
- Publicações: conteúdo copiado do app antigo (`reports.json` + assets de imagem/PDF), sem
  integração com backend novo.
- Sem testes E2E nesta fase.

---

### Task 1: Backend — `Sensor` ganha `latitude`/`longitude`, `/sensors` expõe `sensor_index`

**Files:**
- Modify: `backend/domain/entities/sensor.py`
- Modify: `backend/adapters/outbound/postgres/postgres_sensor_repository.py`
- Modify: `backend/adapters/inbound/http/sensors_router.py`
- Modify: `backend/tests/adapters/test_postgres_sensor_repository.py`
- Modify: `backend/tests/adapters/test_http_routes.py`

**Interfaces:**
- Produces: `Sensor(id, code, sensor_index, name, municipio, active, latitude, longitude)` — 8
  campos agora. `GET /sensors` retorna `sensor_index`/`latitude`/`longitude` além dos campos já
  existentes. Usado pelo frontend (Task 4) pra correlacionar sensor com leitura mais recente
  (`sensor_index` é a chave compartilhada com `/readings/latest-by-sensor`, Task 2).

- [ ] **Step 1: Atualizar os testes existentes (RED)**

Em `backend/tests/adapters/test_postgres_sensor_repository.py`, adicionar ao final de
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
    assert rbr1.latitude is None  # seed da migration 0001 não tem coordenadas
    assert rbr1.longitude is None


def test_list_active_returns_coordinates_when_present(db_session):
    from adapters.outbound.postgres.models import SensorModel

    db_session.add(
        SensorModel(
            code="COORD1",
            sensor_index="88888",
            name="Sensor Com Coordenada",
            municipio="Rio Branco",
            active=True,
            latitude=-9.97499,
            longitude=-67.8243,
        )
    )
    db_session.flush()

    repository = PostgresSensorRepository(db_session)
    sensors = repository.list_active()

    coord1 = next(s for s in sensors if s.code == "COORD1")
    assert coord1.latitude == -9.97499
    assert coord1.longitude == -67.8243
```

In `backend/tests/adapters/test_http_routes.py`, replace `test_get_sensors_returns_seeded_active_sensors`:

```python
def test_get_sensors_returns_seeded_active_sensors():
    response = client.get("/sensors")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert {s["code"] for s in body} == {"RBR1", "CZS1"}
    rbr1 = next(s for s in body if s["code"] == "RBR1")
    assert rbr1["sensor_index"] == 25549
    assert rbr1["latitude"] is None
    assert rbr1["longitude"] is None
```

- [ ] **Step 2: Rodar os testes, confirmar que falham**

Run: `cd backend && pytest tests/adapters/test_postgres_sensor_repository.py tests/adapters/test_http_routes.py -v`
Expected: FAIL — `AttributeError: 'Sensor' object has no attribute 'latitude'` e
`KeyError: 'sensor_index'` no corpo da resposta HTTP.

- [ ] **Step 3: Adicionar os campos em `Sensor`**

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
    latitude: float | None
    longitude: float | None
```

- [ ] **Step 4: Popular os campos no adapter Postgres**

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
                latitude=row.latitude,
                longitude=row.longitude,
            )
            for row in rows
        ]
```

- [ ] **Step 5: Expor os campos na rota**

`backend/adapters/inbound/http/sensors_router.py`:

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
        {
            "id": s.id,
            "code": s.code,
            "sensor_index": s.sensor_index,
            "name": s.name,
            "municipio": s.municipio,
            "latitude": s.latitude,
            "longitude": s.longitude,
        }
        for s in sensors
    ]
```

- [ ] **Step 6: Rodar os testes, confirmar que passam**

Run: `cd backend && pytest tests/adapters/test_postgres_sensor_repository.py tests/adapters/test_http_routes.py -v`
Expected: PASS (5 testes — 3 do repositório + 2 do HTTP)

- [ ] **Step 7: Rodar a suíte completa**

Run: `cd backend && pytest -v`
Expected: todos os testes passam (87 anteriores + 1 novo = 88).

- [ ] **Step 8: Commit**

```bash
cd backend
git add domain/entities/sensor.py adapters/outbound/postgres/postgres_sensor_repository.py \
  adapters/inbound/http/sensors_router.py tests/adapters/test_postgres_sensor_repository.py \
  tests/adapters/test_http_routes.py
git commit -m "feat(sensors): expõe latitude/longitude/sensor_index em /sensors"
```

---

### Task 2: Backend — `GET /readings/latest-by-sensor`

**Files:**
- Create: `backend/domain/entities/sensor_latest_reading.py`
- Create: `backend/application/ports/latest_sensor_reading_repository.py`
- Create: `backend/adapters/outbound/postgres/postgres_latest_sensor_reading_repository.py`
- Create: `backend/application/use_cases/get_latest_sensor_readings.py`
- Modify: `backend/adapters/inbound/http/readings_router.py`
- Test: `backend/tests/adapters/test_postgres_latest_sensor_reading_repository.py`
- Test: `backend/tests/adapters/test_readings_router.py`

**Interfaces:**
- Produces: `SensorLatestReading(sensor_index, time_stamp, pm2_5_corrected)`,
  `GET /readings/latest-by-sensor` → `[{sensor_index, time_stamp, pm2_5_corrected}]`. Usado pelo
  frontend (mapa e lista de sensores) pra colorir por status individual do sensor.

- [ ] **Step 1: Escrever o teste do repositório (RED)**

`backend/tests/adapters/test_postgres_latest_sensor_reading_repository.py`:

```python
from datetime import datetime, timezone

from sqlalchemy import text

from adapters.outbound.postgres.postgres_latest_sensor_reading_repository import (
    PostgresLatestSensorReadingRepository,
)


def test_list_latest_returns_most_recent_row_per_sensor(db_session, db_connection):
    db_connection.execute(
        text("""
            INSERT INTO sensor_readings (time_stamp, sensor_index, pm2_5_atm_a, pm2_5_atm_b, mun_name)
            VALUES
                ('2026-01-01T10:00:00Z', 25549, 40.0, 44.0, 'Rio Branco'),
                ('2026-01-01T11:00:00Z', 25549, 10.0, 12.0, 'Rio Branco'),
                ('2026-01-01T10:00:00Z', 25550, 2.0, 2.0, 'Cruzeiro do Sul')
        """)
    )
    db_connection.commit()

    repository = PostgresLatestSensorReadingRepository(db_session)
    readings = repository.list_latest()

    by_sensor = {r.sensor_index: r for r in readings}
    assert by_sensor[25549].time_stamp == datetime(2026, 1, 1, 11, 0, tzinfo=timezone.utc)
    assert by_sensor[25549].pm2_5_corrected == 4.34
    assert by_sensor[25550].pm2_5_corrected == 0.34
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd backend && pytest tests/adapters/test_postgres_latest_sensor_reading_repository.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Criar a entidade de domínio**

`backend/domain/entities/sensor_latest_reading.py`:

```python
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class SensorLatestReading:
    sensor_index: int
    time_stamp: datetime
    pm2_5_corrected: float | None
```

- [ ] **Step 4: Criar o port**

`backend/application/ports/latest_sensor_reading_repository.py`:

```python
from abc import ABC, abstractmethod

from domain.entities.sensor_latest_reading import SensorLatestReading


class LatestSensorReadingRepository(ABC):
    @abstractmethod
    def list_latest(self) -> list[SensorLatestReading]:
        raise NotImplementedError
```

- [ ] **Step 5: Criar o adapter Postgres**

`backend/adapters/outbound/postgres/postgres_latest_sensor_reading_repository.py`:

```python
from sqlalchemy import text
from sqlalchemy.orm import Session

from application.ports.latest_sensor_reading_repository import LatestSensorReadingRepository
from domain.entities.sensor_latest_reading import SensorLatestReading


class PostgresLatestSensorReadingRepository(LatestSensorReadingRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_latest(self) -> list[SensorLatestReading]:
        rows = self._session.execute(
            text("""
                SELECT DISTINCT ON (sensor_index) sensor_index, time_stamp, pm2_5_corrected
                FROM sensor_readings
                ORDER BY sensor_index, time_stamp DESC
            """)
        ).all()
        return [
            SensorLatestReading(
                sensor_index=r.sensor_index,
                time_stamp=r.time_stamp,
                pm2_5_corrected=r.pm2_5_corrected,
            )
            for r in rows
        ]
```

- [ ] **Step 6: Rodar o teste do repositório, confirmar que passa**

Run: `cd backend && pytest tests/adapters/test_postgres_latest_sensor_reading_repository.py -v`
Expected: PASS

- [ ] **Step 7: Criar o use case**

`backend/application/use_cases/get_latest_sensor_readings.py`:

```python
from application.ports.latest_sensor_reading_repository import LatestSensorReadingRepository
from domain.entities.sensor_latest_reading import SensorLatestReading


class GetLatestSensorReadings:
    def __init__(self, repository: LatestSensorReadingRepository) -> None:
        self._repository = repository

    def execute(self) -> list[SensorLatestReading]:
        return self._repository.list_latest()
```

- [ ] **Step 8: Escrever o teste do router (RED)**

Adicionar ao final de `backend/tests/adapters/test_readings_router.py`:

```python
def test_get_latest_by_sensor_returns_seeded_readings(client, db_connection):
    db_connection.execute(
        text("""
            INSERT INTO sensor_readings (time_stamp, sensor_index, pm2_5_atm_a, pm2_5_atm_b, mun_name)
            VALUES ('2026-01-01T10:00:00Z', 25549, 40.0, 44.0, 'Rio Branco')
        """)
    )
    db_connection.commit()

    response = client.get("/readings/latest-by-sensor")

    assert response.status_code == 200
    body = response.json()
    row = next(r for r in body if r["sensor_index"] == 25549)
    assert row["pm2_5_corrected"] == 20.34
```

(`text` já está importado no topo do arquivo, junto com o resto — confira antes de adicionar de novo.)

- [ ] **Step 9: Rodar, confirmar que falha**

Run: `cd backend && pytest tests/adapters/test_readings_router.py::test_get_latest_by_sensor_returns_seeded_readings -v`
Expected: FAIL — `404`

- [ ] **Step 10: Adicionar a rota**

`backend/adapters/inbound/http/readings_router.py` — adicionar ao final do arquivo (mantendo
`/current` e `/history` intactos):

```python
from adapters.outbound.postgres.postgres_latest_sensor_reading_repository import (
    PostgresLatestSensorReadingRepository,
)
from application.use_cases.get_latest_sensor_readings import GetLatestSensorReadings


def get_latest_sensor_readings_use_case(
    session: Session = Depends(get_db_session),
) -> GetLatestSensorReadings:
    return GetLatestSensorReadings(PostgresLatestSensorReadingRepository(session))


@router.get("/latest-by-sensor")
def get_latest_by_sensor(
    use_case: GetLatestSensorReadings = Depends(get_latest_sensor_readings_use_case),
) -> list[dict]:
    readings = use_case.execute()
    return [
        {
            "sensor_index": r.sensor_index,
            "time_stamp": r.time_stamp,
            "pm2_5_corrected": r.pm2_5_corrected,
        }
        for r in readings
    ]
```

(os imports novos vão junto com os já existentes no topo do arquivo — não duplicar `Depends`,
`Session` etc., que já estão importados.)

- [ ] **Step 11: Rodar os testes desta task**

Run: `cd backend && pytest tests/adapters/test_postgres_latest_sensor_reading_repository.py tests/adapters/test_readings_router.py -v`
Expected: PASS (todos)

- [ ] **Step 12: Rodar a suíte completa**

Run: `cd backend && pytest -v`
Expected: todos passam (88 anteriores + 2 novos = 90).

- [ ] **Step 13: Commit**

```bash
cd backend
git add domain/entities/sensor_latest_reading.py application/ports/latest_sensor_reading_repository.py \
  adapters/outbound/postgres/postgres_latest_sensor_reading_repository.py \
  application/use_cases/get_latest_sensor_readings.py adapters/inbound/http/readings_router.py \
  tests/adapters/test_postgres_latest_sensor_reading_repository.py tests/adapters/test_readings_router.py
git commit -m "feat(api): adiciona /readings/latest-by-sensor"
```

---

### Task 3: Frontend — dependências, roteamento, `AppShell`

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/ui/layout/AppShell.tsx`
- Create: `frontend/src/ui/layout/AppShell.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `<AppShell>{children}</AppShell>` — navegação mobile (bottom) / desktop (sidebar),
  usado por `App.tsx`. `App.tsx` passa a ter `QueryClientProvider` + `BrowserRouter` + `Routes`
  (só a rota `/` registrada por enquanto, reaproveitando a `HomePage` placeholder da Fase 0 —
  cada task de página seguinte adiciona sua própria `<Route>`, mesmo padrão incremental usado no
  `main.py` do backend).

- [ ] **Step 1: Adicionar as dependências**

`frontend/package.json` — seção `dependencies`:

```json
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "@tanstack/react-query": "^5.62.0",
    "recharts": "^2.13.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0"
  },
```

Seção `devDependencies` — adicionar:

```json
    "@types/leaflet": "^1.9.14",
```

Instalar:

```bash
cd frontend
npm install
```

- [ ] **Step 2: Escrever o teste do `AppShell` (RED)**

`frontend/src/ui/layout/AppShell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renders navigation links to all 5 pages and the children content', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <p>conteúdo da página</p>
        </AppShell>
      </MemoryRouter>,
    )

    expect(screen.getByText('conteúdo da página')).toBeInTheDocument()
    for (const label of ['Início', 'Município', 'Geral', 'Sensores', 'Publicações']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 3: Rodar, confirmar que falha**

Run: `cd frontend && npm run test -- AppShell`
Expected: FAIL — módulo `./AppShell` não existe

- [ ] **Step 4: Criar o `AppShell`**

`frontend/src/ui/layout/AppShell.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/', label: 'Início' },
  { to: '/municipio', label: 'Município' },
  { to: '/geral', label: 'Geral' },
  { to: '/sensores', label: 'Sensores' },
  { to: '/publicacoes', label: 'Publicações' },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden border-r border-gray-200 p-4 md:flex md:w-56 md:flex-col">
        <span className="mb-6 text-lg font-semibold">Qualidade do Ar — Acre</span>
        <nav className="flex flex-col gap-2">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="rounded px-2 py-1 hover:bg-gray-100">
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-gray-200 bg-white p-2 md:hidden">
        {NAV_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="flex flex-col items-center px-2 py-1 text-xs">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
```

- [ ] **Step 5: Rodar, confirmar que passa**

Run: `cd frontend && npm run test -- AppShell`
Expected: PASS

- [ ] **Step 6: Ligar `AppShell` + roteamento + React Query em `App.tsx`**

`frontend/src/App.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './ui/layout/AppShell'
import { HomePage } from './ui/pages/HomePage'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 7: Rodar a suíte completa e o build**

Run: `cd frontend && npm run test`
Expected: todos os testes passam (`HealthBadge` continua passando + `AppShell` novo).

Run: `cd frontend && npm run build`
Expected: build sem erro de tipo (confirma que as novas dependências resolvem corretamente).

- [ ] **Step 8: Commit**

```bash
cd frontend
git add package.json package-lock.json src/ui/layout/AppShell.tsx src/ui/layout/AppShell.test.tsx src/App.tsx
git commit -m "feat(frontend): adiciona roteamento, React Query e AppShell"
```

---

### Task 4: Frontend — cliente de API e tipos de domínio

**Files:**
- Create: `frontend/src/domain/sensor.ts`
- Create: `frontend/src/domain/reading.ts`
- Create: `frontend/src/domain/metrics.ts`
- Modify: `frontend/src/infrastructure/api-client.ts`
- Create: `frontend/src/infrastructure/api-client.test.ts`

**Interfaces:**
- Produces: `Sensor`, `MunicipioReading`, `MunicipioDailyReading`, `SensorLatestReading`,
  `MonthHourCell`, `MunicipioYearExceedance` (tipos TS). `fetchHealth`, `fetchSensors`,
  `fetchMunicipios`, `fetchCurrentReadings`, `fetchHistoricalReadings`, `fetchLatestBySensor`,
  `fetchMonthHourMatrix`, `fetchMunicipioYearExceedance` — usados por todas as páginas
  seguintes (Tasks 7-12).

- [ ] **Step 1: Criar os tipos de domínio**

`frontend/src/domain/sensor.ts`:

```typescript
export interface Sensor {
  id: number
  code: string
  sensor_index: number
  name: string
  municipio: string
  latitude: number | null
  longitude: number | null
}
```

`frontend/src/domain/reading.ts`:

```typescript
export interface MunicipioReading {
  municipio: string
  bucket: string
  pm2_5_avg: number
}

export interface MunicipioDailyReading extends MunicipioReading {
  exceeds_who_threshold: boolean
}

export interface SensorLatestReading {
  sensor_index: number
  time_stamp: string
  pm2_5_corrected: number | null
}
```

`frontend/src/domain/metrics.ts`:

```typescript
export interface MonthHourCell {
  mes: number
  hora: number
  total: number
}

export interface MunicipioYearExceedance {
  municipio: string
  ano: number
  dias_acima_oms: number
}
```

- [ ] **Step 2: Escrever os testes do cliente HTTP (RED)**

`frontend/src/infrastructure/api-client.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchCurrentReadings,
  fetchHistoricalReadings,
  fetchLatestBySensor,
  fetchMonthHourMatrix,
  fetchMunicipioYearExceedance,
  fetchMunicipios,
  fetchSensors,
} from './api-client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api-client', () => {
  it('fetchSensors returns the parsed JSON body', async () => {
    const sensors = [{ id: 1, code: 'RBR1', sensor_index: 25549, name: 'MPAC_RBR', municipio: 'Rio Branco', latitude: null, longitude: null }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => sensors }))

    const result = await fetchSensors()

    expect(result).toEqual(sensors)
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/sensors')
  })

  it('fetchMunicipios hits /municipios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ['Rio Branco'] }))

    await fetchMunicipios()

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/municipios')
  })

  it('fetchCurrentReadings hits /readings/current', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))

    await fetchCurrentReadings()

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/readings/current')
  })

  it('fetchHistoricalReadings builds the query string with all params', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))

    await fetchHistoricalReadings({ start: '2026-01-01', end: '2026-01-07', granularity: 'daily', municipio: 'Rio Branco' })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/readings/history?start=2026-01-01&end=2026-01-07&granularity=daily&municipio=Rio+Branco',
    )
  })

  it('fetchHistoricalReadings omits optional params when absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))

    await fetchHistoricalReadings({ start: '2026-01-01', end: '2026-01-07' })

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/readings/history?start=2026-01-01&end=2026-01-07')
  })

  it('fetchLatestBySensor hits /readings/latest-by-sensor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))

    await fetchLatestBySensor()

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/readings/latest-by-sensor')
  })

  it('fetchMonthHourMatrix hits /metrics/month-hour-matrix', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))

    await fetchMonthHourMatrix()

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/metrics/month-hour-matrix')
  })

  it('fetchMunicipioYearExceedance hits /metrics/municipio-year-exceedance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))

    await fetchMunicipioYearExceedance()

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/metrics/municipio-year-exceedance')
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    await expect(fetchSensors()).rejects.toThrow('500')
  })
})
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd frontend && npm run test -- api-client`
Expected: FAIL — as funções novas não existem ainda.

- [ ] **Step 3: Estender o cliente HTTP**

`frontend/src/infrastructure/api-client.ts` (substitui o arquivo inteiro):

```typescript
import type { Sensor } from '../domain/sensor'
import type { MunicipioDailyReading, MunicipioReading, SensorLatestReading } from '../domain/reading'
import type { MonthHourCell, MunicipioYearExceedance } from '../domain/metrics'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${path}: ${response.status}`)
  }
  return response.json()
}

export async function fetchHealth(): Promise<{ status: string }> {
  return fetchJson('/health')
}

export async function fetchSensors(): Promise<Sensor[]> {
  return fetchJson('/sensors')
}

export async function fetchMunicipios(): Promise<string[]> {
  return fetchJson('/municipios')
}

export async function fetchCurrentReadings(): Promise<MunicipioReading[]> {
  return fetchJson('/readings/current')
}

export async function fetchHistoricalReadings(params: {
  start: string
  end: string
  granularity?: 'hourly' | 'daily'
  municipio?: string
}): Promise<MunicipioReading[] | MunicipioDailyReading[]> {
  const query = new URLSearchParams({ start: params.start, end: params.end })
  if (params.granularity) query.set('granularity', params.granularity)
  if (params.municipio) query.set('municipio', params.municipio)
  return fetchJson(`/readings/history?${query.toString()}`)
}

export async function fetchLatestBySensor(): Promise<SensorLatestReading[]> {
  return fetchJson('/readings/latest-by-sensor')
}

export async function fetchMonthHourMatrix(): Promise<MonthHourCell[]> {
  return fetchJson('/metrics/month-hour-matrix')
}

export async function fetchMunicipioYearExceedance(): Promise<MunicipioYearExceedance[]> {
  return fetchJson('/metrics/municipio-year-exceedance')
}
```

- [ ] **Step 4: Rodar, confirmar que passa**

Run: `cd frontend && npm run test -- api-client`
Expected: PASS (9 testes)

- [ ] **Step 5: Rodar a suíte completa**

Run: `cd frontend && npm run test`
Expected: todos passam.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/domain/sensor.ts src/domain/reading.ts src/domain/metrics.ts \
  src/infrastructure/api-client.ts src/infrastructure/api-client.test.ts
git commit -m "feat(frontend): estende cliente de API pra todos os endpoints da Fase 3"
```

---

### Task 5: `AqScaleTable` (tabela de escala AQI + `colorForPm25`)

**Files:**
- Create: `frontend/src/ui/components/AqScaleTable.tsx`
- Create: `frontend/src/ui/components/AqScaleTable.test.tsx`

**Interfaces:**
- Produces: `<AqScaleTable/>`, `colorForPm25(value: number | null): string` — usado pelo mapa
  (Task 6) e pela lista de sensores (Task 11). Única fonte das faixas de cor AQI no projeto.

- [ ] **Step 1: Escrever o teste (RED)**

`frontend/src/ui/components/AqScaleTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AqScaleTable, colorForPm25 } from './AqScaleTable'

describe('AqScaleTable', () => {
  it('renders all 7 tiers', () => {
    render(<AqScaleTable />)

    expect(screen.getAllByRole('row')).toHaveLength(8) // 1 header + 7 tiers
  })
})

describe('colorForPm25', () => {
  it('returns the n/a color for null', () => {
    expect(colorForPm25(null)).toBe('#969696')
  })

  it('returns the correct tier at each boundary', () => {
    expect(colorForPm25(0)).toBe('#68e143')
    expect(colorForPm25(11.9)).toBe('#68e143')
    expect(colorForPm25(12)).toBe('#ffff55')
    expect(colorForPm25(34.9)).toBe('#ffff55')
    expect(colorForPm25(35)).toBe('#ef8533')
    expect(colorForPm25(54.9)).toBe('#ef8533')
    expect(colorForPm25(55)).toBe('#ea3324')
    expect(colorForPm25(149.9)).toBe('#ea3324')
    expect(colorForPm25(150)).toBe('#8c1a4b')
    expect(colorForPm25(249.9)).toBe('#8c1a4b')
    expect(colorForPm25(250)).toBe('#731425')
    expect(colorForPm25(1000)).toBe('#731425')
  })
})
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd frontend && npm run test -- AqScaleTable`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Criar o componente**

`frontend/src/ui/components/AqScaleTable.tsx`:

```tsx
interface AqTier {
  classe: string
  color: string
  description: string
}

const AQ_TIERS: AqTier[] = [
  { classe: 'n/a', color: '#969696', description: 'O sensor não esta coletando dados no momento' },
  {
    classe: '0-12',
    color: '#68e143',
    description:
      'A qualidade do ar é considerada satisfatória e a poluição do ar não apresenta risco a população',
  },
  {
    classe: '12-35',
    color: '#ffff55',
    description:
      'A qualidade do ar é aceitável. No entanto, se expostos por 24 horas ou mais, pode haver um problema de espaço moderado para um número muito pequeno de pessoas',
  },
  {
    classe: '35-55',
    color: '#ef8533',
    description:
      'Pessoas de grupos sensíveis podem sofrer efeitos na área se expostos por 24 horas. Não é provável que o mínimo em geral seja afetado',
  },
  {
    classe: '55-150',
    color: '#ea3324',
    description:
      'Membros do mínimo em geral podem iniciar a ter efeitos na área se expostos por 24 horas; membros de grupos sensíveis podem experimentar efeitos mais graves na área',
  },
  {
    classe: '150-250',
    color: '#8c1a4b',
    description: 'Alerta de saúde: todos podem experimentar efeitos mais graves na saúde se expostos por 24 horas',
  },
  {
    classe: '250+',
    color: '#731425',
    description: 'Avisos de saúde de condições de emergência se expostos por 24 horas. Toda a população pode ser afetada',
  },
]

export function AqScaleTable() {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="border-b p-2 text-left">Classe</th>
          <th className="border-b p-2 text-left">Descrição</th>
        </tr>
      </thead>
      <tbody>
        {AQ_TIERS.map((tier) => (
          <tr key={tier.classe}>
            <td className="p-2">
              <span
                className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                style={{ backgroundColor: tier.color }}
                aria-hidden="true"
              />
              {tier.classe}
            </td>
            <td className="p-2">{tier.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function colorForPm25(value: number | null): string {
  if (value === null) return AQ_TIERS[0].color
  if (value < 12) return AQ_TIERS[1].color
  if (value < 35) return AQ_TIERS[2].color
  if (value < 55) return AQ_TIERS[3].color
  if (value < 150) return AQ_TIERS[4].color
  if (value < 250) return AQ_TIERS[5].color
  return AQ_TIERS[6].color
}
```

- [ ] **Step 4: Rodar, confirmar que passa**

Run: `cd frontend && npm run test -- AqScaleTable`
Expected: PASS (3 testes)

- [ ] **Step 5: Rodar a suíte completa**

Run: `cd frontend && npm run test`
Expected: todos passam.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/ui/components/AqScaleTable.tsx src/ui/components/AqScaleTable.test.tsx
git commit -m "feat(frontend): adiciona AqScaleTable e colorForPm25"
```

---

### Task 6: `SensorMap` (Leaflet)

**Files:**
- Create: `frontend/src/ui/components/SensorMap.tsx`
- Create: `frontend/src/ui/components/SensorMap.test.tsx`

**Interfaces:**
- Consumes: `Sensor`, `SensorLatestReading` (Task 4), `colorForPm25` (Task 5).
- Produces: `<SensorMap sensors={...} latestReadings={...}/>` — usado pela `HomePage` (Task 7).

- [ ] **Step 1: Escrever o teste (RED)**

`frontend/src/ui/components/SensorMap.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { SensorMap } from './SensorMap'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: { children: ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('leaflet', () => ({
  divIcon: vi.fn(() => ({})),
}))

describe('SensorMap', () => {
  it('renders one marker per sensor with valid coordinates, skipping sensors without location', () => {
    const sensors = [
      {
        id: 1,
        code: 'RBR1',
        sensor_index: 25549,
        name: 'MPAC_RBR',
        municipio: 'Rio Branco',
        latitude: -9.97499,
        longitude: -67.8243,
      },
      {
        id: 2,
        code: 'NOLOC',
        sensor_index: 99999,
        name: 'Sem Localização',
        municipio: 'Xapuri',
        latitude: null,
        longitude: null,
      },
    ]
    const latestReadings = [
      { sensor_index: 25549, time_stamp: '2026-01-01T10:00:00Z', pm2_5_corrected: 20.34 },
    ]

    render(<SensorMap sensors={sensors} latestReadings={latestReadings} />)

    expect(screen.getAllByTestId('marker')).toHaveLength(1)
    expect(screen.getByText('MPAC_RBR', { exact: false })).toBeInTheDocument()
  })

  it('shows "sem leitura recente" for a sensor with no matching reading', () => {
    const sensors = [
      {
        id: 1,
        code: 'RBR1',
        sensor_index: 25549,
        name: 'MPAC_RBR',
        municipio: 'Rio Branco',
        latitude: -9.97499,
        longitude: -67.8243,
      },
    ]

    render(<SensorMap sensors={sensors} latestReadings={[]} />)

    expect(screen.getByText(/Sem leitura recente/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd frontend && npm run test -- SensorMap`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Criar o componente**

`frontend/src/ui/components/SensorMap.tsx`:

```tsx
import 'leaflet/dist/leaflet.css'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import type { Sensor } from '../../domain/sensor'
import type { SensorLatestReading } from '../../domain/reading'
import { colorForPm25 } from './AqScaleTable'

const ACRE_CENTER: [number, number] = [-9.0238, -70.812]

function pinIcon(color: string) {
  return divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

interface SensorMapProps {
  sensors: Sensor[]
  latestReadings: SensorLatestReading[]
}

export function SensorMap({ sensors, latestReadings }: SensorMapProps) {
  const readingBySensorIndex = new Map(latestReadings.map((reading) => [reading.sensor_index, reading]))

  return (
    <MapContainer center={ACRE_CENTER} zoom={7} className="h-80 w-full sm:h-96 md:h-[450px] lg:h-[500px]">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {sensors
        .filter((sensor) => sensor.latitude !== null && sensor.longitude !== null)
        .map((sensor) => {
          const reading = readingBySensorIndex.get(sensor.sensor_index)
          const value = reading?.pm2_5_corrected ?? null
          return (
            <Marker
              key={sensor.id}
              position={[sensor.latitude as number, sensor.longitude as number]}
              icon={pinIcon(colorForPm25(value))}
            >
              <Popup>
                <strong>{sensor.name}</strong> ({sensor.code})
                <br />
                {sensor.municipio}
                <br />
                {value !== null ? `${value.toFixed(1)} µg/m³` : 'Sem leitura recente'}
                {reading && (
                  <>
                    <br />
                    {new Date(reading.time_stamp).toLocaleString('pt-BR')}
                  </>
                )}
              </Popup>
            </Marker>
          )
        })}
    </MapContainer>
  )
}
```

- [ ] **Step 4: Rodar, confirmar que passa**

Run: `cd frontend && npm run test -- SensorMap`
Expected: PASS (2 testes)

- [ ] **Step 5: Rodar a suíte completa**

Run: `cd frontend && npm run test`
Expected: todos passam.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/ui/components/SensorMap.tsx src/ui/components/SensorMap.test.tsx
git commit -m "feat(frontend): adiciona SensorMap (Leaflet, pin colorido por sensor)"
```

---

### Task 7: `HomePage`

**Files:**
- Modify: `frontend/src/ui/pages/HomePage.tsx`
- Create: `frontend/src/ui/pages/HomePage.test.tsx`
- Delete: `frontend/src/ui/components/HealthBadge.tsx`
- Delete: `frontend/src/ui/components/HealthBadge.test.tsx`

**Interfaces:**
- Consumes: `SensorMap` (Task 6), `AqScaleTable` (Task 5), `fetchSensors`/`fetchLatestBySensor`
  (Task 4).

`HealthBadge` era um smoke-test da Fase 0 (só consumidor era o `HomePage` placeholder) — sai de
cena agora que a home tem conteúdo real; as páginas seguintes já dependem de dados reais via
React Query, tornando o badge redundante.

- [ ] **Step 1: Escrever o teste (RED)**

`frontend/src/ui/pages/HomePage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { HomePage } from './HomePage'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('leaflet', () => ({ divIcon: vi.fn(() => ({})) }))

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HomePage', () => {
  it('renders the title, the AQ scale table and the network description', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))

    renderWithProviders()

    expect(screen.getByText('Portal de Qualidade do Ar do Acre')).toBeInTheDocument()
    expect(screen.getByText('Escalas de Qualidade do Ar')).toBeInTheDocument()
    expect(await screen.findByText(/Rede de Monitoramento da Qualidade do Ar do Acre/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd frontend && npm run test -- HomePage`
Expected: FAIL — conteúdo atual da `HomePage` (placeholder Fase 0) não bate com as asserções.

- [ ] **Step 3: Reescrever a `HomePage`**

`frontend/src/ui/pages/HomePage.tsx` (substitui o arquivo inteiro):

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchLatestBySensor, fetchSensors } from '../../infrastructure/api-client'
import { AqScaleTable } from '../components/AqScaleTable'
import { SensorMap } from '../components/SensorMap'

export function HomePage() {
  const sensorsQuery = useQuery({ queryKey: ['sensors'], queryFn: fetchSensors })
  const latestQuery = useQuery({ queryKey: ['latest-by-sensor'], queryFn: fetchLatestBySensor })

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Portal de Qualidade do Ar do Acre</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded border border-gray-200 p-4">
          <h2 className="mb-2 text-lg font-semibold">Monitoramento da Qualidade do Ar no Acre</h2>
          {sensorsQuery.isLoading || latestQuery.isLoading ? (
            <p>Carregando mapa...</p>
          ) : sensorsQuery.isError || latestQuery.isError ? (
            <p>Não foi possível carregar o mapa.</p>
          ) : (
            <SensorMap sensors={sensorsQuery.data ?? []} latestReadings={latestQuery.data ?? []} />
          )}
        </section>

        <section className="rounded border border-gray-200 p-4">
          <h2 className="mb-2 text-lg font-semibold">Escalas de Qualidade do Ar</h2>
          <AqScaleTable />
        </section>
      </div>

      <div className="my-6 flex flex-wrap gap-2">
        <Link to="/geral" className="rounded bg-blue-600 px-4 py-2 text-white">
          Ver Gráficos Gerais
        </Link>
        <Link to="/municipio" className="rounded bg-blue-600 px-4 py-2 text-white">
          Gráficos Municipais
        </Link>
        <Link to="/publicacoes" className="rounded bg-blue-600 px-4 py-2 text-white">
          Relatórios e Publicações
        </Link>
      </div>

      <section className="my-8">
        <h2 className="text-xl font-semibold">A Rede de Monitoramento da Qualidade do Ar do Acre</h2>
        <p className="mb-4 text-gray-600">Conheça a maior rede de monitoramento da qualidade do ar da Amazônia</p>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded border border-gray-200 p-4">
            <h3 className="mb-2 font-semibold">O Estabelecimento da Rede de Monitoramento da Qualidade do Ar</h3>
            <p className="text-sm text-gray-700">
              A rede está operacional desde junho de 2019, com sensores PurpleAir PA-II-SD, de baixo custo e
              IoT, disponibilizando dados em tempo real gratuitamente. São 30 sensores distribuídos em 22
              municípios do Acre, fruto de ação do Ministério Público do Estado do Acre em parceria com a
              Universidade Federal do Acre e outras instituições.
            </p>
          </article>
          <article className="rounded border border-gray-200 p-4">
            <h3 className="mb-2 font-semibold">O Laboratório de Geoprocessamento Aplicado ao Meio Ambiente - LabGAMA</h3>
            <p className="text-sm text-gray-700">
              O LabGAMA foi criado em 2013 na UFAC e atualmente lidera as atividades da Rede de Qualidade do
              Ar, lideradas pelo Dr. Willian Flores — monitoramento e gestão, processamento de dados e
              produção de informação sobre qualidade do ar.
            </p>
          </article>
          <article className="rounded border border-gray-200 p-4">
            <h3 className="mb-2 font-semibold">Sobre os Dados e Códigos</h3>
            <p className="text-sm text-gray-700">
              Os dados vêm da API do PurpleAir, processados em Python e armazenados em PostgreSQL, com a
              equação de correção LRAPA aplicada. O site é construído com React, e o código-fonte é publicado
              no GitHub do Dr. Willian Flores.
            </p>
          </article>
        </div>
      </section>

      <section className="my-8">
        <h2 className="text-xl font-semibold">Parceiros Institucionais</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded border border-gray-200 p-4">
            <h3 className="mb-2 font-semibold">Coordenação da Rede</h3>
            <p className="text-sm text-gray-700">UFAC, MPAC</p>
          </div>
          <div className="rounded border border-gray-200 p-4">
            <h3 className="mb-2 font-semibold">Cooperação Técnico-Científica</h3>
            <p className="text-sm text-gray-700">INPE, Woodwell Climate Research Center</p>
          </div>
          <div className="rounded border border-gray-200 p-4">
            <h3 className="mb-2 font-semibold">Apoio Técnico e Financeiro</h3>
            <p className="text-sm text-gray-700">IPAM</p>
          </div>
        </div>
      </section>

      <footer className="mt-8 border-t border-gray-200 pt-6 text-sm text-gray-600">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="font-semibold">LabGAMA</p>
            <p>
              Laboratório de Geoprocessamento Aplicado ao Meio Ambiente. Promovendo monitoramento e gestão da
              qualidade do ar no Estado do Acre através de tecnologia e pesquisa.
            </p>
          </div>
          <div>
            <p className="font-semibold">Contato</p>
            <p>Cruzeiro do Sul, Acre - Brasil</p>
            <p>
              <a href="mailto:labgama@ufac.br">labgama@ufac.br</a>
            </p>
            <p>
              <a href="https://www.instagram.com/ufac.labgama/" target="_blank" rel="noreferrer">
                @ufac.labgama
              </a>
            </p>
          </div>
          <div>
            <p className="font-semibold">Sobre o Projeto</p>
            <p>
              Portal de monitoramento da qualidade do ar do Acre, desenvolvido pelo LabGAMA em parceria com o
              MPAC e outras instituições.
            </p>
          </div>
        </div>
        <p className="mt-4 border-t border-gray-200 pt-4 text-xs">
          Responsáveis pela Rede: UFAC e MPAC | Cooperação Técnico-Científica: INPE e Woodwell | Apoio
          Técnico e Financeiro: IPAM
        </p>
        <p className="text-xs">© {new Date().getFullYear()} LabGAMA - UFAC. Todos os direitos reservados.</p>
      </footer>
    </main>
  )
}
```

- [ ] **Step 4: Remover o `HealthBadge`**

```bash
cd frontend
git rm src/ui/components/HealthBadge.tsx src/ui/components/HealthBadge.test.tsx
```

- [ ] **Step 5: Rodar, confirmar que passa**

Run: `cd frontend && npm run test -- HomePage`
Expected: PASS

- [ ] **Step 6: Rodar a suíte completa**

Run: `cd frontend && npm run test`
Expected: todos passam (`HealthBadge` não existe mais, sem quebra).

- [ ] **Step 7: Commit**

```bash
cd frontend
git add src/ui/pages/HomePage.tsx src/ui/pages/HomePage.test.tsx
git commit -m "feat(frontend): implementa HomePage real (mapa, escala AQI, conteúdo institucional)"
```

---

### Task 8: `MunicipioPage`

**Files:**
- Create: `frontend/src/ui/pages/MunicipioPage.tsx`
- Create: `frontend/src/ui/pages/MunicipioPage.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `fetchMunicipios`, `fetchHistoricalReadings` (Task 4).

- [ ] **Step 1: Escrever o teste (RED)**

`frontend/src/ui/pages/MunicipioPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MunicipioPage } from './MunicipioPage'

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MunicipioPage />
    </QueryClientProvider>,
  )
}

describe('MunicipioPage', () => {
  it('lists municípios in the selector and loads the chart for the first one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/municipios')) {
          return Promise.resolve({ ok: true, json: async () => ['Rio Branco', 'Cruzeiro do Sul'] })
        }
        return Promise.resolve({
          ok: true,
          json: async () => [{ municipio: 'Rio Branco', bucket: '2026-01-01T10:00:00Z', pm2_5_avg: 12.5 }],
        })
      }),
    )

    renderWithProviders()

    expect(await screen.findByRole('option', { name: 'Rio Branco' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Cruzeiro do Sul' })).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('municipio=Rio+Branco')))
  })
})
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd frontend && npm run test -- MunicipioPage`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Criar a página**

`frontend/src/ui/pages/MunicipioPage.tsx`:

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchHistoricalReadings, fetchMunicipios } from '../../infrastructure/api-client'
import type { MunicipioReading } from '../../domain/reading'

function last7DaysRange(): { start: string; end: string } {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 7)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export function MunicipioPage() {
  const [municipio, setMunicipio] = useState<string | null>(null)
  const municipiosQuery = useQuery({ queryKey: ['municipios'], queryFn: fetchMunicipios })
  const range = last7DaysRange()
  const selected = municipio ?? municipiosQuery.data?.[0] ?? null

  const historyQuery = useQuery({
    queryKey: ['history-hourly', selected, range.start, range.end],
    queryFn: () =>
      fetchHistoricalReadings({
        start: range.start,
        end: range.end,
        granularity: 'hourly',
        municipio: selected as string,
      }),
    enabled: selected !== null,
  })

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Concentração por Município</h1>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">Município</span>
        <select
          className="rounded border border-gray-300 p-2"
          value={selected ?? ''}
          onChange={(event) => setMunicipio(event.target.value)}
        >
          {(municipiosQuery.data ?? []).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      {historyQuery.isLoading && <p>Carregando gráfico...</p>}
      {historyQuery.isError && <p>Não foi possível carregar os dados.</p>}
      {historyQuery.data && (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={historyQuery.data as MunicipioReading[]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" tickFormatter={(value: string) => new Date(value).toLocaleDateString('pt-BR')} />
            <YAxis label={{ value: 'Média horária de MP2,5 (µg/m³)', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={(value: string) => new Date(value).toLocaleString('pt-BR')} />
            <ReferenceLine y={15} stroke="red" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="pm2_5_avg" stroke="#2563eb" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Registrar a rota**

`frontend/src/App.tsx` — adicionar o import e a rota (mantendo a rota `/` intacta):

```tsx
import { MunicipioPage } from './ui/pages/MunicipioPage'
```

```tsx
            <Route path="/" element={<HomePage />} />
            <Route path="/municipio" element={<MunicipioPage />} />
```

- [ ] **Step 5: Rodar, confirmar que passa**

Run: `cd frontend && npm run test -- MunicipioPage`
Expected: PASS

- [ ] **Step 6: Rodar a suíte completa**

Run: `cd frontend && npm run test`
Expected: todos passam.

- [ ] **Step 7: Commit**

```bash
cd frontend
git add src/ui/pages/MunicipioPage.tsx src/ui/pages/MunicipioPage.test.tsx src/App.tsx
git commit -m "feat(frontend): adiciona MunicipioPage (seletor + gráfico horário)"
```

---

### Task 9: `MonthHourHeatmap` (grade custom)

**Files:**
- Create: `frontend/src/ui/components/MonthHourHeatmap.tsx`
- Create: `frontend/src/ui/components/MonthHourHeatmap.test.tsx`

**Interfaces:**
- Consumes: `MonthHourCell` (Task 4).
- Produces: `<MonthHourHeatmap cells={...}/>` — usado pela `GeralPage` (Task 10).

- [ ] **Step 1: Escrever o teste (RED)**

`frontend/src/ui/components/MonthHourHeatmap.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MonthHourHeatmap } from './MonthHourHeatmap'

describe('MonthHourHeatmap', () => {
  it('renders 12 month labels and 24 hour labels', () => {
    render(<MonthHourHeatmap cells={[]} />)

    expect(screen.getByText('Jan')).toBeInTheDocument()
    expect(screen.getByText('Dez')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()
  })

  it('shows the correct total in the tooltip title for a known cell', () => {
    render(<MonthHourHeatmap cells={[{ mes: 1, hora: 10, total: 42 }]} />)

    expect(screen.getByTitle('Jan 10h: 42 horas acima de 15µg/m³')).toBeInTheDocument()
  })

  it('treats missing month/hour combos as zero', () => {
    render(<MonthHourHeatmap cells={[{ mes: 1, hora: 10, total: 42 }]} />)

    expect(screen.getByTitle('Fev 5h: 0 horas acima de 15µg/m³')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd frontend && npm run test -- MonthHourHeatmap`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Criar o componente**

`frontend/src/ui/components/MonthHourHeatmap.tsx`:

```tsx
import { Fragment } from 'react'
import type { MonthHourCell } from '../../domain/metrics'

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function colorForTotal(total: number, max: number): string {
  if (max === 0 || total === 0) return '#eeeeee'
  const intensity = total / max
  if (intensity < 0.25) return '#ffff55'
  if (intensity < 0.5) return '#ef8533'
  if (intensity < 0.75) return '#ea3324'
  return '#731425'
}

interface MonthHourHeatmapProps {
  cells: MonthHourCell[]
}

export function MonthHourHeatmap({ cells }: MonthHourHeatmapProps) {
  const max = Math.max(0, ...cells.map((cell) => cell.total))
  const cellByKey = new Map(cells.map((cell) => [`${cell.mes}-${cell.hora}`, cell]))

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[600px] grid-cols-[3rem_repeat(24,1fr)] gap-px text-xs">
        <div />
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="text-center text-gray-500">
            {hour}
          </div>
        ))}
        {MONTH_LABELS.map((label, monthIndex) => (
          <Fragment key={label}>
            <div className="pr-1 text-right text-gray-500">{label}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const cell = cellByKey.get(`${monthIndex + 1}-${hour}`)
              const total = cell?.total ?? 0
              return (
                <div
                  key={`${label}-${hour}`}
                  title={`${label} ${hour}h: ${total} horas acima de 15µg/m³`}
                  className="aspect-square"
                  style={{ backgroundColor: colorForTotal(total, max) }}
                />
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar, confirmar que passa**

Run: `cd frontend && npm run test -- MonthHourHeatmap`
Expected: PASS (3 testes)

- [ ] **Step 5: Rodar a suíte completa**

Run: `cd frontend && npm run test`
Expected: todos passam.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/ui/components/MonthHourHeatmap.tsx src/ui/components/MonthHourHeatmap.test.tsx
git commit -m "feat(frontend): adiciona MonthHourHeatmap (grade custom, sem lib de gráfico)"
```

---

### Task 10: `MunicipioYearChart` + `GeralPage`

**Files:**
- Create: `frontend/src/ui/components/MunicipioYearChart.tsx`
- Create: `frontend/src/ui/components/MunicipioYearChart.test.tsx`
- Create: `frontend/src/ui/pages/GeralPage.tsx`
- Create: `frontend/src/ui/pages/GeralPage.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `MunicipioYearExceedance` (Task 4), `MonthHourHeatmap` (Task 9),
  `fetchMonthHourMatrix`/`fetchMunicipioYearExceedance` (Task 4).

- [ ] **Step 1: Escrever o teste do gráfico (RED)**

`frontend/src/ui/components/MunicipioYearChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { pivotByMunicipio } from './MunicipioYearChart'

describe('pivotByMunicipio', () => {
  it('pivots long-format rows into one row per município with a column per year', () => {
    const data = [
      { municipio: 'Rio Branco', ano: 2024, dias_acima_oms: 10 },
      { municipio: 'Rio Branco', ano: 2025, dias_acima_oms: 5 },
      { municipio: 'Xapuri', ano: 2024, dias_acima_oms: 3 },
    ]

    const { rows, years } = pivotByMunicipio(data)

    expect(years).toEqual([2024, 2025])
    const rioBranco = rows.find((row) => row.municipio === 'Rio Branco')
    expect(rioBranco).toEqual({ municipio: 'Rio Branco', '2024': 10, '2025': 5 })
    const xapuri = rows.find((row) => row.municipio === 'Xapuri')
    expect(xapuri).toEqual({ municipio: 'Xapuri', '2024': 3 })
  })
})
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd frontend && npm run test -- MunicipioYearChart`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Criar o componente**

`frontend/src/ui/components/MunicipioYearChart.tsx`:

```tsx
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MunicipioYearExceedance } from '../../domain/metrics'

interface MunicipioYearChartProps {
  data: MunicipioYearExceedance[]
}

interface ChartRow {
  municipio: string
  [year: string]: string | number
}

export function pivotByMunicipio(data: MunicipioYearExceedance[]): { rows: ChartRow[]; years: number[] } {
  const years = Array.from(new Set(data.map((row) => row.ano))).sort((a, b) => a - b)
  const rowsByMunicipio = new Map<string, ChartRow>()
  for (const entry of data) {
    const row = rowsByMunicipio.get(entry.municipio) ?? { municipio: entry.municipio }
    row[String(entry.ano)] = entry.dias_acima_oms
    rowsByMunicipio.set(entry.municipio, row)
  }
  return { rows: Array.from(rowsByMunicipio.values()), years }
}

const BAR_COLORS = ['#68e143', '#ffff55', '#ef8533', '#ea3324', '#8c1a4b', '#731425', '#2563eb', '#7c3aed']

export function MunicipioYearChart({ data }: MunicipioYearChartProps) {
  const { rows, years } = pivotByMunicipio(data)

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={rows} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" label={{ value: 'Dias acima do limite OMS', position: 'insideBottom', offset: -5 }} />
        <YAxis type="category" dataKey="municipio" width={140} />
        <Tooltip />
        <Legend />
        {years.map((year, index) => (
          <Bar key={year} dataKey={String(year)} fill={BAR_COLORS[index % BAR_COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Rodar, confirmar que passa**

Run: `cd frontend && npm run test -- MunicipioYearChart`
Expected: PASS

- [ ] **Step 5: Escrever o teste da `GeralPage` (RED)**

`frontend/src/ui/pages/GeralPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GeralPage } from './GeralPage'

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <GeralPage />
    </QueryClientProvider>,
  )
}

describe('GeralPage', () => {
  it('renders both section headings once data loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('month-hour-matrix')) {
          return Promise.resolve({ ok: true, json: async () => [{ mes: 1, hora: 10, total: 5 }] })
        }
        return Promise.resolve({
          ok: true,
          json: async () => [{ municipio: 'Rio Branco', ano: 2026, dias_acima_oms: 3 }],
        })
      }),
    )

    renderWithProviders()

    expect(await screen.findByText('Mês × Hora — Horas Acima do Limite OMS')).toBeInTheDocument()
    expect(screen.getByText('Dias Acima do Limite OMS por Município e Ano')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Rodar, confirmar que falha**

Run: `cd frontend && npm run test -- GeralPage`
Expected: FAIL — módulo não existe

- [ ] **Step 7: Criar a página**

`frontend/src/ui/pages/GeralPage.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { fetchMonthHourMatrix, fetchMunicipioYearExceedance } from '../../infrastructure/api-client'
import { MonthHourHeatmap } from '../components/MonthHourHeatmap'
import { MunicipioYearChart } from '../components/MunicipioYearChart'

export function GeralPage() {
  const matrixQuery = useQuery({ queryKey: ['month-hour-matrix'], queryFn: fetchMonthHourMatrix })
  const exceedanceQuery = useQuery({
    queryKey: ['municipio-year-exceedance'],
    queryFn: fetchMunicipioYearExceedance,
  })

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Gráficos Gerais</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Mês × Hora — Horas Acima do Limite OMS</h2>
        {matrixQuery.isLoading && <p>Carregando...</p>}
        {matrixQuery.isError && <p>Não foi possível carregar o mapa de calor.</p>}
        {matrixQuery.data && <MonthHourHeatmap cells={matrixQuery.data} />}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Dias Acima do Limite OMS por Município e Ano</h2>
        {exceedanceQuery.isLoading && <p>Carregando...</p>}
        {exceedanceQuery.isError && <p>Não foi possível carregar o gráfico.</p>}
        {exceedanceQuery.data && <MunicipioYearChart data={exceedanceQuery.data} />}
      </section>
    </main>
  )
}
```

- [ ] **Step 8: Registrar a rota**

`frontend/src/App.tsx`:

```tsx
import { GeralPage } from './ui/pages/GeralPage'
```

```tsx
            <Route path="/geral" element={<GeralPage />} />
```

- [ ] **Step 9: Rodar, confirmar que passa**

Run: `cd frontend && npm run test -- GeralPage MunicipioYearChart`
Expected: PASS

- [ ] **Step 10: Rodar a suíte completa**

Run: `cd frontend && npm run test`
Expected: todos passam.

- [ ] **Step 11: Commit**

```bash
cd frontend
git add src/ui/components/MunicipioYearChart.tsx src/ui/components/MunicipioYearChart.test.tsx \
  src/ui/pages/GeralPage.tsx src/ui/pages/GeralPage.test.tsx src/App.tsx
git commit -m "feat(frontend): adiciona GeralPage (heatmap + gráfico município×ano)"
```

---

### Task 11: `SensoresPage`

**Files:**
- Create: `frontend/src/ui/pages/SensoresPage.tsx`
- Create: `frontend/src/ui/pages/SensoresPage.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `fetchSensors`, `fetchLatestBySensor` (Task 4), `colorForPm25` (Task 5).

- [ ] **Step 1: Escrever o teste (RED)**

`frontend/src/ui/pages/SensoresPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SensoresPage } from './SensoresPage'

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SensoresPage />
    </QueryClientProvider>,
  )
}

describe('SensoresPage', () => {
  it('lists each sensor with its name, município and last reading time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/sensors')) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: 1, code: 'RBR1', sensor_index: 25549, name: 'MPAC_RBR', municipio: 'Rio Branco', latitude: null, longitude: null },
            ],
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => [{ sensor_index: 25549, time_stamp: '2026-01-01T10:00:00Z', pm2_5_corrected: 20.34 }],
        })
      }),
    )

    renderWithProviders()

    expect(await screen.findByText('MPAC_RBR')).toBeInTheDocument()
    expect(screen.getByText('Rio Branco')).toBeInTheDocument()
    expect(screen.getByText('RBR1')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd frontend && npm run test -- SensoresPage`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Criar a página**

`frontend/src/ui/pages/SensoresPage.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { fetchLatestBySensor, fetchSensors } from '../../infrastructure/api-client'
import { colorForPm25 } from '../components/AqScaleTable'

export function SensoresPage() {
  const sensorsQuery = useQuery({ queryKey: ['sensors'], queryFn: fetchSensors })
  const latestQuery = useQuery({ queryKey: ['latest-by-sensor'], queryFn: fetchLatestBySensor })

  const readingBySensorIndex = new Map((latestQuery.data ?? []).map((reading) => [reading.sensor_index, reading]))

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Sensores</h1>

      {(sensorsQuery.isLoading || latestQuery.isLoading) && <p>Carregando...</p>}
      {(sensorsQuery.isError || latestQuery.isError) && <p>Não foi possível carregar os sensores.</p>}

      {sensorsQuery.data && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b p-2 text-left">Nome</th>
              <th className="border-b p-2 text-left">Código</th>
              <th className="border-b p-2 text-left">Município</th>
              <th className="border-b p-2 text-left">Última leitura</th>
              <th className="border-b p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {sensorsQuery.data.map((sensor) => {
              const reading = readingBySensorIndex.get(sensor.sensor_index)
              const value = reading?.pm2_5_corrected ?? null
              return (
                <tr key={sensor.id}>
                  <td className="p-2">{sensor.name}</td>
                  <td className="p-2">{sensor.code}</td>
                  <td className="p-2">{sensor.municipio}</td>
                  <td className="p-2">{reading ? new Date(reading.time_stamp).toLocaleString('pt-BR') : 'Sem leitura'}</td>
                  <td className="p-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full align-middle"
                      style={{ backgroundColor: colorForPm25(value) }}
                      aria-label={value !== null ? `${value.toFixed(1)} µg/m³` : 'sem dado'}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Registrar a rota**

`frontend/src/App.tsx`:

```tsx
import { SensoresPage } from './ui/pages/SensoresPage'
```

```tsx
            <Route path="/sensores" element={<SensoresPage />} />
```

- [ ] **Step 5: Rodar, confirmar que passa**

Run: `cd frontend && npm run test -- SensoresPage`
Expected: PASS

- [ ] **Step 6: Rodar a suíte completa**

Run: `cd frontend && npm run test`
Expected: todos passam.

- [ ] **Step 7: Commit**

```bash
cd frontend
git add src/ui/pages/SensoresPage.tsx src/ui/pages/SensoresPage.test.tsx src/App.tsx
git commit -m "feat(frontend): adiciona SensoresPage (lista com status por sensor)"
```

---

### Task 12: `PublicacoesPage`

**Files:**
- Create: `frontend/src/domain/report.ts`
- Create: `frontend/src/data/reports.json` (copiado do app antigo)
- Create: `frontend/public/reports/img/*` (copiado do app antigo)
- Create: `frontend/public/reports/pdf/*` (copiado do app antigo)
- Create: `frontend/src/ui/pages/PublicacoesPage.tsx`
- Create: `frontend/src/ui/pages/PublicacoesPage.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `Report(title, description, imageUrl, fileUrl, date)`.

- [ ] **Step 1: Copiar os dados e assets do app antigo**

```bash
mkdir -p /home/willianflores/localhost/airquality-js-app/frontend/src/data
mkdir -p /home/willianflores/localhost/airquality-js-app/frontend/public/reports/img
mkdir -p /home/willianflores/localhost/airquality-js-app/frontend/public/reports/pdf

cp /home/willianflores/localhost/airquality-app/frontend/src/data/reports.json \
  /home/willianflores/localhost/airquality-js-app/frontend/src/data/reports.json

cp /home/willianflores/localhost/airquality-app/frontend/public/reports/img/* \
  /home/willianflores/localhost/airquality-js-app/frontend/public/reports/img/

cp /home/willianflores/localhost/airquality-app/frontend/public/reports/pdf/* \
  /home/willianflores/localhost/airquality-js-app/frontend/public/reports/pdf/
```

Confirme que os arquivos foram copiados:

```bash
ls /home/willianflores/localhost/airquality-js-app/frontend/src/data/reports.json
ls /home/willianflores/localhost/airquality-js-app/frontend/public/reports/img/ | wc -l
ls /home/willianflores/localhost/airquality-js-app/frontend/public/reports/pdf/ | wc -l
```

- [ ] **Step 2: Criar o tipo de domínio**

`frontend/src/domain/report.ts`:

```typescript
export interface Report {
  title: string
  description: string
  imageUrl: string
  fileUrl: string
  date: string
}
```

- [ ] **Step 3: Escrever o teste da página (RED)**

`frontend/src/ui/pages/PublicacoesPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PublicacoesPage } from './PublicacoesPage'

vi.mock('../../data/reports.json', () => ({
  default: [
    {
      title: 'Relatório A',
      description: 'Descrição do relatório A sobre queimadas',
      imageUrl: '/reports/img/a.jpg',
      fileUrl: '/reports/pdf/a.pdf',
      date: '01/03/2024',
    },
    {
      title: 'Relatório B',
      description: 'Descrição do relatório B sobre monitoramento',
      imageUrl: '/reports/img/b.jpg',
      fileUrl: '/reports/pdf/b.pdf',
      date: '15/06/2023',
    },
  ],
}))

describe('PublicacoesPage', () => {
  it('renders all reports sorted by date descending by default', () => {
    render(<PublicacoesPage />)

    const titles = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent)
    expect(titles).toEqual(['Relatório A', 'Relatório B'])
    expect(screen.getByText('2 publicações disponíveis')).toBeInTheDocument()
  })

  it('filters by search text across title and description', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    render(<PublicacoesPage />)

    await userEvent.type(screen.getByPlaceholderText('Buscar por título ou descrição'), 'queimadas')

    expect(screen.getByText('Relatório A')).toBeInTheDocument()
    expect(screen.queryByText('Relatório B')).not.toBeInTheDocument()
    expect(screen.getByText('1 de 2 publicações encontradas')).toBeInTheDocument()
  })

  it('filters by year', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    render(<PublicacoesPage />)

    await userEvent.selectOptions(screen.getByRole('combobox'), '2023')

    expect(screen.getByText('Relatório B')).toBeInTheDocument()
    expect(screen.queryByText('Relatório A')).not.toBeInTheDocument()
  })
})
```

Esse teste usa `@testing-library/user-event` — confirme que já está instalado
(`frontend/package.json`); se não estiver, adicione: `npm install -D @testing-library/user-event`
antes de rodar.

- [ ] **Step 4: Rodar, confirmar que falha**

Run: `cd frontend && npm run test -- PublicacoesPage`
Expected: FAIL — módulo não existe

- [ ] **Step 5: Criar a página**

`frontend/src/ui/pages/PublicacoesPage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import reportsData from '../../data/reports.json'
import type { Report } from '../../domain/report'

const reports = reportsData as Report[]

function parseDate(date: string): Date {
  const [day, month, year] = date.split('/').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(date: string): string {
  return parseDate(date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function PublicacoesPage() {
  const [search, setSearch] = useState('')
  const [year, setYear] = useState<string>('todos')

  const years = useMemo(
    () => Array.from(new Set(reports.map((report) => parseDate(report.date).getFullYear()))).sort((a, b) => b - a),
    [],
  )

  const filtered = useMemo(() => {
    return reports
      .filter((report) => {
        const matchesSearch =
          search === '' ||
          report.title.toLowerCase().includes(search.toLowerCase()) ||
          report.description.toLowerCase().includes(search.toLowerCase())
        const matchesYear = year === 'todos' || parseDate(report.date).getFullYear() === Number(year)
        return matchesSearch && matchesYear
      })
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
  }, [search, year])

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Relatórios e Publicações</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Buscar por título ou descrição"
          className="flex-1 rounded border border-gray-300 p-2"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="rounded border border-gray-300 p-2"
          value={year}
          onChange={(event) => setYear(event.target.value)}
        >
          <option value="todos">Todos os anos</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        {search === '' && year === 'todos'
          ? `${filtered.length} publicações disponíveis`
          : `${filtered.length} de ${reports.length} publicações encontradas`}
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((report) => (
          <article key={report.fileUrl} className="rounded border border-gray-200 p-4">
            <img src={report.imageUrl} alt={report.title} className="mb-2 h-40 w-full rounded object-cover" />
            <p className="text-xs text-gray-500">{formatDate(report.date)}</p>
            <h2 className="mb-1 font-semibold">{report.title}</h2>
            <p className="mb-2 line-clamp-3 text-sm text-gray-700">{report.description}</p>
            <div className="flex gap-2">
              <a href={report.fileUrl} download className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
                Download
              </a>
              <a
                href={report.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-gray-300 px-3 py-1 text-sm"
              >
                Visualizar
              </a>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Rodar, confirmar que passa**

Run: `cd frontend && npm run test -- PublicacoesPage`
Expected: PASS (3 testes)

- [ ] **Step 7: Registrar a rota**

`frontend/src/App.tsx`:

```tsx
import { PublicacoesPage } from './ui/pages/PublicacoesPage'
```

```tsx
            <Route path="/publicacoes" element={<PublicacoesPage />} />
```

- [ ] **Step 8: Rodar a suíte completa e o build**

Run: `cd frontend && npm run test`
Expected: todos passam.

Run: `cd frontend && npm run build`
Expected: build sem erro — confirma que todas as 5 rotas + todos os componentes compilam juntos.

- [ ] **Step 9: Commit**

```bash
cd frontend
git add src/domain/report.ts src/data/reports.json public/reports/ \
  src/ui/pages/PublicacoesPage.tsx src/ui/pages/PublicacoesPage.test.tsx src/App.tsx
git commit -m "feat(frontend): adiciona PublicacoesPage (porta reports.json do app antigo)"
```

---

## Self-Review

**1. Cobertura da spec:**
- Home (mapa + escala AQI + conteúdo institucional) → Task 7 ✅
- Município (seletor + gráfico horário) → Task 8 ✅
- Geral (heatmap mês×hora + gráfico município×ano) → Tasks 9-10 ✅
- Sensores (lista + status) → Task 11 ✅
- Publicações (porta JSON) → Task 12 ✅
- Extensão de backend (lat/long + sensor_index em /sensors, /readings/latest-by-sensor) →
  Tasks 1-2 ✅
- Heatmap sem recharts/echarts (grade CSS custom) → Task 9 ✅
- Cor por PM2.5 com fonte única (`colorForPm25`) → Task 5, reusado nas Tasks 6 e 11 ✅
- Roteamento + AppShell mobile-first → Task 3 ✅

**2. Placeholder scan:** nenhum TBD/TODO — todo código é completo e executável como escrito. A
única incerteza genuína (versões exatas de dependências novas) é resolvida por `npm install`
com floors `^`, mesmo padrão já usado no `requirements.txt` do backend (`>=`).

**3. Consistência de tipos:** `Sensor` (Task 4) tem `sensor_index`, usado consistentemente por
`SensorMap` (Task 6) e `SensoresPage` (Task 11) pra cruzar com `SensorLatestReading.sensor_index`
(Task 4). `colorForPm25` (Task 5) tem a mesma assinatura `(value: number | null) => string` nos
dois lugares que a consomem. `MonthHourCell`/`MunicipioYearExceedance` (Task 4) batem
exatamente com os tipos de retorno do backend (Fase 3, Tasks 1-2 desta fase).

---

## Execution Handoff

Plano completo, salvo em `docs/superpowers/plans/2026-07-19-fase-4-frontend-core.md`. Duas
opções de execução:

**1. Subagent-Driven (recomendado)** — dispatch de subagente fresco por task, review entre tasks
(mesmo padrão das fases anteriores).

**2. Inline Execution** — executo as tasks nesta sessão, com checkpoints pra revisão.

Qual abordagem?
