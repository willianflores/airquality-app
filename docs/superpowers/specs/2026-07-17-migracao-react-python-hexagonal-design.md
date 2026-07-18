# Migração Portal de Qualidade do Ar (Acre): Next.js/Node → React (mobile-first) + Python (hexagonal)

## Contexto

O Portal de Qualidade do Ar do Acre monitora PM2.5 de 30 sensores PurpleAir PA-II-SD distribuídos em
22 municípios do Acre (LabGAMA/UFAC + MPAC). Hoje é:

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind + shadcn/radix, com três libs de
  gráfico redundantes (`apexcharts`, `echarts`, `recharts`).
- **Backend**: Node/Express + TypeScript + Prisma, autenticação JWT, sem separação clara de camadas
  (controllers → services → Prisma direto).
- **Banco**: PostgreSQL, tabelas `day`/`hour`/`hour_up`/`aqmatrix`/`mun_days_up`/`sensors`, mais uma
  tabela de ingestão bruta fora do schema Prisma (`sc_padata.tb_parealtimedata`) com o payload
  completo da API PurpleAir (PM1/2.5/10 em `atm`/`cf_1` por canal A/B, contagem de partículas por
  faixa de tamanho, umidade, temperatura, pressão, VOC, RSSI, uptime etc).
- **Ingestão**: script Python solto (`daily_update.py`, `getPurpleairApiHistoricalData.py`,
  `purpleairFunctions.py`, `runFuctions_server.py`) rodando 1x/dia via cron (00:05), calculando
  correção EPA (`0.5*pm2_5_atm-0.66`, capado 0-1000) e médias horárias/diárias/WHO via pandas sobre
  o histórico inteiro a cada execução.
- **Deploy**: `docker-compose.yml` já existe (postgres, backend, frontend, nginx, redis), mas sem
  host de produção definido no momento desta spec.

**Achado relevante**: o app se anuncia como "monitoramento em tempo real", mas a ingestão só roda
1x/dia — o dado exibido pode ter até 24h de atraso. A API PurpleAir já expõe médias prontas em
várias janelas (tempo real, 10min, 30min, 1h, 6h, 24h, semana), então o recálculo diário em pandas é
redundante com o que a fonte já entrega.

A demanda é reescrever o sistema com frontend React mobile-first, backend Python com arquitetura
hexagonal, foco em desempenho para série temporal crescente e segurança de dados/deploy — seguindo a
mesma estratégia usada na migração do Nokekoi App
(`nokekoi-app/docs/superpowers/specs/2026-07-08-migracao-react-python-hexagonal-design.md`).

## Decisões

- **Repositórios**: `airquality-js-app/` é o monorepo novo, com `frontend/`, `backend/`, `infra/`.
  `airquality-app/` (Next.js/Node atual) fica intocado em produção até o corte final (Fase 7), mas
  sua lógica de negócio (fórmula de correção EPA, agregações, scripts de ingestão) é portada, não
  descartada.
- **Frontend**: React + Vite + TypeScript + Tailwind CSS — SPA mobile-first, trocando Next.js/SSR
  por uma estrutura mais simples (sem app router, sem server components). Uma única lib de gráfico
  (`recharts`), removendo a redundância de três libs atuais.
- **Backend**: Python + FastAPI, arquitetura hexagonal (domain/application/adapters/infrastructure),
  substituindo Node/Express/Prisma.
- **Banco de dados**: PostgreSQL + extensão **TimescaleDB**. A tabela de ingestão bruta
  (`sensor_readings`) replica o schema completo da API PurpleAir (mesmos campos de
  `sc_padata.tb_parealtimedata` hoje) como hypertable — dado bruto integral é preservado para estudo
  científico e disponibilização futura à sociedade, não só o subconjunto usado hoje (PM2.5). Médias
  horárias/diárias/contagem WHO viram **continuous aggregates** do Timescale (substituindo
  `hour`/`day`/`aqmatrix`/`mun_days_up`), atualizados incrementalmente pelo próprio Timescale — sem
  recomputar o histórico inteiro a cada execução.
- **Ingestão**: dois casos de uso separados —
  - `ingest_realtime_purpleair`: roda a cada **10-15 minutos**, busca os campos de leitura da API
    PurpleAir por sensor, grava no hypertable bruto. Cadência escolhida para bater com o intervalo de
    atualização real do sensor, sem desperdiçar chamadas de API nem reintroduzir o atraso de 24h do
    schedule atual.
  - `backfill_historical_purpleair`: job separado (sob demanda/periódico, não a cada 10-15min) para
    preencher lacunas ou importar histórico antigo — substitui `getPurpleairApiHistoricalData.py`.
  - Ambos rodam como casos de uso do domínio via worker (APScheduler), não como scripts soltos.
