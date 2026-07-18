# Fase 0 — Fundação do Monorepo (airquality-js-app) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the new `airquality-js-app` monorepo (backend Python/FastAPI hexagonal, frontend
React/Vite, docker-compose, CI) with one working vertical slice per side, proving the architecture
before any real feature is built.

**Architecture:** Backend follows hexagonal layering (domain → application/ports →
adapters → infrastructure) with an in-memory fake repository standing in for Postgres until Fase 1.
Frontend is a Vite SPA that calls the backend `/health` endpoint to prove the two services talk to
each other. Everything runs locally via `infra/docker-compose.yml`; CI runs backend and frontend
test suites independently.

**Tech Stack:** Python 3.12 + FastAPI + pytest + httpx (backend); React 19 + Vite + TypeScript +
Tailwind CSS + Vitest + Testing Library (frontend); PostgreSQL via `timescale/timescaledb` Docker
image (not yet used by the app, just proven reachable); GitHub Actions (CI).

## Global Constraints

- Monorepo root: `airquality-js-app/` with `frontend/`, `backend/`, `infra/` — copied verbatim from
  the spec's high-level architecture. The existing `airquality-app/` (Next.js/Node) stays untouched
  until the final cutover (Fase 7 of the spec).
- Backend: Python + FastAPI, hexagonal architecture
  (`domain`/`application`/`adapters`/`infrastructure`).
- Hexagonal dependency rule: `domain` imports nothing; `application` imports only `domain` and
  defines `ports`; `adapters` implement `ports`; `infrastructure` wires everything via dependency
  injection. Every use case must be testable in isolation with a fake port, no FastAPI or database
  required.
- Frontend: React + Vite + TypeScript + Tailwind CSS, SPA (no Next.js/SSR).
- Database target: PostgreSQL + TimescaleDB extension (real schema/hypertables arrive in Fase 1 —
  this plan only proves the container runs and is reachable).

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `airquality-js-app/.gitignore`
- Create: `airquality-js-app/README.md`

**Interfaces:**
- Produces: the root directory `airquality-js-app/` that every later task writes into.

- [ ] **Step 1: Create the directory tree**

Run:
```bash
mkdir -p /home/willianflores/localhost/airquality-js-app/{backend,frontend,infra}
mkdir -p /home/willianflores/localhost/airquality-js-app/backend/{domain/entities,application/ports,application/use_cases,adapters/inbound/http,adapters/outbound/memory,infrastructure,tests/application,tests/adapters}
mkdir -p /home/willianflores/localhost/airquality-js-app/frontend/src/{domain,application,infrastructure,ui/pages,ui/components,ui/layout}
```

- [ ] **Step 2: Write the root `.gitignore`**

```gitignore
# Python
__pycache__/
*.pyc
.venv/
*.egg-info/

# Node
node_modules/
dist/
.vite/

# Env
.env
.env.local

# OS
.DS_Store
```

- [ ] **Step 3: Write the root `README.md`**

```markdown
# airquality-js-app

Reescrita do Portal de Qualidade do Ar do Acre — React (Vite, mobile-first) + Python
(FastAPI, arquitetura hexagonal) + PostgreSQL/TimescaleDB.

Ver design completo em
`airquality-app/docs/superpowers/specs/2026-07-17-migracao-react-python-hexagonal-design.md`
(repositório antigo, mantido até o corte final).

## Rodar localmente

\`\`\`bash
cd infra
docker compose up --build
\`\`\`

- Backend: http://localhost:8000/health
- Frontend: http://localhost:5173
```

