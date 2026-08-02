# Fase 6 — Hardening & Deploy

## Contexto

As Fases 0–5 (fundação, dados/TimescaleDB, ingestão, API, frontend core, admin) e a feature de
publicações entregaram a stack nova (`airquality-js-app`: React + Python hexagonal) funcional em
ambiente de desenvolvimento local, mas nada dela roda em produção ainda. Esta fase estava travada
desde 2026-07-22 por uma questão pendente com a UFAC (instituição parceira, sede do LabGAMA);
resolvida em 2026-08-02, retomando o planejamento de deploy.

O app antigo (`airquality-app`, Next.js/Node) **nunca chegou a ser deployado formalmente** — o DNS
`acrequalidadedoar.ufac.br` já aponta para `200.129.173.88`, mas nada real serve esse domínio hoje.
Isso muda o formato do deploy em relação ao precedente do Nokekoi (`nokekoi-js-app`, mesma
migração React/Python hexagonal, mesmo servidor): lá havia um Streamlit em produção rodando em
paralelo, exigindo uma porta alternativa (`:8443`) durante a validação. Aqui não há nada rodando
para preservar — o deploy vai direto para `:443` no domínio final.

**Servidor**: `srv-nokekoi` (`200.129.173.88`, porta SSH `22024`, usuário `srvadmin`) — o mesmo
servidor que já hospeda a stack nova do `nokekoi-js-app`. O servidor responde por dois domínios
distintos (`nokekoi.ufac.br` e `acrequalidadedoar.ufac.br`), cada um com seu próprio bloco Nginx e
certificado Let's Encrypt — sem conflito entre as duas aplicações.

**Checagem de capacidade (feita durante o desenho desta fase, via SSH)**:

- Disco: 57G total, 38G livres (31% em uso — mesma proporção observada antes do deploy do
  nokekoi, ou seja, a stack nova do nokekoi não pressionou o disco de forma perceptível).
- RAM: 7,8Gi total, 6,6Gi disponível (contando buff/cache reclamável).
- CPU: 4 vCPUs.
- Docker: já instalado (`29.6.1`), reaproveitado do deploy do nokekoi — não precisa instalar de
  novo.

Margem confortável para uma segunda stack Docker (Postgres/TimescaleDB + backend + frontend +
worker) rodando ao lado da stack do nokekoi. Esta checagem é repetida formalmente como primeiro
passo do fluxo de deploy (para o caso de o cenário mudar entre o desenho e a execução real).

**Dado real já existe, mas só localmente.** O Postgres local de desenvolvimento contém sensores,
histórico de leituras reais (pré-incidente), usuários admin e publicações já migradas — não é
dado sintético. A ingestão real (worker PurpleAir) está suspensa desde um incidente de perda de
dados no banco (perdemos dados de dez/2025 em diante, incluindo o histórico recuperável via API da
PurpleAir). Uma investigação de código feita durante esta fase (comparando a lógica de ingestão
antiga com a nova) não encontrou nenhuma operação destrutiva automática no fluxo de ingestão do
app novo — a nova ingestão é, inclusive, mais segura que a antiga por ser idempotente
(`ON CONFLICT (sensor_index, time_stamp) DO NOTHING`, contra o antigo que duplicava silenciosamente
em reexecuções). Isso aponta o incidente anterior como de natureza operacional (comando manual,
restore, ou perda de volume Docker), não um bug da ingestão nova — mas a decisão de quando religar
o worker real continua sendo do usuário, não automática deste deploy.

Durante essa investigação também foi corrigido um bug secundário e não-destrutivo:
`PostgresSensorReadingRepository.bulk_insert` retornava `len(readings)` (contagem de linhas
*tentadas*) em vez da contagem real de linhas inseridas, inflando o `records_processed` gravado em
`ingestion_runs` sempre que `ON CONFLICT DO NOTHING` descartava duplicatas. Corrigido para somar
`result.rowcount` por linha inserida individualmente. Relevante para esta fase porque o passo de
validação pós-backfill (abaixo) depende dessa contagem ser confiável.

## Decisões

