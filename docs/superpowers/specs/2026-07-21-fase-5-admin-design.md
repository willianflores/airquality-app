# Fase 5 — Admin (airquality-js-app): design

## Contexto

O roadmap da migração (`2026-07-17-migracao-react-python-hexagonal-design.md`) define a Fase 5 como:
"Admin: login, CRUD de sensores, painel de status de ingestão." As Fases 0-4 estão completas
(fundação, dados, ingestão, API, frontend core). O backend de autenticação já existe da Fase 3:

- `POST /auth/login` — email+senha, seta cookie `admin_session` (httpOnly, Secure, SameSite=Strict,
  ~8h, argon2id, rate limit 5 tentativas/15min).
- `GET /auth/me` — retorna o admin autenticado (também estende a sessão).
- `POST /auth/logout` — apaga a sessão.
- `get_current_admin` — dependency FastAPI reutilizável para proteger rotas novas.
- CLI `create-admin` — único jeito de criar admin (sem cadastro público).

O que falta e é o escopo desta fase:

1. CRUD de sensores (só `list_active()`/`ListSensors` existe hoje — read-only).
2. Leitura do status de ingestão (`ingestion_runs` só tem `start()`/`finish()` — sem método de
   listagem).
3. Frontend admin inteiro (login, rotas protegidas, telas de sensores e ingestão) — não existe nada
   ainda.
4. Gatilho de backfill histórico para sensor novo, reaproveitando `BackfillHistoricalPurpleAir`
   (Fase 2), hoje só acionável via CLI.

## Decisões

- **Sensor CRUD é soft-delete only.** Desativar = `UPDATE sensors SET active = false`. Não existe
  hard-delete nesta fase — `sensor_index` é referenciado por potencialmente milhões de linhas em
  `sensor_readings`; apagar de verdade não tem ganho real e é irreversível. Reativar é o mesmo UPDATE
  de volta pra `true`.
- **`sensor_index` é imutável após a criação.** É o identificador externo do PurpleAir que amarra o
  sensor ao seu histórico em `sensor_readings`. Editável na criação, bloqueado na edição. Campos
  editáveis depois de criado: `code`, `name`, `municipio`, `latitude`, `longitude`, `active`.
- **Backfill de sensor novo fica atrelado ao formulário de criação**, não um formulário solto no
  painel de ingestão. Ao criar um sensor, a UI oferece "rodar backfill agora" (data início
  informada pelo usuário até hoje) para aquele sensor específico. Não existe backfill genérico
  (qualquer sensor + qualquer intervalo) nesta fase — reduz risco de re-rodar backfill de um sensor
  antigo por engano e gastar pontos de API do PurpleAir sem necessidade.
- **Painel de ingestão é somente leitura** — lista os últimos N `ingestion_runs` (fonte, início, fim,
  status, registros ingeridos). A única ação de escrita relacionada a ingestão nesta fase é o gatilho
  de backfill acima, que é per-sensor-novo, não uma ação solta do painel.
- **Backfill roda em background, não bloqueia a request HTTP.** `POST /admin/sensors/{id}/backfill`
  dispara via `BackgroundTasks` do FastAPI e retorna `202` com o `ingestion_runs.id` imediatamente.
  O admin acompanha o progresso pelo painel de status (que já vai listar esse run).
- **Layout do admin é um shell separado**, sem sidebar/nav pública. `/admin/login` e `/admin/*` não
  aparecem no menu do site público (`AppShell`) — são uma área interna à parte.
- **CSRF: `SameSite=Strict` basta por agora.** Já bloqueia o cenário real (navegador não manda o
  cookie em request cross-site). Header customizado de defesa em profundidade fica pra Fase 6
  (Hardening), que é a fase que existe pra isso — não duplicar esforço agora.
- **Sem rota pública de cadastro de admin** (mantido da Fase 3) — só CLI.

## Backend

### `SensorRepository` (port) — métodos novos

```python
class SensorRepository(ABC):
    def list_active(self) -> list[Sensor]: ...      # já existe, usado pelas rotas públicas
    def list_all(self) -> list[Sensor]: ...          # novo — admin vê ativos + inativos
    def create(self, sensor: NewSensor) -> Sensor: ...    # novo
    def update(self, sensor_id: int, fields: SensorUpdate) -> Sensor: ...  # novo, sensor_index não é campo aceito
    def set_active(self, sensor_id: int, active: bool) -> Sensor: ...  # novo
```

`NewSensor`/`SensorUpdate` são objetos de valor simples (dataclasses) com os campos aceitos em cada
operação — `NewSensor` inclui `sensor_index` (obrigatório, só na criação), `SensorUpdate` não.

### Casos de uso novos