- **Migração de dados**: histórico completo de `day`/`hour`/`hour_up`/`aqmatrix`/`mun_days_up` é
  migrado para o schema novo (backfill único), preservando a série histórica usada em pesquisa
  científica (MPAC/UFAC).
- **Autenticação**: painel admin protegido (poucos usuários), sessão via cookie `httpOnly`, `Secure`,
  `SameSite=Strict` (substitui JWT atual). Sem SSO/LDAP, sem cadastro público.
- **PWA/offline**: fora de escopo nesta fase — web responsivo online. Público é majoritariamente
  urbano (prefeituras, MPAC, UFAC), com conexão mais estável que o caso de uso do Nokekoi (comunidade
  indígena remota) que motivou a mesma exclusão lá.
- **Design**: telas atuais são portadas para o Figma (design-to-code reverso/screenshot), depois
  refinadas visualmente (paleta AQI por faixa OMS, tipografia, componentes) antes da implementação em
  React — ocorre na Fase 4 (frontend core), não bloqueia fases anteriores.
- **Deploy**: Docker Compose + Nginx, mantendo o padrão já esboçado no `docker-compose.yml` atual.
  Host de produção ainda não definido nesta spec — infraestrutura desenhada de forma agnóstica de
  provedor (VM própria ou cloud), parametrizável via `.env`.

## Arquitetura de alto nível

```
airquality-js-app/
├── frontend/    # React (mobile-first)
├── backend/     # Python (arquitetura hexagonal)
└── infra/       # docker-compose, nginx, scripts de deploy
```

Fluxo: React (SPA mobile-first) → API REST (FastAPI) → Casos de uso (domínio) → Repositórios
(PostgreSQL + TimescaleDB). Um worker (APScheduler) roda os jobs de ingestão (tempo real + backfill)
como casos de uso do domínio.

## Backend: arquitetura hexagonal

```
backend/
├── domain/                   # Regras de negócio puras, sem dependências externas
│   ├── entities/              # Sensor, SensorReading, AdminUser
│   ├── value_objects/         # TimeRange, PM25Correction, WHOThreshold, Municipio
│   └── services/              # Cálculo de correção EPA, agregação, contagem de excedência WHO
│
├── application/               # Casos de uso (orquestram domínio + portas)
│   ├── use_cases/
│   │   ├── get_current_readings.py           # tempo real por sensor/município, cache-first
│   │   ├── get_historical_series.py          # substitui LoadDayData/LoadHourData controllers
│   │   ├── get_metrics_summary.py             # substitui aqmatrix/mun_days_up controllers
│   │   ├── ingest_realtime_purpleair.py       # substitui daily_update.py (10-15min)
│   │   ├── backfill_historical_purpleair.py   # substitui getPurpleairApiHistoricalData.py
│   │   ├── manage_sensors.py                  # CRUD, substitui sensorController
│   │   └── authenticate_admin.py
│   └── ports/                 # Interfaces (contratos) — nada de SQL/HTTP aqui
│       ├── sensor_repository.py
│       ├── sensor_reading_repository.py
│       ├── admin_user_repository.py
│       ├── cache_port.py
│       └── external_purpleair_source.py       # contrato p/ API PurpleAir
│
├── adapters/                   # Implementações concretas das portas
│   ├── inbound/http/            # Rotas FastAPI, DTOs de request/response (Pydantic)
│   └── outbound/
│       ├── timescaledb/          # Implementação dos repositórios (hypertable + continuous aggregates)
│       ├── redis_cache/          # Cache de leitura atual/hot-path
│       └── purpleair_api/        # Cliente HTTP para API PurpleAir
│
└── infrastructure/              # DI, scheduler (APScheduler), settings (Pydantic Settings)
```

Regra de dependência: `domain` não importa nada; `application` só importa `domain` e define
`ports`; `adapters` implementam `ports`; `infrastructure` conecta tudo via injeção de dependência
(`Depends(...)` do FastAPI). Cada caso de uso é testável isoladamente com fakes das portas, sem
precisar do FastAPI nem do banco rodando. A fórmula de correção EPA (`0.5*pm2_5_atm-0.66`, capada em
0-1000) vira `domain/services`, função pura testável sem infraestrutura.

## Modelo de dados (PostgreSQL + TimescaleDB)

