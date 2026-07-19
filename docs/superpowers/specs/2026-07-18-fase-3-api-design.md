# Fase 3 — API (design)

**Status:** aprovado
**Depende de:** Fase 1a (schema TimescaleDB + continuous aggregates), Fase 2 (ingestão real-time +
backfill, `PurpleAirClient`)
**Código-alvo:** `airquality-js-app/backend`

## Contexto

Fases 0-2 entregaram schema, ingestão real-time e backfill histórico. Não existe ainda nenhuma
rota HTTP além de `/health` e `/sensors` (Fase 0). Esta fase expõe os dados já coletados via API
REST (consumida pelo frontend na Fase 4) e constrói a base de autenticação admin (usada pelo CRUD
de sensores na Fase 5 — esta fase entrega login/sessão/seed, não rotas de mutação).

## Endpoints públicos de leitura

Todos sem autenticação. Nenhum retorna dado bruto de `sensor_readings` — sempre via continuous
aggregate (decisão confirmada: app antigo sempre exibiu média por município, nunca sensor
individual; e os continuous aggregates já são a fonte rápida e sempre atualizada, construída
justamente pra isso na Fase 1a).

### `GET /readings/current`

Última leitura horária disponível por município.

- Sem parâmetro obrigatório.
- Fonte: `municipio_hourly_pm25`, último `bucket` por `municipio`.
- Resposta: `[{"municipio": str, "bucket": datetime ISO8601, "pm2_5_avg": float}]`

### `GET /readings/history`

Série temporal.

- Query params:
  - `start` (obrigatório, `YYYY-MM-DD`)
  - `end` (obrigatório, `YYYY-MM-DD`, inclusivo do dia inteiro)
  - `granularity` (opcional, `hourly` default ou `daily`)
  - `municipio` (opcional, filtra por município exato)
- Limite máximo de intervalo: **90 dias** pra `granularity=hourly`, **2 anos** pra
  `granularity=daily`. Fora disso, `422` com mensagem explicando o limite.
- Fonte: `granularity=hourly` → `municipio_hourly_pm25` (`{municipio, bucket, pm2_5_avg}`).
  `granularity=daily` → `who_exceedance_days` (`{municipio, bucket, pm2_5_avg,
  exceeds_who_threshold}` — superset de `municipio_daily_pm25`, já inclui o flag OMS junto).
- Resposta: lista dos objetos acima, ordenada por `bucket` crescente.

### `GET /metrics/month-hour-matrix`

Substitui o `aqmatrix` do app antigo (existia no schema mas nunca foi populado — `aqMatrix()` em
`purpleairFunctions.py:365-412` nunca foi conectada a nenhum script). Mostra quais combinações de
mês/hora do dia concentram mais horas com PM2.5 acima do limite OMS, histórico completo.

- Sem parâmetro.
- Calculado **ao vivo** a cada request (testado: ~0.1s mesmo sobre 934k linhas de
  `municipio_hourly_pm25`) — sem tabela nova, sem job agendado, sempre atualizado automaticamente
  conforme a ingestão real-time grava dado novo:
  ```sql
  SELECT EXTRACT(MONTH FROM bucket) AS mes, EXTRACT(HOUR FROM bucket) AS hora, COUNT(*) AS total
  FROM municipio_hourly_pm25
  WHERE pm2_5_avg > 15
  GROUP BY mes, hora
  ```
- Resposta: `[{"mes": int (1-12), "hora": int (0-23), "total": int}]` — 288 células, zero-preenchidas
  onde não há excedência (mes/hora sem nenhuma linha na query acima entram com `total: 0`).

### `GET /metrics/municipio-year-exceedance`

Substitui o iframe externo do Datawrapper (`https://datawrapper.dwcdn.net/P78sH/14/`,
hardcoded em `frontend/src/components/munupcard/index.tsx:16-26` do app antigo — nunca foi gerado
pela aplicação, alguém calculou uma vez com `countPm25UpWhoMunDrapper()`
(`purpleairFunctions.py:520-545`, também nunca chamada em produção) e subiu manualmente pro
Datawrapper). Dias por ano com PM2.5 acima do limite OMS, por município.

