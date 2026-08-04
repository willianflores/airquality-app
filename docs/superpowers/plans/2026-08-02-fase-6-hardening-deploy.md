# Fase 6 — Hardening & Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Tasks 1–5 são código e vão pra fila de subagentes. O "Runbook de deploy" no final NÃO é uma tarefa de subagente — é executado diretamente pelo controller (com o humano), depois que as Tasks 1–5 estiverem revisadas e no `main`.**

**Goal:** Levar a stack `airquality-js-app` (React + Python hexagonal, Fases 0–5 + publicações)
pro servidor de produção (`srv-nokekoi`), com domínio próprio (`acrequalidadedoar.ufac.br`),
Docker Compose, Nginx reaproveitado do host, CI/CD manual, backups locais, e o dado real
(sensores, histórico, admin, publicações) migrado do Postgres local via `pg_dump`/`pg_restore`.

**Architecture:** Ver `docs/superpowers/specs/2026-08-02-fase-6-hardening-deploy-design.md`.
Resumo: o Nginx do host (já existe no servidor, já gerencia certbot para `nokekoi.ufac.br`) ganha
um bloco novo de `server_name acrequalidadedoar.ufac.br` fazendo proxy pra dois containers Docker
novos (frontend estático + backend FastAPI), que conversam com um terceiro container Postgres
(TimescaleDB) não exposto publicamente. Diferente do deploy do nokekoi, não há nada rodando hoje
nesse domínio — vai direto pra porta 443, sem porta alternativa de transição. O worker de
ingestão sobe definido no Compose mas não é iniciado automaticamente.

**Tech Stack:** Docker + Docker Compose (imagens já existentes `frontend/Dockerfile` e
`backend/Dockerfile`, reaproveitadas — não cria imagens novas), GitHub Actions
(`workflow_dispatch`), Nginx (host), certbot, bash (script de backup).

## Global Constraints

- **Servidor de produção**: `srv-nokekoi` (`200.129.173.88`, porta SSH `22024`, usuário
  `srvadmin`). Acesso SSH já funciona neste ambiente com a chave já configurada. Docker **já está
  instalado** nesse servidor (`29.6.1`, reaproveitado do deploy do nokekoi) — nenhuma task instala
  Docker de novo.
- **Checagem de capacidade feita durante o desenho** (2026-08-02, via SSH): disco 57G total / 38G
  livres (31% em uso), RAM 7,8Gi total / 6,6Gi disponível, 4 vCPUs — margem confortável para uma
  segunda stack Docker ao lado da stack do nokekoi. Repetir esta checagem formalmente no Runbook
  antes do deploy real (o cenário pode mudar entre o desenho e a execução).
- **Conflito de porta confirmado com a stack do nokekoi, já rodando no mesmo servidor**: o
  `docker-compose.prod.yml` do nokekoi publica `127.0.0.1:8000` (backend) e `127.0.0.1:8080`
  (frontend) — confirmado ao vivo via `ss -ltnp` no servidor. **O compose desta fase usa portas
  diferentes: `127.0.0.1:8001` (backend) e `127.0.0.1:8081` (frontend)**, para não colidir.
- **Nenhuma task desta fase aplica mudança nenhuma no servidor de produção real.** Tasks 1–5
  produzem/modificam arquivos no repositório (`frontend/`, `infra/`, `.github/workflows/`),
  testados localmente. Configurar o servidor (Nginx, certbot, `ufw`, crontab, GitHub Secrets,
  `pg_dump`/`pg_restore`, backfill) é o "Runbook de deploy" no final — executado manualmente, fora
  do fluxo de subagentes, com confirmação explícita do usuário antes de cada ação que toque o
  servidor real.
- **Frontend chama a API por caminho relativo (`/api`) em produção.** `frontend/src/infrastructure/
  api-client.ts:7` já lê `import.meta.env.VITE_API_URL ?? 'http://localhost:8000'` — em dev local
  (sem build-arg) continua caindo no fallback `http://localhost:8000`, sem mudança de
  comportamento; em produção, o build passa `VITE_API_URL=/api` (Task 1), e o Nginx do host
  encaminha `/api/*` pro backend na mesma origem — sem CORS cross-origin em produção.