- [ ] **Step 4: Initialize git and commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git init
git add .gitignore README.md
git commit -m "chore: scaffold airquality-js-app monorepo root"
```

Expected: commit succeeds, `git log --oneline` shows the commit.

---

## Task 2: Backend domain + application layer (hexagonal core)

**Files:**
- Create: `backend/domain/__init__.py`
- Create: `backend/domain/entities/__init__.py`
- Create: `backend/domain/entities/sensor.py`
- Create: `backend/application/__init__.py`
- Create: `backend/application/ports/__init__.py`
- Create: `backend/application/ports/sensor_repository.py`
- Create: `backend/application/use_cases/__init__.py`
- Create: `backend/application/use_cases/list_sensors.py`
- Create: `backend/adapters/__init__.py`
- Create: `backend/adapters/outbound/__init__.py`
- Create: `backend/adapters/outbound/memory/__init__.py`
- Create: `backend/adapters/outbound/memory/in_memory_sensor_repository.py`
- Create: `backend/requirements.txt`
- Create: `backend/pyproject.toml`
- Test: `backend/tests/__init__.py`, `backend/tests/application/__init__.py`,
  `backend/tests/application/test_list_sensors.py`

**Interfaces:**
- Produces: `Sensor` dataclass (`id: int, code: str, name: str, municipio: str, active: bool`);
  `SensorRepository` abstract port with `list_active() -> list[Sensor]`; `ListSensors` use case with
  `execute() -> list[Sensor]`; `InMemorySensorRepository(sensors: list[Sensor])` implementing the
  port. Task 3 consumes all four names exactly as defined here.

- [ ] **Step 1: Create empty `__init__.py` files for every package**

```bash
cd /home/willianflores/localhost/airquality-js-app/backend
touch domain/__init__.py domain/entities/__init__.py
touch application/__init__.py application/ports/__init__.py application/use_cases/__init__.py
touch adapters/__init__.py adapters/outbound/__init__.py adapters/outbound/memory/__init__.py
touch tests/__init__.py tests/application/__init__.py
```

- [ ] **Step 2: Write the failing test**

`backend/tests/application/test_list_sensors.py`:
```python
from domain.entities.sensor import Sensor
from application.use_cases.list_sensors import ListSensors
from adapters.outbound.memory.in_memory_sensor_repository import InMemorySensorRepository


def test_list_sensors_returns_only_active():
    sensors = [
        Sensor(id=1, code="RBR1", name="MPAC_RBR", municipio="Rio Branco", active=True),
        Sensor(id=2, code="CZS1", name="UFAC_CZS", municipio="Cruzeiro do Sul", active=False),
    ]
    use_case = ListSensors(InMemorySensorRepository(sensors))

    result = use_case.execute()

    assert result == [sensors[0]]