- `CreateSensor` — valida `code`/`sensor_index` únicos (erro de domínio se duplicado), delega ao
  repositório.
- `UpdateSensor` — recebe só os campos editáveis; rejeita se o payload tentar mudar `sensor_index`
  (erro de domínio, não erro de validação HTTP — mantém a regra no domínio, não no adapter).
- `SetSensorActive` — toggle simples.
- `ListAllSensors` — para a tela admin (inclui inativos).

`BackfillHistoricalPurpleAir` (Fase 2) é reaproveitado sem mudança — só passa a ser chamado também
por uma rota HTTP além do CLI.

### `IngestionRunRepository` (port) — método novo

```python
def list_recent(self, limit: int = 50) -> list[IngestionRun]: ...
```

Novo caso de uso `GetIngestionStatus` (wrapper fino, mantém o padrão hexagonal — rota nunca chama
repositório direto).

### Rotas HTTP novas (`adapters/inbound/http/admin_sensors_router.py`,
`admin_ingestion_router.py`), todas atrás de `Depends(get_current_admin)`:

| Rota | Método | Descrição |
|---|---|---|
| `/admin/sensors` | GET | Lista todos os sensores (ativos + inativos) |
| `/admin/sensors` | POST | Cria sensor |
| `/admin/sensors/{id}` | PATCH | Edita campos (não aceita `sensor_index`) |
| `/admin/sensors/{id}/active` | PATCH | Liga/desliga (`{"active": bool}`) |
| `/admin/sensors/{id}/backfill` | POST | Dispara backfill em background, `{"start_date": "YYYY-MM-DD"}`, retorna `202 {"ingestion_run_id": int}` |
| `/admin/ingestion-runs` | GET | Últimos N runs (query param `limit`, default 50) |

Erros: `401` sem sessão válida (já coberto por `get_current_admin`); `409` em `code`/`sensor_index`
duplicado na criação; `422` em payload de edição tentando mudar `sensor_index`; `404` em
id inexistente.

## Frontend

### Estrutura nova

```
frontend/src/ui/admin/
├── AdminShell.tsx           # layout próprio (nav: Sensores / Ingestão / Sair), sem sidebar pública
├── RequireAdminAuth.tsx     # wrapper: GET /auth/me no mount; spinner enquanto carrega;
│                            #   401 -> redirect /admin/login; ok -> renderiza children
├── AdminLoginPage.tsx       # rota pública /admin/login, form email+senha -> POST /auth/login
├── AdminSensoresPage.tsx    # tabela (ativos+inativos), criar/editar/desativar,
│                            #   form de criação com opção "rodar backfill agora"
└── AdminIngestaoPage.tsx    # tabela somente-leitura dos últimos runs, refresh via polling (10s)
```

### Rotas (`App.tsx`)

- `/admin/login` — pública.
- `/admin`, `/admin/sensores`, `/admin/ingestao` — dentro de `RequireAdminAuth`, usando `AdminShell`
  como layout (independente do `AppShell` público).

### `api-client.ts` — funções novas

`login(email, password)`, `logout()`, `fetchMe()`, `fetchAdminSensors()`, `createSensor(data)`,
`updateSensor(id, fields)`, `setSensorActive(id, active)`, `triggerBackfill(id, startDate)`,
`fetchIngestionRuns(limit?)`. Todas usam `credentials: 'include'` (cookie de sessão precisa ir
junto; CORS já tem `allow_credentials=True` da Fase 3).

## Testes

Mesmo padrão da Fase 3: casos de uso testados com fakes das portas (sem FastAPI/DB), rotas testadas
com `TestClient` contra `airquality_test` real. Cobertura mínima:

- Criar/editar/desativar sensor via caso de uso e via rota.
- Edição rejeitando tentativa de mudar `sensor_index`.
- `list_all()` inclui inativos; `list_active()` (rota pública existente) continua ignorando-os —
  sem regressão.
- Backfill dispara `BackgroundTasks` (verificado via mock/spy, não espera o backfill completar de
  verdade no teste) e cria linha em `ingestion_runs` com status inicial antes de retornar `202`.
- Todas as rotas `/admin/*` retornam `401` sem cookie de sessão válido.
- Frontend: `RequireAdminAuth` redireciona sem sessão e renderiza com sessão (mock de `fetchMe`).

## Fora de escopo (fica pra Fase 6 ou depois)

- Header CSRF customizado (SameSite=Strict já cobre o risco real por agora).
- Backfill genérico (qualquer sensor + qualquer intervalo) fora do fluxo de criação.
- Alertas por e-mail se o worker de ingestão falhar (mencionado na spec original como parte do
  hardening de deploy, não desta fase).
- Hard-delete de sensor.