- **Servidor único, domínio próprio, sem stack em paralelo para preservar.** Diferente do nokekoi,
  não há necessidade de porta alternativa — vai direto para `https://acrequalidadedoar.ufac.br`
  (porta 443).
- **Reaproveita o Nginx do host**, não sobe um Nginx dentro do Docker Compose. Novo bloco
  `server {}` + certificado Let's Encrypt próprio para `acrequalidadedoar.ufac.br` (certbot já está
  configurado no host para o domínio do nokekoi; só precisa emitir um certificado novo para este
  domínio).
- **Sem Redis.** O compose local (`infra/docker-compose.yml`) já não inclui Redis — não há caso de
  uso de fila de tarefas nem cache. Mantido fora também em produção (YAGNI, mesma decisão do
  nokekoi).
- **Docker Compose**, Docker já instalado no servidor (reaproveitado do deploy do nokekoi).
- **Migração do dado real: `pg_dump` local → `pg_restore` no servidor, antes de qualquer
  backfill.** O Postgres de produção não começa vazio — recebe o dump do Postgres local de
  desenvolvimento (sensores, leituras históricas reais, admin, publicações). Alternativa
  descartada: deixar o Postgres de produção vazio e reconstruir tudo via backfill da API
  PurpleAir — mais lento, mais chamadas à API rate-limited, e perderia dado que a API pode não
  devolver mais (histórico antigo).
- **Backfill do gap (dez/2025 até hoje) roda no servidor, não localmente.** Rodar localmente e
  depois copiar o banco pro servidor abriria uma segunda janela de defasagem, entre o fim do
  backfill local e o início da ingestão em tempo real no servidor. Rodando o backfill diretamente
  no servidor, logo após o restore, e ligando o worker em tempo real logo em seguida, essa janela
  fica restrita à duração do próprio backfill.
- **Worker de ingestão em tempo real: container existe no compose de produção, mas não inicia
  sozinho.** Decisão explícita do usuário: antes de reativar a ingestão real, quer (a) confirmar
  que a lógica nova não repete o incidente anterior — já investigado nesta fase, ver Contexto — e
  (b) validar o backfill do gap primeiro. O worker só é iniciado mediante autorização explícita,
  como passo separado, depois do deploy e da validação.
- **Backup: local, sem cópia externa por enquanto.** Dump diário do Postgres de produção, retenção
  de 3 dias no próprio servidor. Cópia externa (S3, outro host) fica como melhoria futura — mesma
  decisão adotada no nokekoi, priorizando ter algum backup rodando logo.
- **CI/CD: build/teste automático, deploy manual.** `ci.yml` existente (testes backend + frontend)
  continua disparando em todo push/PR. Um job novo de deploy usa `workflow_dispatch` (gatilho
  manual) — builda as imagens Docker e aplica via SSH no servidor. Sem deploy automático a cada
  push, mesma cautela do nokekoi até a stack nova ganhar confiança em produção.
- **Chave SSH de deploy dedicada**, nova, só para o GitHub Actions acessar o servidor — não
  reaproveita a chave pessoal do usuário nem a chave de deploy já usada pelo nokekoi (isolamento:
  uma chave comprometida não dá acesso às duas stacks).
- **Firewall (`ufw`)**: confirma que `22024` (SSH), `80` e `443` já estão liberadas (o hardening do
  nokekoi já deve ter coberto isso) antes de qualquer mudança adicional. Não precisa de porta nova
  como o `8443` do nokekoi, já que este domínio vai direto para `443`.
- **Rotação de log dos containers Docker** (`json-file` com `max-size`/`max-file`) configurada
  desde o início, mesma cautela do nokekoi (servidor com partição única, evita acúmulo silencioso
  ao longo dos meses — agora com duas stacks gerando log).

## Arquitetura

```text
[Internet] → Nginx do host (mesmo host do nokekoi, gerencia certbot por domínio)
                │
                ├── nokekoi.ufac.br            → stack do nokekoi-js-app (já em produção)
                └── acrequalidadedoar.ufac.br  → stack do airquality-js-app (esta fase)
                                                    ├── / (443)     → frontend (build estático)
                                                    └── /api (443)  → backend FastAPI

Docker Compose airquality (rede interna própria, só o que o Nginx do host precisa tocar é
publicado):
  frontend | backend | postgres (TimescaleDB) | worker (existe, não inicia sozinho)

Cron do host (srvadmin, crontab):
  03:30 → backup diário do Postgres airquality (dump + retenção 3 dias)
```