- Sem parâmetro.
- Calculado ao vivo, mesma lógica de custo baixo (~0.1s testado sobre `who_exceedance_days`, 40k+
  linhas):
  ```sql
  SELECT municipio, EXTRACT(YEAR FROM bucket) AS ano,
         COUNT(*) FILTER (WHERE exceeds_who_threshold) AS dias_acima_oms
  FROM who_exceedance_days
  GROUP BY municipio, ano
  ORDER BY municipio, ano
  ```
- Resposta: `[{"municipio": str, "ano": int, "dias_acima_oms": int}]`
- Valores conferidos manualmente contra `data-P78sH.csv` (export do Datawrapper antigo) —
  bateram exato pra 2019-2023 (ex: Acrelândia 23/61/67/64/67).

### `GET /municipios`

Lista de municípios distintos com sensor ativo.

- Fonte: `SELECT DISTINCT municipio FROM sensors WHERE active = true ORDER BY municipio`.
- Resposta: `["Acrelândia", "Assis Brasil", ...]`

### `GET /sensors`

Já existe (Fase 0). Sem mudança nesta fase.

## Hardening do `PurpleAirClient` (Fase 2, ajustado aqui)

PurpleAir cobra pontos da API key por **volume de dado baixado**, mesmo quando o dado acaba não
sendo aproveitado. Dois problemas identificados na implementação da Fase 2:

1. **Retry indiscriminado**: `_request_with_retry` (`purpleair_api_client.py:128-138`) captura
   `httpx.HTTPError` genericamente — erro 4xx (chave inválida, parâmetro malformado) entra no
   mesmo retry de 5 tentativas que um erro 5xx transitório, mesmo sendo determinístico (retry não
   resolve request malformada, garante repetir o mesmo erro 5x). **Fix**: só entra no loop de
   retry para `httpx.HTTPStatusError` com `response.status_code >= 500`, ou
   `httpx.TransportError`/`httpx.TimeoutException`. Erro 4xx propaga na primeira tentativa.

2. **Perda de dado já pago em `fetch_history`**: acumula todas as janelas de 30 dias num `readings`
   local e só devolve (`return readings`) depois que TODAS as janelas do sensor tiverem sucesso —
   se a janela N falhar, as janelas 1..N-1 (já baixadas e pagas) são descartadas silenciosamente
   (a exceção propaga sem devolver nada). **Fix**: `fetch_history` devolve/expõe cada janela assim
   que baixada — muda de `list[dict]` retornado no final para um generator
   (`Iterator[list[dict]]`, um `yield` por janela de 30 dias). `BackfillHistoricalPurpleAir`
   itera o generator e chama `bulk_insert` a cada janela recebida, não uma vez por sensor —
   assim, se a janela N falhar, as janelas 1..N-1 já estão persistidas no banco antes da exceção
   subir. `total_inserted` (usado em `finish(run_id, "failed", total_inserted)`) passa a refletir
   progresso real por janela, não só por sensor completo.

   Isso muda a assinatura do port `PurpleAirClient.fetch_history` (de `-> list[dict]` para
   `-> Iterator[list[dict]]`) — quebra de contrato deliberada e justificada, revisada nesta fase.

## Autenticação admin

### Schema

`admin_sessions` (criada na Fase 1a, migration 0004) tem hoje `id, admin_id, expires_at,
created_at` — falta uma coluna de identificador de sessão seguro (usar o `id` sequencial como
credencial de cookie seria enumerável/adivinhável). Nova migration `0007`:

```sql
ALTER TABLE admin_sessions ADD COLUMN token_hash text NOT NULL;
CREATE UNIQUE INDEX ix_admin_sessions_token_hash ON admin_sessions (token_hash);
```