- **CORS do backend não precisa mudar.** `infrastructure/main.py:22` tem
  `allow_origins=["http://localhost:5173"]` fixo pro dev local — como front e API ficam na mesma
  origem em produção (via proxy `/api`), o navegador nunca faz requisição cross-origin contra o
  backend, então o CORS middleware nem é acionado. Não mexer nesse arquivo nesta fase.
- **Cookie de sessão do admin já está pronto para HTTPS.** `adapters/inbound/http/
  auth_router.py:56,82` já usa `secure=True, samesite="strict"` — funciona em produção (HTTPS)
  sem mudança; **login admin não funciona em HTTP puro** (mais um motivo pra ir direto com
  certbot, não pular etapa de TLS).
- **Única fonte de tiles do mapa**: `https://{s}.tile.openstreetmap.org` (`frontend/src/ui/
  components/SensorMap.tsx:23` e `SensorNetworkMap.tsx:28`, subdomínios `a`/`b`/`c`) — qualquer CSP
  escrita nesta fase libera `https://*.tile.openstreetmap.org` em `img-src`. Imagens/PDFs de
  publicações são servidos pelo próprio backend sob `/api/media/...` (mesma origem, não precisa de
  exceção adicional na CSP).
- **Dado real já existe, só localmente.** O Postgres local de desenvolvimento tem sensores,
  histórico de leituras reais, admin(s) e publicações já migradas — o Postgres de produção não
  começa vazio: recebe um `pg_dump`/`pg_restore` do banco local antes de qualquer backfill (ver
  Runbook).
- **Worker de ingestão não inicia sozinho.** Desde a reforma de ingestão de 2026-08-03,
  `worker/main.py` roda dois jobs agendados — arquivo (`IngestArchivePurpleAir`, horário, janela
  por watermark com piso `archive_min_start_date` e teto `archive_max_window_days`) e status
  (`RefreshSensorStatus`, a cada 30min, grava em `sensor_status`) — não mais um processo único de
  "tempo real" (`IngestRealtimePurpleAir` foi removido nessa reforma). O Compose de produção
  define o serviço `worker` com `profiles: ["manual"]`, e o `docker compose up` do Runbook **não
  inclui `worker`** na lista de serviços subidos. Só é iniciado depois, como passo manual
  separado, mediante autorização explícita do usuário. Ver
  `backend/worker/README.md` pra operação detalhada dos dois jobs.
- **Backfill do gap (dez/2025 até hoje) roda no servidor**, não localmente — evita abrir uma
  segunda janela de defasagem entre o fim de um backfill local e o início da ingestão real no
  servidor.
- **Retenção de backup: 3 dias** (decisão do usuário, ajustada durante o brainstorming desta
  fase — não 7 dias como no precedente do nokekoi).
- Todo texto voltado a usuário final (comentários de config, mensagens de commit) em português,
  consistente com o resto do repositório.

## File Structure

```text
frontend/
├── Dockerfile                       # Modify (Task 1): ARG VITE_API_URL + COPY nginx-spa.conf
└── nginx-spa.conf                   # Create (Task 1): fallback SPA pro react-router-dom

infra/
├── docker-compose.prod.yml          # Create (Task 2)
├── .env.prod.example                # Create (Task 2)
├── nginx-acrequalidadedoar.conf     # Create (Task 3): referência p/ instalar manualmente no host
└── scripts/
    ├── backup-postgres.sh           # Create (Task 4)
    └── crontab-airquality-prod      # Create (Task 4): referência das linhas de cron a adicionar

.github/workflows/
└── deploy.yml                       # Create (Task 5)
```

---

### Task 1: `frontend/Dockerfile` — build-time API URL + fallback SPA