```

- [ ] **Step 3: Write `backend/pyproject.toml` and `backend/requirements.txt` so pytest can find the packages**

`backend/pyproject.toml`:
```toml
[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

`backend/requirements.txt`:
```
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pydantic-settings>=2.5.0
pytest>=8.3.0
httpx>=0.27.0
```

- [ ] **Step 4: Install dependencies and run the test to verify it fails**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest tests/application/test_list_sensors.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'domain'` (or similar — the entity/port/use
case files don't exist yet).

- [ ] **Step 5: Write the domain entity**

`backend/domain/entities/sensor.py`:
```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Sensor:
    id: int
    code: str
    name: str
    municipio: str
    active: bool
```

- [ ] **Step 6: Write the port**

`backend/application/ports/sensor_repository.py`:
```python
from abc import ABC, abstractmethod

from domain.entities.sensor import Sensor


class SensorRepository(ABC):
    @abstractmethod
    def list_active(self) -> list[Sensor]:
        raise NotImplementedError
```

- [ ] **Step 7: Write the use case**

`backend/application/use_cases/list_sensors.py`:
```python
from domain.entities.sensor import Sensor
from application.ports.sensor_repository import SensorRepository


class ListSensors:
    def __init__(self, sensor_repository: SensorRepository) -> None:
        self._sensor_repository = sensor_repository

    def execute(self) -> list[Sensor]:
        return self._sensor_repository.list_active()
```

- [ ] **Step 8: Write the in-memory fake adapter**

`backend/adapters/outbound/memory/in_memory_sensor_repository.py`:
```python
from domain.entities.sensor import Sensor
from application.ports.sensor_repository import SensorRepository


class InMemorySensorRepository(SensorRepository):
    def __init__(self, sensors: list[Sensor]) -> None:
        self._sensors = sensors

    def list_active(self) -> list[Sensor]:
        return [s for s in self._sensors if s.active]
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `pytest tests/application/test_list_sensors.py -v`
Expected: PASS — `test_list_sensors_returns_only_active` succeeds, no FastAPI or database imported
anywhere in the chain.

- [ ] **Step 10: Commit**

```bash
git add domain application adapters/outbound tests/application tests/__init__.py \
        requirements.txt pyproject.toml adapters/__init__.py
git commit -m "feat(backend): add Sensor entity, ListSensors use case and in-memory fake repository"
```

---

## Task 3: Backend inbound HTTP adapter + FastAPI wiring

**Files:**
- Create: `backend/adapters/inbound/__init__.py`
- Create: `backend/adapters/inbound/http/__init__.py`
- Create: `backend/adapters/inbound/http/health_router.py`
- Create: `backend/adapters/inbound/http/sensors_router.py`
- Create: `backend/infrastructure/__init__.py`
- Create: `backend/infrastructure/settings.py`
- Create: `backend/infrastructure/dependencies.py`
- Create: `backend/infrastructure/main.py`
- Create: `backend/Dockerfile`
- Test: `backend/tests/adapters/__init__.py`, `backend/tests/adapters/test_http_routes.py`

**Interfaces:**
- Consumes: `Sensor`, `ListSensors`, `InMemorySensorRepository` from Task 2 (exact names/signatures
  as defined there).
- Produces: FastAPI app instance importable as `infrastructure.main:app`, exposing `GET /health` →
  `{"status": "ok"}` and `GET /sensors` → JSON list of active sensors.

- [ ] **Step 1: Create empty `__init__.py` files**

```bash
cd /home/willianflores/localhost/airquality-js-app/backend
touch adapters/inbound/__init__.py adapters/inbound/http/__init__.py
touch infrastructure/__init__.py tests/adapters/__init__.py
```

- [ ] **Step 2: Write the failing test**

`backend/tests/adapters/test_http_routes.py`:
```python
from fastapi.testclient import TestClient

from infrastructure.main import app

client = TestClient(app)


def test_health_check_returns_ok():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_sensors_returns_seeded_active_sensors():
    response = client.get("/sensors")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert body[0]["code"] == "RBR1"
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pytest tests/adapters/test_http_routes.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'infrastructure.main'`.

- [ ] **Step 4: Write the settings module**

`backend/infrastructure/settings.py`:
```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Portal de Qualidade do Ar API"
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 5: Write the health router**

`backend/adapters/inbound/http/health_router.py`:
```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 6: Write the dependency wiring**

`backend/infrastructure/dependencies.py`:
```python
from domain.entities.sensor import Sensor
from application.use_cases.list_sensors import ListSensors
from adapters.outbound.memory.in_memory_sensor_repository import InMemorySensorRepository

# Fase 0 seed data — replaced by PostgresSensorRepository in Fase 1, once the real
# `sensors` table exists. This in-memory repository only proves the wiring end to end.
_SEED_SENSORS = [
    Sensor(id=1, code="RBR1", name="MPAC_RBR", municipio="Rio Branco", active=True),
    Sensor(id=2, code="CZS1", name="UFAC_CZS", municipio="Cruzeiro do Sul", active=True),
]

_sensor_repository = InMemorySensorRepository(_SEED_SENSORS)


def get_list_sensors_use_case() -> ListSensors:
    return ListSensors(_sensor_repository)
```

- [ ] **Step 7: Write the sensors router**

`backend/adapters/inbound/http/sensors_router.py`:
```python
from fastapi import APIRouter, Depends

from application.use_cases.list_sensors import ListSensors
from infrastructure.dependencies import get_list_sensors_use_case

router = APIRouter()


@router.get("/sensors")
def get_sensors(use_case: ListSensors = Depends(get_list_sensors_use_case)) -> list[dict]:
    sensors = use_case.execute()
    return [
        {"id": s.id, "code": s.code, "name": s.name, "municipio": s.municipio}
        for s in sensors
    ]
```

- [ ] **Step 8: Write the FastAPI app factory**

`backend/infrastructure/main.py`:
```python
from fastapi import FastAPI

from adapters.inbound.http.health_router import router as health_router
from adapters.inbound.http.sensors_router import router as sensors_router
from infrastructure.settings import settings

app = FastAPI(title=settings.app_name)
app.include_router(health_router)
app.include_router(sensors_router)
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `pytest tests/adapters/test_http_routes.py -v`
Expected: PASS — both `test_health_check_returns_ok` and
`test_get_sensors_returns_seeded_active_sensors` succeed.

- [ ] **Step 10: Write the backend Dockerfile**

`backend/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "infrastructure.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 11: Run the full backend suite and commit**

Run: `pytest -v`
Expected: PASS — all tests from Task 2 and Task 3 pass together.

```bash
git add adapters/inbound infrastructure tests/adapters Dockerfile
git commit -m "feat(backend): wire FastAPI health and sensors endpoints via dependency injection"
```

---

## Task 4: Frontend scaffold (Vite + React + TypeScript + Tailwind)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/index.css`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/test-setup.ts`
- Create: `frontend/src/infrastructure/api-client.ts`
- Create: `frontend/src/ui/components/HealthBadge.tsx`
- Create: `frontend/src/ui/pages/HomePage.tsx`
- Create: `frontend/Dockerfile`
- Test: `frontend/src/ui/components/HealthBadge.test.tsx`

**Interfaces:**
- Consumes: backend `GET /health` endpoint from Task 3 (`{"status": "ok"}` shape).
- Produces: `fetchHealth(): Promise<{status: string}>` from `infrastructure/api-client.ts`, used by
  `HealthBadge` and by any later page that needs a backend reachability check.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^6.0.0",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 2: Write Vite, TypeScript, Tailwind and PostCSS configs**

`frontend/vite.config.ts`:
```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

`frontend/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
```

`frontend/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

`frontend/src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Write `index.html` and `src/index.css`**

`frontend/index.html`:
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portal de Qualidade do Ar do Acre</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Install dependencies**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/frontend
npm install
```
Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Write the failing test**

`frontend/src/ui/components/HealthBadge.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HealthBadge } from './HealthBadge'

describe('HealthBadge', () => {
  it('shows ok status when the backend health check succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) }),
    )

    render(<HealthBadge />)

    expect(await screen.findByText('API: ok')).toBeInTheDocument()
  })

  it('shows error status when the backend health check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    render(<HealthBadge />)

    expect(await screen.findByText('API: error')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm run test`
Expected: FAIL — `Cannot find module './HealthBadge'`.

- [ ] **Step 7: Write the API client**

`frontend/src/infrastructure/api-client.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function fetchHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`)
  }
  return response.json()
}
```

- [ ] **Step 8: Write the `HealthBadge` component**

`frontend/src/ui/components/HealthBadge.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { fetchHealth } from '../../infrastructure/api-client'