- Token: 32 bytes aleatórios (`secrets.token_urlsafe(32)`), gerado no login.
- Cookie carrega o token bruto. Banco guarda só `sha256(token)` — vazamento do banco não expõe
  sessão utilizável diretamente.

### Senha

- `argon2-cffi` (nova dependência em `requirements.txt`). Hash `argon2id` em `admin_users.password_hash`.

### Sessão

- Cookie `httpOnly` + `Secure` + `SameSite=Strict`, nome `admin_session`.
- Expiração: 8h desde a criação, renovada (sliding) a cada request autenticado válido — cada
  chamada a `GET /auth/me` (ou qualquer rota protegida futura) que validar a sessão estende
  `expires_at` pra `now() + 8h`.
- `admin_users.last_login` atualizado no login bem-sucedido.

### Rate limiting no login

- Em memória (dict `{ip: [timestamps]}` no processo do backend, sem Redis — decisão confirmada,
  mesma linha do nokekoi: sem caso de uso pra infra nova, YAGNI). 5 tentativas falhas / 15min por
  IP; excedido, `429`.
- Limitação aceita: reseta se o backend reiniciar, não funciona com múltiplas réplicas — não é o
  caso deste projeto (uma instância só).

### CSRF

- `SameSite=Strict` cobre a maior parte do risco pra esta fase. Header customizado de verificação
  fica pra Fase 5 — é quando existem rotas de mutação (CRUD de sensores) pra proteger; nesta fase
  só existem `login`/`logout`/`me`, nada que um CSRF header adicional protegeria além do que
  `SameSite=Strict` já cobre.

### Seed do primeiro admin

- CLI, não rota pública: `python -m infrastructure.create_admin --email <email> --password <senha>`.
  Hash argon2id, insere em `admin_users`.

### Rotas

- `POST /auth/login` — body `{email, password}`. Sucesso: seta cookie, `200 {"email": str}`.
  Falha: `401`, conta pra rate limit.
- `POST /auth/logout` — invalida a sessão (`DELETE FROM admin_sessions WHERE token_hash = ...`),
  limpa cookie.
- `GET /auth/me` — `200 {"email": str}` se sessão válida (e renova expiração), `401` caso
  contrário.
- Dependency FastAPI `get_current_admin` — valida cookie contra `admin_sessions`, vira o guard
  reutilizável pelas rotas protegidas da Fase 5.

## Testes

- **Repositórios de leitura**: populam `sensor_readings` de teste (`airquality_test`), chamam
  `refresh_continuous_aggregate`, testam contra dado real — mesmo padrão já usado nos testes de
  migration da Fase 1a (`test_continuous_aggregates_migration.py`).
- **Rotas de leitura**: `TestClient`, casos felizes + validação de parâmetro (`start`/`end`
  obrigatórios em `/readings/history`, limite de intervalo excedido → `422`).
- **`/metrics/*`**: valores exatos contra dado semeado manualmente (não só "retorna 200").
- **Auth**: login certo/errado, cookie setado com atributos corretos, `/auth/me` com/sem sessão
  válida, expiração (sessão vencida → `401`), rate limit estourando (`429` na 6ª tentativa em
  15min), logout invalida sessão (tentativa seguinte com o mesmo cookie → `401`).
- **`PurpleAirApiClient`**: teste de retry seletivo (mock 400 → não repete; mock 503 → repete
  até `MAX_RETRIES`); teste de persistência incremental (mock janela 2 de 3 falhando → janela 1
  já foi `yield`ada antes da exceção, prova que não se perde).

## Fora de escopo

- CRUD de sensores (rotas de mutação admin) — Fase 5.
- Frontend consumindo estes endpoints — Fase 4.
- CSRF header customizado — Fase 5 (junto com as primeiras rotas de mutação).
- Alertas por e-mail se worker de ingestão falhar N vezes seguidas — mencionado na spec mestre,
  não levantado nesta fase, fica pra quando o painel admin (Fase 5) existir.