**Files:**
- Modify: `frontend/Dockerfile`
- Create: `frontend/nginx-spa.conf`

**Interfaces:**
- Consumes: `frontend/package.json` (script `build`: `tsc -b && vite build`, gera
  `frontend/dist/`), `frontend/src/infrastructure/api-client.ts:7`
  (`import.meta.env.VITE_API_URL ?? 'http://localhost:8000'`). App usa `react-router-dom` com
  `BrowserRouter` — rotas client-side (`/sensores`, `/municipio`, `/publicacoes`, `/admin/*`),
  então o servidor estático precisa de fallback pra `index.html` em qualquer rota não encontrada,
  senão recarregar a página numa rota interna dá 404.
- Produces: imagem Docker Nginx servindo os arquivos estáticos na porta `80`, com
  `VITE_API_URL` configurável via `--build-arg` (default `http://localhost:8000`, preservando o
  comportamento atual do build local/dev sem nenhum argumento extra).

**Contexto importante:** hoje o `docker-compose.yml` de dev (`infra/docker-compose.yml`) builda
esse mesmo Dockerfile sem passar nenhum build-arg — o default precisa reproduzir exatamente o
valor que o app já usa hoje em dev (`http://localhost:8000`), senão o ambiente local quebra.

- [ ] **Step 1: Escrever o Nginx interno do container (SPA fallback)**

`frontend/nginx-spa.conf`:
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Modificar o Dockerfile**