```sql
sensors (id, code, sensor_index, name, municipio, institution, location, active,
         latitude, longitude, created_at, updated_at)     -- dimensão, mantém estrutura atual

sensor_readings (                                          -- HYPERTABLE (partição por time_stamp)
  time_stamp, sensor_index FK, private, rssi, uptime, pa_latency, memory,
  latitude, longitude, altitude,
  humidity, humidity_a, humidity_b,
  temperature, temperature_a, temperature_b,
  pressure, pressure_a, pressure_b,
  voc, voc_a, voc_b, analog_input,
  pm2_5_alt, pm2_5_alt_a, pm2_5_alt_b,
  "0_3_um_count", "0_3_um_count_a", "0_3_um_count_b",
  "0_5_um_count", "0_5_um_count_a", "0_5_um_count_b",
  "1_0_um_count", "1_0_um_count_a", "1_0_um_count_b",
  "2_5_um_count", "2_5_um_count_a", "2_5_um_count_b",
  "5_0_um_count", "5_0_um_count_a", "5_0_um_count_b",
  "10_0_um_count", "10_0_um_count_a", "10_0_um_count_b",
  pm1_0_cf_1, pm1_0_cf_1_a, pm1_0_cf_1_b, pm1_0_atm, pm1_0_atm_a, pm1_0_atm_b,
  pm2_5_cf_1, pm2_5_cf_1_a, pm2_5_cf_1_b, pm2_5_atm, pm2_5_atm_a, pm2_5_atm_b,
  pm10_0_cf_1, pm10_0_cf_1_a, pm10_0_cf_1_b, pm10_0_atm, pm10_0_atm_a, pm10_0_atm_b,
  mun_name
)
-- índice (sensor_index, time_stamp DESC)
-- réplica integral do payload PurpleAir atual (sc_padata.tb_parealtimedata), preservada para
-- estudo científico e disponibilização futura, não só o subconjunto (PM2.5) usado hoje

-- Continuous aggregates (Timescale mantém incrementalmente, aplicando a correção EPA na query):
municipio_hourly_pm25   -- substitui tabela "hour"/"hour_up"
municipio_daily_pm25    -- substitui tabela "day"
who_exceedance_days     -- substitui "aqmatrix"/"mun_days_up" (dias/horas acima de 15µg/m³ por
                        -- município/ano)

admin_users (id, email, password_hash, created_at, last_login)
admin_sessions (id, admin_id FK, expires_at, created_at)   -- sessão httpOnly
ingestion_runs (id, source, started_at, finished_at, status, records_ingested)
```

- `sensor_readings` particionado por `time_stamp`; chunks antigos comprimidos automaticamente pelo
  Timescale (dado de anos atrás continua consultável, com fração do espaço em disco).
- `municipio_hourly_pm25`/`municipio_daily_pm25`/`who_exceedance_days` eliminam a necessidade de um
  worker recalculando agregações pesadas em pandas sobre o histórico inteiro a cada execução —
  o Timescale atualiza só o que mudou.
- `ingestion_runs` dá visibilidade (painel admin) de execução e falhas do pipeline — hoje as falhas
  do cron são só um arquivo de log local.
- Rotas de série histórica sempre exigem filtro de intervalo de tempo (sem "traz tudo"), com limite
  máximo de intervalo por request — nunca retornam a tabela bruta inteira.

## Frontend (React mobile-first)

```
frontend/
├── src/
│   ├── domain/            # Tipos TS gerados do OpenAPI (SensorReading, MunicipioMetric...)
│   ├── application/       # Hooks de caso de uso (useCurrentReadings, useHistoricalSeries,
│   │                      #   useMetricsSummary)
│   ├── infrastructure/    # Cliente HTTP, config de API base URL
│   ├── ui/
│   │   ├── pages/          # HomePage, MunicipioPage, SensoresPage, PublicacoesPage, AdminPage
│   │   ├── components/     # AQICard, TimeSeriesChart, MunicipioSelector, MobileHeader
│   │   └── layout/         # AppShell (bottom nav mobile / sidebar desktop)
│   └── App.tsx
```

- Bottom navigation em telas < 768px (não sidebar).
- Uma única lib de gráfico (`recharts`), removendo a redundância atual de três libs
  (`apexcharts`+`echarts`+`recharts`).
- Cards de métrica (AQI por faixa OMS) como componentes Tailwind reutilizáveis (grid 1 coluna
  mobile, 2+ colunas desktop).