```text
infra/
├── docker-compose.prod.yml         # Create: compose de produção (postgres, backend, frontend, worker)
├── nginx-acrequalidadedoar.conf    # Create: bloco de servidor pro host Nginx (referência,
│                                   #         aplicado manualmente em /etc/nginx/sites-available)
└── scripts/
    └── backup-postgres.sh         # Create: dump + retenção 3 dias

.github/workflows/
└── deploy.yml                     # Create: job de deploy manual (workflow_dispatch)
```

## Fluxo de deploy (primeira vez)

1. Checar capacidade do servidor (disco/RAM/CPU/Docker) — repetir a checagem já feita no desenho
   desta fase, confirmando que segue confortável no momento da execução real.
2. Confirmar `ufw` (22024/80/443 liberadas, login root via SSH desabilitado) antes de qualquer
   mudança adicional.
3. Levar o código para o servidor (clone do repo ou imagens publicadas via CI — decidir na tarefa
   de implementação do `deploy.yml`, mesmo ponto em aberto que o nokekoi deixou).
4. `pg_dump` do Postgres local de desenvolvimento → transferir → `pg_restore` no Postgres do
   servidor.
5. `docker compose -f infra/docker-compose.prod.yml up -d` (postgres já com dado restaurado,
   backend, frontend — worker sobe mas não inicia o loop de ingestão).
6. `alembic upgrade head` no servidor (confirma que o schema está atualizado; o restore já deve
   trazer o schema do momento do dump, mas migrations aplicadas depois do dump precisam rodar).
7. Rodar o backfill do gap (dez/2025 até hoje) no servidor, via `backfill_historical_purpleair`
   dentro do container backend.
8. Validar: contagem de `ingestion_runs` (agora com contagem real, pós-correção do bug) e sanity
   check de leituras recentes por sensor.
9. Adicionar o bloco `acrequalidadedoar.ufac.br` no Nginx do host, emitir certificado via certbot,
   testar `nginx -t`, recarregar.
10. Validar acesso via `https://acrequalidadedoar.ufac.br` (home, mapa, gráficos por município,
    login admin).
11. Instalar a linha de cron do backup diário.
12. **Gate manual, fora desta fase**: iniciar o worker de ingestão em tempo real só mediante
    autorização explícita do usuário, depois de tudo acima validado.

## Testes

- **`docker-compose.prod.yml`**: validado por `docker compose config` (sintaxe) e um teste manual
  de `up`/`down` local antes de aplicar no servidor real.
- **`bulk_insert` (já corrigido nesta fase)**: teste novo garante que uma segunda inserção do mesmo
  `(sensor_index, time_stamp)` retorna `0` (não `1`), cobrindo o bug de contagem inflada corrigido
  durante a investigação.
- **Backup**: teste manual — rodar o script, confirmar que o dump é gerado e que dumps com mais de
  3 dias são removidos.
- **Deploy**: validação manual pós-deploy (checklist do passo 10 acima) — sem teste automatizado
  end-to-end contra o servidor real nesta fase.
- **Restore de dado**: validação manual — após o `pg_restore`, conferir contagem de linhas em
  `sensors` e `sensor_readings` bate com a origem local antes de prosseguir para o backfill.

## Fora de escopo

- Cópia externa de backup (S3, outro host) — melhoria futura.
- Deploy automático a cada push na `main` — fica manual (`workflow_dispatch`) nesta fase.
- Iniciar o worker de ingestão em tempo real de fato — gate manual, autorizado separadamente pelo
  usuário depois desta fase.
- Retomar qualquer decisão de correção retroativa de município (sensores 31101/31109/etc.,
  discutida em sessão anterior) — independente deste deploy.
- Qualquer mudança na stack ou domínio do nokekoi-js-app já em produção no mesmo servidor.