export function HealthBadge() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking')

  useEffect(() => {
    fetchHealth()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <span data-testid="health-badge" className="rounded px-2 py-1 text-sm">
      API: {status}
    </span>
  )
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npm run test`
Expected: PASS — both `HealthBadge` tests succeed.

- [ ] **Step 10: Write `HomePage`, `App` and `main.tsx`**

`frontend/src/ui/pages/HomePage.tsx`:
```tsx
import { HealthBadge } from '../components/HealthBadge'

export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-xl font-semibold">Portal de Qualidade do Ar do Acre</h1>
      <HealthBadge />
    </main>
  )
}
```

`frontend/src/App.tsx`:
```tsx
import { HomePage } from './ui/pages/HomePage'

export function App() {
  return <HomePage />
}
```

`frontend/src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 11: Verify the dev build works**

Run:
```bash
npm run build
```
Expected: `dist/` created, no TypeScript errors.

- [ ] **Step 12: Write the frontend Dockerfile**

`frontend/Dockerfile`:
```dockerfile
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tailwind.config.ts \
        postcss.config.js index.html src Dockerfile
git commit -m "feat(frontend): scaffold Vite+React+Tailwind SPA with backend health check"
```

---

## Task 5: docker-compose for local development

**Files:**
- Create: `infra/docker-compose.yml`