`frontend/Dockerfile` (conteúdo completo):
```dockerfile
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 3: Validar que o build de dev local continua idêntico (sem build-arg)**

Run (a partir de `frontend/`):
```bash
docker build -t airquality-frontend-devcheck .
docker run --rm -d --name airquality-frontend-devcheck -p 18080:80 airquality-frontend-devcheck
sleep 2
docker exec airquality-frontend-devcheck grep -o 'http://localhost:8000' /usr/share/nginx/html/assets/*.js | head -1
curl -sf http://localhost:18080/ | grep -q '<div id="root">' && echo "index OK"
curl -sf http://localhost:18080/sensores | grep -q '<div id="root">' && echo "SPA fallback OK"
docker stop airquality-frontend-devcheck
docker rmi airquality-frontend-devcheck
```
Expected: o `grep` dentro do container encontra `http://localhost:8000` no bundle JS (confirma
que o default do `ARG` preservou o comportamento atual sem build-arg); as duas linhas `... OK`
aparecem (index estático servido e fallback SPA funcionando pra rota interna do
`react-router-dom`).

- [ ] **Step 4: Validar que passar um build-arg novo funciona (simulação do build de produção)**

Run (a partir de `frontend/`):
```bash
docker build --build-arg VITE_API_URL=/api -t airquality-frontend-prodcheck .
docker run --rm -d --name airquality-frontend-prodcheck -p 18081:80 airquality-frontend-prodcheck
sleep 2
docker exec airquality-frontend-prodcheck grep -o '"/api"' /usr/share/nginx/html/assets/*.js | head -1
docker stop airquality-frontend-prodcheck
docker rmi airquality-frontend-prodcheck
```
Expected: o `grep` encontra `"/api"` no bundle (confirma que o build-arg de produção é aplicado
corretamente).

- [ ] **Step 5: Commit**

```bash
git add frontend/Dockerfile frontend/nginx-spa.conf
git commit -m "feat(infra): build-arg VITE_API_URL e fallback SPA no Dockerfile do frontend"
```

---

### Task 2: `docker-compose.prod.yml` + `.env.prod.example`

**Files:**
- Create: `infra/docker-compose.prod.yml`
- Create: `infra/.env.prod.example`

**Interfaces:**
- Consumes: `backend/Dockerfile` (já existe, `CMD uvicorn infrastructure.main:app --host 0.0.0.0
  --port 8000`), `frontend/Dockerfile` (Task 1, agora aceita `VITE_API_URL` via build-arg),
  imagem `timescale/timescaledb:2.17.2-pg16` (mesma versão de `infra/docker-compose.yml` de dev),
  `GET /health` do backend (`adapters/inbound/http/health_router.py`, já existe, pro
  healthcheck).
- Produces: quatro serviços (`postgres`, `backend`, `worker`, `frontend`) numa rede Docker
  isolada (projeto `airquality_js_prod`); `backend` publica só em `127.0.0.1:8001`, `frontend` só
  em `127.0.0.1:8081` (portas diferentes das já ocupadas pelo nokekoi — `8000`/`8080` — no mesmo
  servidor); `postgres` não publica porta nenhuma pro host. `worker` **não é incluído** no comando
  `up -d` do Runbook — só existe definido no Compose.

- [ ] **Step 1: Escrever `.env.prod.example`**

```env
POSTGRES_PASSWORD=troque-por-uma-senha-forte-antes-do-deploy
PURPLEAIR_API_KEY=
```

- [ ] **Step 2: Escrever `docker-compose.prod.yml`**

```yaml
name: airquality_js_prod

services:
  postgres:
    image: timescale/timescaledb:2.17.2-pg16
    restart: unless-stopped
    environment:
      POSTGRES_DB: airquality
      POSTGRES_USER: airquality_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - airquality_prod_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U airquality_user -d airquality"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  backend:
    build:
      context: ../backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      ENVIRONMENT: production
      DATABASE_URL: postgresql://airquality_user:${POSTGRES_PASSWORD}@postgres:5432/airquality
      REPORTS_STORAGE_DIR: /app/data/reports
    volumes:
      - airquality_prod_reports_data:/app/data/reports
    ports:
      - "127.0.0.1:8001:8000"
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  worker:
    build:
      context: ../backend
    command: python -m worker.main
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://airquality_user:${POSTGRES_PASSWORD}@postgres:5432/airquality
      PURPLEAIR_API_KEY: ${PURPLEAIR_API_KEY}
      INGEST_INTERVAL_SECONDS: "900"
    depends_on:
      postgres:
        condition: service_healthy
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ../frontend
      args:
        VITE_API_URL: /api
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "127.0.0.1:8081:80"
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  airquality_prod_postgres_data:
  airquality_prod_reports_data:
```

- [ ] **Step 3: Validar a config e subir/derrubar localmente (sem tocar nos containers de dev já
  rodando)**

Run (a partir da raiz do repo, `airquality-js-app/`):
```bash
cp infra/.env.prod.example /tmp/airquality-env-prod-test
sed -i 's/troque-por-uma-senha-forte-antes-do-deploy/senha-de-teste-local/' /tmp/airquality-env-prod-test

docker compose -f infra/docker-compose.prod.yml --env-file /tmp/airquality-env-prod-test config
docker compose -f infra/docker-compose.prod.yml --env-file /tmp/airquality-env-prod-test up -d --build postgres backend frontend
sleep 5
docker compose -f infra/docker-compose.prod.yml --env-file /tmp/airquality-env-prod-test ps
curl -sf http://127.0.0.1:8001/health
curl -sf http://127.0.0.1:8081/ | grep -q '<div id="root">' && echo "frontend OK"
docker compose -f infra/docker-compose.prod.yml --env-file /tmp/airquality-env-prod-test down -v
rm /tmp/airquality-env-prod-test
```
Expected: `config` sem erro; `ps` mostra `postgres`/`backend`/`frontend` `healthy`/`running` (sem
`worker`, que não foi incluído no `up`); `/health` retorna `{"status":"ok"}`; frontend responde
com o HTML; `down -v` limpa tudo, inclusive o volume (teste local descartável). Confirme antes e
depois que os containers de dev (`airquality_js_postgres`, `airquality_js_backend`, etc.) e do
nokekoi continuam rodando sem interrupção (`docker ps`).

- [ ] **Step 4: Commit**

```bash
git add infra/docker-compose.prod.yml infra/.env.prod.example
git commit -m "feat(infra): adicionar docker-compose de produção"
```

---

### Task 3: Configuração Nginx do host para `acrequalidadedoar.ufac.br`

**Files:**
- Create: `infra/nginx-acrequalidadedoar.conf`

**Interfaces:**
- Consumes: portas publicadas pela Task 2 (`127.0.0.1:8001` backend, `127.0.0.1:8081` frontend).
- Produces: um arquivo de referência copiado manualmente pra
  `/etc/nginx/sites-available/acrequalidadedoar` no servidor durante o Runbook — **sem
  `ssl_certificate` ainda**, porque o certificado deste domínio não existe até o `certbot --nginx`
  rodar (diferente do nokekoi, que reaproveitou um certificado já emitido). O Runbook usa
  `certbot --nginx` para emitir o certificado e reescrever este arquivo automaticamente com o
  bloco `:443` e o redirect de `:80`.

- [ ] **Step 1: Escrever o arquivo de configuração (HTTP puro — certbot adiciona o HTTPS)**

```nginx
server {
    listen 80;
    server_name acrequalidadedoar.ufac.br;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'" always;

    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8081/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- [ ] **Step 2: Validar sintaxe localmente (sem os certificados reais, só estrutura)**

Este arquivo referencia portas que só existem depois do compose de produção estar de pé no
servidor — não dá pra rodar `nginx -t` de verdade nesta máquina. Validação nesta task é manual:
releia o arquivo e confirme que (a) o `server_name` é `acrequalidadedoar.ufac.br`, (b) os dois
`location` apontam pras portas certas da Task 2 (`8001`/`8081`), (c) a CSP inclui
`*.tile.openstreetmap.org`. A validação real com `nginx -t` e a emissão do certificado acontecem
no Runbook de deploy, no servidor.

- [ ] **Step 3: Commit**

```bash
git add infra/nginx-acrequalidadedoar.conf
git commit -m "feat(infra): adicionar config Nginx de referência para acrequalidadedoar.ufac.br"
```

---

### Task 4: Script de backup + referência de crontab

**Files:**
- Create: `infra/scripts/backup-postgres.sh`
- Create: `infra/scripts/crontab-airquality-prod`

**Interfaces:**
- Consumes: `docker compose -f infra/docker-compose.prod.yml exec -T postgres pg_dump ...`
  (serviço `postgres` da Task 2).
- Produces: `infra/scripts/backup-postgres.sh` (executável, `chmod +x`), com retenção de **3
  dias**, e um arquivo de referência (não aplicado automaticamente) com as linhas de cron a
  adicionar no servidor.

- [ ] **Step 1: Escrever o script de backup**

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/srvadmin/airquality-prod-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-3}"
COMPOSE_FILE="${COMPOSE_FILE:-/home/srvadmin/airquality-js-app/infra/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-/home/srvadmin/airquality-js-app/infra/.env.prod}"
POSTGRES_USER="${POSTGRES_USER:-airquality_user}"
POSTGRES_DB="${POSTGRES_DB:-airquality}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="$BACKUP_DIR/airquality_${TIMESTAMP}.sql.gz"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DUMP_FILE"

echo "Backup salvo em $DUMP_FILE"

find "$BACKUP_DIR" -name "airquality_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete
```

- [ ] **Step 2: Testar a lógica de retenção com um `docker` falso (sem depender do Compose real)**

Este teste é manual (consistente com a decisão do spec de que o backup é validado manualmente,
não por suíte automatizada). Rode numa sessão de shell e confirme o resultado:

```bash
chmod +x infra/scripts/backup-postgres.sh

TMP_DIR="$(mktemp -d)"
mkdir -p "$TMP_DIR/bin"
cat > "$TMP_DIR/bin/docker" <<'EOF'
#!/usr/bin/env bash
echo "-- dump fake --"
EOF
chmod +x "$TMP_DIR/bin/docker"

mkdir -p "$TMP_DIR/backups"
touch -d "5 days ago" "$TMP_DIR/backups/airquality_old.sql.gz"
touch -d "1 day ago" "$TMP_DIR/backups/airquality_recent.sql.gz"

PATH="$TMP_DIR/bin:$PATH" \
BACKUP_DIR="$TMP_DIR/backups" \
COMPOSE_FILE="/dev/null" \
ENV_FILE="/dev/null" \
  ./infra/scripts/backup-postgres.sh

ls "$TMP_DIR/backups"
rm -rf "$TMP_DIR"
```
Expected: `airquality_old.sql.gz` (5 dias, acima da retenção de 3) é removido pelo `find
-mtime +3`; `airquality_recent.sql.gz` (1 dia) permanece; um novo dump
`airquality_<timestamp>.sql.gz` aparece com conteúdo `-- dump fake --` gzipado. Se a retenção não
se comportar assim, corrija o script antes de prosseguir.

- [ ] **Step 3: Escrever a referência de crontab**

`infra/scripts/crontab-airquality-prod`:
```cron
# airquality-js-app (Fase 6) — ADICIONAR esta linha ao crontab de srvadmin (`crontab -e`),
# SEM remover as linhas já existentes do nokekoi-js-app.
30 3 * * * /home/srvadmin/airquality-js-app/infra/scripts/backup-postgres.sh >> /home/srvadmin/logs/airquality-prod-backup.log 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add infra/scripts/backup-postgres.sh infra/scripts/crontab-airquality-prod
git commit -m "feat(infra): adicionar script de backup (retenção 3 dias) e referência de crontab"
```

---

### Task 5: Workflow de deploy manual (GitHub Actions)

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `infra/docker-compose.prod.yml` (Task 2) no servidor (repo já clonado lá — feito no
  Runbook). GitHub Secrets (configurados manualmente no Runbook, não por esta task):
  `DEPLOY_SSH_KEY`, `DEPLOY_SSH_HOST`, `DEPLOY_SSH_PORT`, `DEPLOY_SSH_USER`, `DEPLOY_PATH`.
- Produces: workflow disparado manualmente via `workflow_dispatch` (aba Actions do GitHub) — não
  roda em push/PR, distinto do `.github/workflows/ci.yml` já existente. **Não reinicia o
  `worker`** — só `postgres`, `backend`, `frontend` — preservando o gate manual de ingestão.

- [ ] **Step 1: Escrever o workflow**

```yaml
name: Deploy (manual)

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Configurar chave SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -p ${{ secrets.DEPLOY_SSH_PORT }} ${{ secrets.DEPLOY_SSH_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy no servidor
        run: |
          ssh -i ~/.ssh/id_ed25519 -p ${{ secrets.DEPLOY_SSH_PORT }} ${{ secrets.DEPLOY_SSH_USER }}@${{ secrets.DEPLOY_SSH_HOST }} '
            set -e
            cd ${{ secrets.DEPLOY_PATH }}
            git pull origin main
            docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod build postgres backend frontend
            docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d postgres backend frontend
            docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod exec -T backend alembic upgrade head
          '
```

- [ ] **Step 2: Validar a sintaxe YAML localmente**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo "YAML válido"
```
Expected: `YAML válido`. Este workflow não pode ser testado de ponta a ponta nesta task —
`workflow_dispatch` só roda quando alguém aciona manualmente pela aba Actions do GitHub, depois
que os Secrets existirem (parte do Runbook). Não dispare este workflow como parte desta task.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat(ci): adicionar workflow de deploy manual (workflow_dispatch)"
```

---

## Runbook de deploy (execução manual, fora do fluxo de subagentes)

**Esta seção NÃO é dispatchada a um subagente.** É executada diretamente pelo controller, com o
usuário, depois que as Tasks 1–5 estiverem revisadas e mergeadas no `main`. Cada passo que toca o
servidor de produção real precisa de confirmação explícita antes de rodar.

1. Repetir a checagem de capacidade do servidor (disco/RAM/CPU): `ssh -p 22024 srvadmin@200.129.173.88
   "df -h / && free -h && nproc"` — confirmar que a margem observada no desenho (38G livres, 6,6Gi
   RAM disponível) ainda se sustenta.
2. Confirmar `ufw`: `sudo ufw status` — `22024`/`80`/`443` já devem estar liberadas (herdado do
   hardening feito pro nokekoi); confirmar também `PermitRootLogin no` em `/etc/ssh/sshd_config`
   (já confirmado durante o desenho desta fase) antes de qualquer mudança adicional.
3. Gerar uma chave SSH de deploy dedicada (nova, só pra este fim — não reaproveita a chave pessoal
   nem a chave de deploy já usada pelo nokekoi), adicionar a pública em
   `~/.ssh/authorized_keys` do `srvadmin`, e a privada como secret `DEPLOY_SSH_KEY` no GitHub (via
   `gh secret set` ou pela UI). Configurar também `DEPLOY_SSH_HOST`, `DEPLOY_SSH_PORT`,
   `DEPLOY_SSH_USER`, `DEPLOY_PATH`.
4. Clonar `airquality-js-app` no servidor
   (`git clone git@github.com:willianflores/airquality-js-app.git`).
5. Criar `infra/.env.prod` no servidor (a partir de `infra/.env.prod.example`), preenchendo
   `POSTGRES_PASSWORD` (senha forte gerada) e `PURPLEAIR_API_KEY` — nunca commitado.
6. Subir só `postgres`, `backend` e `frontend` (sem `worker`):
   `docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --build postgres backend frontend`.
7. Migrar o dado real: `pg_dump` do Postgres local de desenvolvimento (`docker exec
   airquality_js_postgres pg_dump -U airquality_user airquality | gzip > airquality_local.sql.gz`),
   transferir pro servidor (`scp -P 22024`), e restaurar no Postgres de produção
   (`gunzip -c airquality_local.sql.gz | docker compose -f infra/docker-compose.prod.yml
   --env-file infra/.env.prod exec -T postgres psql -U airquality_user airquality`).
8. Validar o restore: conferir contagem de linhas em `sensors` e `sensor_readings` no servidor
   contra a origem local (`SELECT count(*) FROM sensors;` / `SELECT count(*) FROM
   sensor_readings;` nos dois lados) antes de prosseguir.
9. `docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod exec -T backend
   alembic upgrade head` — garante que qualquer migration aplicada depois do dump local também
   rode no servidor.
10. Rodar o backfill do gap **por sensor**, não uma data fixa pra todos — uma requisição à API
    PurpleAir consome o rate limit mesmo quando o dado vem descartado pelo `ON CONFLICT DO
    NOTHING`, então usar `--start 2025-12-04` pra todo sensor desperdiça chamada em quem já tem
    dado mais recente que essa data.
    - Primeiro, levantar a última leitura de cada sensor no Postgres de produção (já restaurado no
      passo 7):
      ```sql
      SELECT s.sensor_index, MAX(r.time_stamp) AS last_reading
      FROM sensors s
      LEFT JOIN sensor_readings r ON r.sensor_index = s.sensor_index
      WHERE s.active
      GROUP BY s.sensor_index
      ORDER BY s.sensor_index;
      ```
      Sensor com `last_reading` nulo (nenhuma leitura na tabela) precisa de uma data de início
      própria — não necessariamente `2025-12-04` (pode ser a data real de instalação, se for
      sensor novo sem histórico nenhum ainda).
    - Depois, rodar o backfill um sensor (ou grupo de sensores com o mesmo `last_reading`) por
      vez, com `--start` = dia seguinte ao `last_reading` daquele sensor (ou `2025-12-04` só para
      quem realmente não tem nada depois dessa data):
      ```bash
      docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod exec -T backend \
        python -m worker.backfill_cli --start <last_reading+1d> --end <data de hoje> --sensor-indices <sensor_index>
      ```
    - `worker/backfill_cli.py` só aceita um `--start`/`--end` por chamada para todos os
      `--sensor-indices` informados (`application/use_cases/backfill_historical_purpleair.py:22-40`
      aplica a mesma janela a cada sensor do lote) — por isso sensores com datas de gap diferentes
      precisam de chamadas separadas, não uma chamada única com todos os `sensor_index`.
11. Validar: contagem de `ingestion_runs` (via `/admin/ingestion-runs` ou consulta direta) reflete
    o backfill do passo 10, sem erro.
12. **Backup imediato, antes de qualquer outra coisa**: rodar
    `infra/scripts/backup-postgres.sh` manualmente e confirmar que o dump foi gerado.
    Diferente de dado ordinário, o dado recuperado no passo 10 custou pontos reais da API
    PurpleAir — perdê-lo significa gastar pontos de novo pra rebaixar o mesmo período. Não
    esperar o cron diário (passo 16) entrar em ação: a janela entre o backfill e o primeiro
    backup automático é justamente o período de maior exposição.
13. Copiar `infra/nginx-acrequalidadedoar.conf` pra
    `/etc/nginx/sites-available/acrequalidadedoar` no servidor, criar o symlink em
    `sites-enabled`, rodar `sudo nginx -t`, e só então `sudo systemctl reload nginx`.
14. Emitir o certificado: `sudo certbot --nginx -d acrequalidadedoar.ufac.br` — o certbot detecta o
    bloco existente, obtém o certificado Let's Encrypt e reescreve o arquivo com o bloco `:443` e
    o redirect de `:80` automaticamente.
15. Validar: acessar `https://acrequalidadedoar.ufac.br` (home, mapa, gráficos por município,
    login admin com uma conta já existente no dado restaurado — **não crie um admin novo a menos
    que o restore confirme que nenhum existe**), checar que o painel de status de ingestão reflete
    o backfill do passo 10.
16. Instalar a linha de `infra/scripts/crontab-airquality-prod` no crontab do `srvadmin`
    (`crontab -e`, preservando as linhas já existentes do nokekoi).
17. **Gate manual, com autorização explícita do usuário**: só depois de tudo acima validado,
    iniciar o worker (jobs de arquivo horário + status a cada 30min, nomeando o serviço direto
    funciona mesmo com `profiles: manual`):
    `docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d worker`.
18. (Opcional, depois de validado) Disparar o workflow `Deploy (manual)` pela aba Actions do
    GitHub, confirmando que o pipeline automatizado reproduz os passos 6 e 9 sem erro (sem tocar
    no `worker`, que continua fora do `up` do workflow).

## Self-Review

- **Cobertura do spec**: domínio próprio sem porta alternativa (Task 3 + Runbook 13–15), sem
  Redis (compose não inclui), Docker Compose reaproveitando Dockerfiles já existentes (Tasks 1–2),
  migração de dado real via `pg_dump`/`pg_restore` (Runbook 7–8), backfill do gap no servidor
  (Runbook 10) + backup imediato do resultado (Runbook 12), worker com gate manual (Global
  Constraints + compose Task 2 + Runbook 6/17),
  checagem de capacidade formal (Runbook 1), backup local retenção 3 dias (Task 4), CI/CD manual
  via `workflow_dispatch` (Task 5), chave SSH dedicada (Runbook 3), firewall confirmado (Runbook
  2) — todas as decisões da spec têm uma task ou passo do Runbook correspondente.
- **Placeholders**: nenhum "TBD"/"implementar depois"; todo código é completo. O único valor
  deixado como `<data de hoje>` no Runbook (passo 10) é um argumento de linha de comando que só
  existe no momento real do deploy, não no repositório.
- **Consistência de nomes/portas**: nomes de serviço (`postgres`/`backend`/`worker`/`frontend`),
  portas (`8001`/`8081`, distintas das `8000`/`8080` do nokekoi) e nome do projeto Compose
  (`airquality_js_prod`) conferem entre as Tasks 2, 3 e 5 e o Runbook.