- TypeScript com tipos gerados do schema OpenAPI do backend (`openapi-typescript`), mantendo
  frontend e backend sincronizados sem trabalho manual.
- Sem PWA/offline nesta fase.
- Admin (login + CRUD de sensores + status de ingestão) em rota protegida, consumindo os mesmos
  endpoints REST com cookie de sessão.
- Design portado do Figma (screenshot/design-to-code reverso das telas atuais, depois refinado)
  antes da implementação dos componentes.

## Autenticação/admin

- Sessão via cookie `httpOnly` + `Secure` + `SameSite=Strict` (não JWT em localStorage).
- Sessão armazenada em `admin_sessions` (Postgres), expiração curta (~8h) com renovação.
- Senha com **argon2id**.
- Rate limiting no login (ex: 5 tentativas/15min por IP).
- CSRF: `SameSite=Strict` + verificação de header custom nas rotas de mutação do admin.
- Sem cadastro público: admins criados via CLI (`create-admin`), não há rota pública de signup.

## Segurança da aplicação e dados

- Segredos via variáveis de ambiente/Docker secrets (permissão `600`), nunca versionados nem
  hardcoded.
- HTTPS obrigatório; backend, Postgres e Redis não expostos publicamente (rede interna Docker).
- Headers de segurança no Nginx: HSTS, `X-Content-Type-Options`, `X-Frame-Options`, CSP restritiva.
- Validação de entrada via Pydantic em todas as rotas.
- `pip-audit`/`npm audit` no CI, Dependabot ativado (repositório atual já tem `dependabot.yml` —
  adaptar para o monorepo novo).
- Backup automatizado do Postgres com retenção, idealmente com cópia fora do servidor.
- Logs de auditoria: login de admin, CRUD de sensores, reprocessamento manual de ingestão.

## Deploy/infra

```
[Internet] → Nginx (80/443, Let's Encrypt/certbot)
                │
                ├── / (443)    → frontend (build estático)
                └── /api (443) → backend FastAPI (proxy_pass)

Docker Compose (rede interna, só Nginx exposto ao host):
  - nginx | frontend | backend | worker (APScheduler) | postgres (TimescaleDB) | redis
```

- Host de produção ainda não definido — infraestrutura parametrizada via `.env`, sem acoplamento a
  um provedor específico (compatível com VM própria ou cloud, decisão adiada para a Fase 6).
- Containers rodando como usuário não-root; Postgres com usuário de app sem privilégio de
  superuser.
- Healthcheck do Compose + endpoint `/health`; alerta por e-mail se o worker de ingestão falhar N
  vezes seguidas.
- CI/CD: GitHub Actions builda imagens, roda testes + auditoria de dependências (adaptar
  `.github/workflows/ci.yml` existente para o monorepo novo); deploy via SSH definido na Fase 6,
  quando o host for escolhido.

## Roadmap de fases

1. **Fase 0 — Fundação**: scaffold do monorepo, Docker Compose local (Postgres/TimescaleDB),
   esqueleto das camadas hexagonais com testes de exemplo, CI básico.
2. **Fase 1 — Dados**: schema TimescaleDB (Alembic), hypertable `sensor_readings` + continuous
   aggregates, migração/backfill completo de `day`/`hour`/`hour_up`/`aqmatrix`/`mun_days_up` e da
   ingestão bruta (`sc_padata.tb_parealtimedata`) para o schema novo.
3. **Fase 2 — Ingestão**: casos de uso `ingest_realtime_purpleair` (10-15min) e
   `backfill_historical_purpleair`, worker APScheduler, `ingestion_runs`.
4. **Fase 3 — API**: endpoints REST (`/readings/current`, `/readings/history`, `/metrics`,
   `/sensors`, `/municipios`) + autenticação admin (login, sessão, seed do primeiro admin).
5. **Fase 4 — Frontend core**: shell mobile-first, design portado do Figma, páginas de
   home/município/sensores/publicações, consumindo a API.
6. **Fase 5 — Admin**: login, CRUD de sensores, painel de status de ingestão.
7. **Fase 6 — Hardening & deploy**: Nginx + headers de segurança + firewall + backups + CI/CD,
   escolha e publicação no host de produção definitivo.
8. **Fase 7 — Corte**: paralelo por período de validação, depois desativar o Next.js/Node
   (`airquality-app`) e apontar DNS para a nova stack.

## Fora de escopo

- PWA/cache offline.
- Alertas por e-mail (não existe hoje no `airquality-app`, não introduzido nesta migração).
- Integração com SSO/LDAP.
- Cadastro público de usuários admin.