**Interfaces:**
- Consumes: `backend/Dockerfile` (Task 3) and `frontend/Dockerfile` (Task 4).
- Produces: three running containers (`postgres`, `backend`, `frontend`) reachable at
  `localhost:5432`, `localhost:8000`, `localhost:5173`.

- [ ] **Step 1: Write `infra/docker-compose.yml`**

```yaml
services:
  postgres:
    image: timescale/timescaledb:2.17.2-pg16
    container_name: airquality_js_postgres
    environment:
      POSTGRES_DB: airquality
      POSTGRES_USER: airquality_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-devpassword}
    ports:
      - "127.0.0.1:5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U airquality_user -d airquality"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ../backend
    container_name: airquality_js_backend
    environment:
      ENVIRONMENT: development
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ../frontend
    container_name: airquality_js_frontend
    environment:
      VITE_API_URL: http://localhost:8000
    ports:
      - "127.0.0.1:5173:80"
    depends_on:
      - backend

volumes:
  postgres_data:
    driver: local
```

- [ ] **Step 2: Bring the stack up and verify manually**

Run:
```bash
cd /home/willianflores/localhost/airquality-js-app/infra
docker compose up --build -d
docker compose ps
curl -s http://localhost:8000/health
curl -s http://localhost:8000/sensors
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173
```
Expected:
- `docker compose ps` shows `postgres` healthy, `backend` and `frontend` running.
- `curl .../health` returns `{"status":"ok"}`.
- `curl .../sensors` returns the two seeded sensors as JSON.
- `curl -o /dev/null .../` (frontend) returns `200`.

- [ ] **Step 3: Tear down and commit**

```bash
docker compose down
cd /home/willianflores/localhost/airquality-js-app
git add infra/docker-compose.yml
git commit -m "feat(infra): add local docker-compose stack for postgres, backend and frontend"
```

---

## Task 6: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `backend/requirements.txt` (Task 2) and `frontend/package.json` (Task 4).
- Produces: a CI pipeline that runs on every push and pull request against `main`.

- [ ] **Step 1: Write the workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pytest -v

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm install
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 2: Commit and push**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add .github/workflows/ci.yml
git commit -m "ci: add backend and frontend test/build pipeline"
```

Expected: once this repository has a remote and this branch is pushed, both `backend` and
`frontend` jobs run and pass on GitHub Actions.

---

## Self-Review

**Spec coverage** (against Fase 0 — "scaffold do monorepo, Docker Compose local (Postgres/Timescale),
esqueleto das camadas hexagonais com testes de exemplo, CI básico"):
- Monorepo scaffold: Task 1.
- Docker Compose local com Postgres/Timescale: Task 5 (image `timescale/timescaledb`, ready for
  Fase 1's hypertables without rework).
- Esqueleto hexagonal com testes de exemplo: Task 2 (domain/application, fake adapter, isolated
  unit test) + Task 3 (inbound HTTP adapter, infrastructure wiring, integration test).
- CI básico: Task 6.
- Frontend mobile-first shell isn't in scope for Fase 0 per the spec (that's Fase 4) — Task 4 only
  proves the Vite/React/Tailwind/Vitest toolchain works end to end via one page, not the final UI.

**Placeholder scan:** no TBD/TODO; the one seed-data placeholder (`_SEED_SENSORS` in
`infrastructure/dependencies.py`) is explicitly noted as scoped to Fase 0 and replaced in Fase 1 —
not a vague instruction, it's real working code with a comment explaining why it's temporary.

**Type consistency:** `Sensor(id, code, name, municipio, active)` — same fields used in Task 2's
entity, Task 2's test, Task 3's dependencies module and router, and Task 3's HTTP test. `ListSensors`
takes a `SensorRepository` in its constructor and exposes `execute()` everywhere it's used.
`InMemorySensorRepository` takes `sensors: list[Sensor]` and implements `list_active()` matching the
abstract port signature exactly.
