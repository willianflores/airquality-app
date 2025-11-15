# 📋 PLANO DE DEPLOY - AIR QUALITY APP (VPS)

## 🎯 Objetivo
Deploy completo da aplicação Air Quality App em VPS usando PM2, sem Docker.
- Frontend: Next.js
- Backend: Node.js + Python
- Banco de Dados: PostgreSQL
- Proxy: Nginx

---

## 📊 Arquitetura da Aplicação

```
┌─────────────────────────────────────────────────────────────┐
│                 VPS Ubuntu 22.04 LTS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │   Frontend   │      │   Backend    │      │PostgreSQL│ │
│  │   Next.js    │◄────►│  Node.js +   │◄────►│          │ │
│  │   Port 3000  │      │   Python     │      │Port 5432 │ │
│  │    (PM2)     │      │  Port 8080   │      │          │ │
│  └──────────────┘      └──────┬───────┘      └──────────┘ │
│         │                     │                     │      │
│         │                     │                     │      │
│         │              ┌──────▼──────┐              │      │
│         │              │   Cron Job  │              │      │
│         │              │  (05:10)    │              │      │
│         │              │  Python     │              │      │
│         │              └─────────────┘              │      │
│         │                                           │      │
│  ┌──────▼───────────────────────────────────────────▼────┐ │
│  │              Nginx Reverse Proxy                      │ │
│  │              Port 80/443 (SSL)                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   Internet    │
                    └───────────────┘
```

---

## 🚀 FASE 1: PREPARAÇÃO DO SERVIDOR VPS

### 1.1 Especificações Recomendadas

**Provedor Sugerido:** DigitalOcean, Linode, Hetzner, Contabo

**Configuração Mínima:**
- **SO:** Ubuntu 22.04 LTS
- **RAM:** 4GB
- **CPU:** 2 vCPUs
- **Disco:** 80GB SSD
- **Bandwidth:** Ilimitado ou 4TB/mês
- **Custo:** ~$20-40/mês

### 1.2 Preparação Inicial do Servidor

```bash
# Conectar ao servidor
ssh root@SEU_IP_DO_SERVIDOR

# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências essenciais
apt install -y curl wget git build-essential ufw fail2ban

# Criar usuário para a aplicação
adduser airquality
# Definir senha forte
# Preencher informações (pode deixar em branco)

# Adicionar ao grupo sudo
usermod -aG sudo airquality

# Configurar SSH para o novo usuário
mkdir -p /home/airquality/.ssh
cp ~/.ssh/authorized_keys /home/airquality/.ssh/
chown -R airquality:airquality /home/airquality/.ssh
chmod 700 /home/airquality/.ssh
chmod 600 /home/airquality/.ssh/authorized_keys

# Trocar para novo usuário
su - airquality
```

### 1.3 Configuração de Firewall

```bash
# Configurar UFW
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status

# Configurar Fail2Ban (proteção brute-force)
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📦 FASE 2: INSTALAÇÃO DE DEPENDÊNCIAS

### 2.1 Instalação do Node.js 20.x

```bash
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js e npm
sudo apt install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v20.x
npm --version   # Deve mostrar v10.x

# Instalar PM2 globalmente
sudo npm install -g pm2

# Configurar PM2 para iniciar no boot
pm2 startup systemd
# Executar o comando que aparecer na saída
```

### 2.2 Instalação do Python 3.11+

```bash
# Python já vem no Ubuntu 22.04, mas vamos garantir
sudo apt install -y python3 python3-pip python3-venv

# Verificar versão
python3 --version  # Deve ser 3.10 ou superior

# Instalar pacotes adicionais
sudo apt install -y python3-dev libpq-dev
```

### 2.3 Instalação do PostgreSQL 17 (LTS)

**IMPORTANTE:** Execute TODOS os comandos abaixo na sequência:

```bash
# 1️⃣ Verificar versão do Ubuntu (deve ser 20.04, 22.04 ou 24.04)
lsb_release -a

# 2️⃣ Instalar dependências necessárias
sudo apt install -y wget gnupg2 lsb-release

# 3️⃣ Adicionar repositório PostgreSQL oficial
sudo sh -c 'echo "deb [signed-by=/usr/share/keyrings/postgresql-archive-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# 4️⃣ Importar chave GPG do repositório PostgreSQL
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/postgresql-archive-keyring.gpg

# 5️⃣ Verificar que a chave foi importada
ls -la /usr/share/keyrings/postgresql-archive-keyring.gpg

# 6️⃣ Atualizar lista de pacotes
sudo apt update

# 7️⃣ Verificar se PostgreSQL 17 está disponível
apt-cache search postgresql-17

# 8️⃣ Instalar PostgreSQL 17
sudo apt install -y postgresql-17 postgresql-contrib-17

# 9️⃣ Verificar instalação
psql --version
# Deve mostrar: psql (PostgreSQL) 17.x

# 🔟 Verificar status do serviço
sudo systemctl status postgresql

# 1️⃣1️⃣ Iniciar e habilitar serviço (se não estiver rodando)
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 1️⃣2️⃣ Verificar que está rodando na porta padrão
sudo ss -tunelp | grep 5432
```

**Nota:** PostgreSQL 17 é a versão LTS mais recente (2024), oferecendo:
- ✅ Performance melhorada (20-30% mais rápido)
- ✅ Novos recursos de segurança
- ✅ Suporte a longo prazo (até Nov 2029)
- ✅ Compatibilidade com versões anteriores

**Troubleshooting:**
- Se `apt-cache search postgresql-17` não retornar nada, verifique:
  - Conexão com internet: `ping -c 3 apt.postgresql.org`
  - Arquivo do repositório: `cat /etc/apt/sources.list.d/pgdg.list`
  - Execute `sudo apt update` novamente

### 2.4 Instalação do Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Iniciar e habilitar serviço
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

---

## 🗄️ FASE 3: CONFIGURAÇÃO DO BANCO DE DADOS

### 3.1 Criar Banco de Dados e Usuário

```bash
# Conectar ao PostgreSQL como usuário postgres
sudo -u postgres psql

# Dentro do psql, executar:
CREATE DATABASE db_airquality;
CREATE USER airquality_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE db_airquality TO airquality_user;

# Conectar ao banco
\c db_airquality

# Dar permissões no schema public
GRANT ALL ON SCHEMA public TO airquality_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO airquality_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO airquality_user;

# Sair (extensões serão instaladas depois)
\q
```

### 3.1.1 Instalar e Habilitar PostGIS (Opcional)

⚠️ **Importante:** PostGIS é necessário apenas se você trabalha com dados geoespaciais (coordenadas, geometrias, mapas). 

**Verificar se seu projeto precisa:**
- Verifique se há campos do tipo `geometry`, `geography`, `point` nas tabelas
- Se não houver dados geográficos, **pule esta seção**

#### **Opção 1: Instalação Automatizada (Recomendado)**

```bash
# Usar script automatizado
cd /caminho/para/airquality-app
chmod +x install-postgis.sh
./install-postgis.sh

# O script irá:
# - Verificar PostgreSQL 17
# - Instalar PostGIS
# - Verificar instalação
# - Opcionalmente habilitar no banco db_airquality
```

#### **Opção 2: Instalação Manual**

```bash
# === INSTALAR POSTGIS ===

# 1. Atualizar repositórios
sudo apt update

# 2. Instalar PostGIS para PostgreSQL 17
sudo apt install -y postgresql-17-postgis-3

# 3. Verificar instalação
dpkg -l | grep postgis

# Saída esperada:
# ii  postgresql-17-postgis-3  3.x.x...

# 4. Verificar arquivos de controle
ls -la /usr/share/postgresql/17/extension/postgis*

# Deve mostrar:
# postgis.control
# postgis--3.x.x.sql
# postgis_topology.control
# postgis_raster.control

# === HABILITAR NO BANCO ===

# 5. Conectar ao banco de dados
sudo -u postgres psql -d db_airquality

# 6. Criar extensão PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

# 7. Verificar versão instalada
SELECT PostGIS_Version();

# Saída esperada:
#        postgis_version        
# ------------------------------
#  3.x USE_GEOS=1 USE_PROJ=1 ...

# 8. Listar extensões instaladas
\dx

# Deve mostrar 'postgis' na lista

# 9. Sair
\q
```

**Se houver erro "package not found":**

```bash
# Adicionar repositório PostgreSQL oficial (se necessário)
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Importar chave GPG
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Atualizar e tentar novamente
sudo apt update
sudo apt install -y postgresql-17-postgis-3
```

### 3.2 Configurar Acesso Local

```bash
# Editar pg_hba.conf (PostgreSQL 17)
sudo nano /etc/postgresql/17/main/pg_hba.conf

# Verificar/adicionar as seguintes linhas:
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# local   all             all                                     peer
# host    all             all             127.0.0.1/32            md5
# host    all             all             ::1/128                 md5

# Editar postgresql.conf para permitir conexões (se necessário)
sudo nano /etc/postgresql/17/main/postgresql.conf

# Verificar/descomentar:
# listen_addresses = 'localhost'
# port = 5432

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Verificar status
sudo systemctl status postgresql
```

### 3.3 Transferir Dados do Banco (Múltiplos Schemas + Prisma)

**Estrutura do seu banco:**
- Schema `public`: Tabelas Prisma + migrations
- Schema `sc_padata`: Dados brutos e processados

---

#### **Opção A: Backup Completo do Banco (RECOMENDADO)**

Esta opção exporta TUDO: schemas, tabelas, dados, migrations Prisma, etc.

**1️⃣ No seu computador local (criar backup):**

```bash
# Backup completo em formato custom (comprimido e mais rápido)
pg_dump -U seu_usuario_local -h localhost -Fc db_airquality > airquality_backup_$(date +%Y%m%d_%H%M%S).dump

# Ou em formato SQL (texto legível)
pg_dump -U seu_usuario_local -h localhost db_airquality > airquality_backup_$(date +%Y%m%d_%H%M%S).sql

# Verificar tamanho do backup
ls -lh airquality_backup_*.dump
```

**2️⃣ Transferir para o servidor:**

```bash
# Transferir arquivo dump via SCP
scp airquality_backup_*.dump airquality@146.190.62.188:/home/airquality/

# Se for arquivo SQL
scp airquality_backup_*.sql airquality@146.190.62.188:/home/airquality/
```

**3️⃣ No servidor VPS (restaurar backup):**

```bash
# Conectar ao servidor
ssh airquality@SEU_IP_DO_SERVIDOR

# Ir para diretório home
cd /home/airquality

# Restaurar backup formato custom (.dump)
pg_restore -U postgres -h localhost -d db_airquality -v airquality_backup_*.dump

# OU restaurar backup formato SQL (.sql)
psql -U airquality_user -d db_airquality < airquality_backup_*.sql

# Verificar schemas criados
psql -U airquality_user -d db_airquality -c "\dn"
# Deve mostrar: public, sc_padata

# Verificar tabelas no schema public
psql -U airquality_user -d db_airquality -c "\dt public.*"

# Verificar tabelas no schema sc_padata
psql -U airquality_user -d db_airquality -c "\dt sc_padata.*"

# Verificar migrations Prisma
psql -U airquality_user -d db_airquality -c "SELECT * FROM _prisma_migrations;"
```

---

#### **Opção B: Backup Separado por Schema**

Se preferir controle granular sobre o que exportar:

**1️⃣ No seu computador local:**

```bash
# Backup apenas do schema public (inclui migrations Prisma)
pg_dump -U seu_usuario_local -h localhost -n public -Fc db_airquality > backup_schema_public.dump

# Backup apenas do schema sc_padata (dados brutos/processados)
pg_dump -U seu_usuario_local -h localhost -n sc_padata -Fc db_airquality > backup_schema_sc_padata.dump

# Verificar backups
ls -lh backup_schema_*.dump
```

**2️⃣ Transferir para servidor:**

```bash
scp backup_schema_public.dump airquality@SEU_IP_DO_SERVIDOR:/home/airquality/
scp backup_schema_sc_padata.dump airquality@SEU_IP_DO_SERVIDOR:/home/airquality/
```

**3️⃣ No servidor VPS:**

```bash
# Criar schema sc_padata (se não existir)
psql -U airquality_user -d db_airquality -c "CREATE SCHEMA IF NOT EXISTS sc_padata;"

# Dar permissões no schema sc_padata
psql -U airquality_user -d db_airquality -c "GRANT ALL ON SCHEMA sc_padata TO airquality_user;"
psql -U airquality_user -d db_airquality -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sc_padata TO airquality_user;"
psql -U airquality_user -d db_airquality -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sc_padata TO airquality_user;"

# Restaurar schema public (migrations Prisma)
pg_restore -U airquality_user -d db_airquality -v backup_schema_public.dump

# Restaurar schema sc_padata (dados)
pg_restore -U airquality_user -d db_airquality -v backup_schema_sc_padata.dump

# Verificar
psql -U airquality_user -d db_airquality -c "\dn"
psql -U airquality_user -d db_airquality -c "\dt public.*"
psql -U airquality_user -d db_airquality -c "\dt sc_padata.*"
```

---

#### **Opção C: Usar Prisma Migrate (Apenas Estrutura) + Dados Separados**

Se você quer recriar a estrutura via Prisma e importar apenas os dados:

**1️⃣ No servidor VPS (criar estrutura via Prisma):**

```bash
# Após clonar o repositório (Fase 4)
cd /home/airquality/apps/airquality-app/backend

# Instalar dependências
npm install

# Configurar .env.production com string de conexão
nano .env.production

# Adicionar:
DATABASE_URL="postgresql://airquality_user:SUA_SENHA@localhost:5432/db_airquality?schema=public"

# Executar migrations Prisma
npx prisma migrate deploy

# Gerar Prisma Client
npx prisma generate

# Verificar tabelas criadas
psql -U airquality_user -d db_airquality -c "\dt public.*"
```

**2️⃣ No seu computador local (backup apenas dos dados):**

```bash
# Exportar apenas dados do schema public (sem estrutura)
pg_dump -U seu_usuario_local -h localhost --data-only -n public -Fc db_airquality > backup_data_public.dump

# Exportar apenas dados do schema sc_padata (sem estrutura)
pg_dump -U seu_usuario_local -h localhost --data-only -n sc_padata -Fc db_airquality > backup_data_sc_padata.dump

# OU exportar tabelas específicas
pg_dump -U seu_usuario_local -h localhost --data-only -t sc_padata.sensors -Fc db_airquality > backup_sensors.dump
pg_dump -U seu_usuario_local -h localhost --data-only -t sc_padata.air_quality_data -Fc db_airquality > backup_air_quality.dump
```

**3️⃣ Transferir e restaurar:**

```bash
# Transferir
scp backup_data_*.dump airquality@SEU_IP_DO_SERVIDOR:/home/airquality/

# No servidor, restaurar dados
pg_restore -U airquality_user -d db_airquality -v backup_data_public.dump
pg_restore -U airquality_user -d db_airquality -v backup_data_sc_padata.dump
```

---

#### **Opção D: Criar Schema sc_padata e Tabelas Manualmente**

Se você tem scripts SQL de criação:

**1️⃣ No servidor VPS:**

```bash
# Criar schema
psql -U airquality_user -d db_airquality -c "CREATE SCHEMA IF NOT EXISTS sc_padata;"

# Executar script de criação de tabelas
cd /home/airquality/apps/airquality-app/backend
psql -U airquality_user -d db_airquality -f scripts/create_sensors_table.sql

# Ou criar manualmente via SQL
psql -U airquality_user -d db_airquality << 'EOF'
-- Exemplo: criar tabela no schema sc_padata
CREATE TABLE IF NOT EXISTS sc_padata.sensors (
    id SERIAL PRIMARY KEY,
    sensor_index INTEGER UNIQUE NOT NULL,
    name VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    altitude DECIMAL(10, 2),
    location_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sc_padata.air_quality_data (
    id SERIAL PRIMARY KEY,
    sensor_index INTEGER REFERENCES sc_padata.sensors(sensor_index),
    time_stamp TIMESTAMP NOT NULL,
    pm2_5 DECIMAL(10, 2),
    pm10 DECIMAL(10, 2),
    temperature DECIMAL(5, 2),
    humidity DECIMAL(5, 2),
    pressure DECIMAL(7, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX idx_air_quality_sensor_index ON sc_padata.air_quality_data(sensor_index);
CREATE INDEX idx_air_quality_time_stamp ON sc_padata.air_quality_data(time_stamp);
EOF

# Dar permissões
psql -U airquality_user -d db_airquality << 'EOF'
GRANT ALL ON SCHEMA sc_padata TO airquality_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sc_padata TO airquality_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sc_padata TO airquality_user;
EOF
```

**2️⃣ Importar apenas dados:**

```bash
# Exportar dados do computador local
pg_dump -U seu_usuario_local -h localhost --data-only -n sc_padata db_airquality > data_sc_padata.sql

# Transferir
scp data_sc_padata.sql airquality@SEU_IP_DO_SERVIDOR:/home/airquality/

# No servidor, importar
psql -U airquality_user -d db_airquality < data_sc_padata.sql
```

---

#### **Comandos Úteis de Verificação**

```bash
# Conectar ao banco
psql -U airquality_user -d db_airquality -h localhost

# Dentro do psql:

# Listar schemas
\dn

# Listar tabelas de todos os schemas
\dt *.*

# Listar tabelas do schema public
\dt public.*

# Listar tabelas do schema sc_padata
\dt sc_padata.*

# Ver estrutura de uma tabela
\d sc_padata.sensors

# Contar registros
SELECT COUNT(*) FROM sc_padata.sensors;
SELECT COUNT(*) FROM sc_padata.air_quality_data;

# Ver migrations Prisma
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;

# Ver tamanho do banco
SELECT pg_size_pretty(pg_database_size('db_airquality'));

# Ver tamanho por schema
SELECT schema_name, 
       pg_size_pretty(sum(table_size)::bigint) as size
FROM (
  SELECT pg_catalog.pg_namespace.nspname as schema_name,
         pg_relation_size(pg_catalog.pg_class.oid) as table_size
  FROM   pg_catalog.pg_class
     JOIN pg_catalog.pg_namespace ON relnamespace = pg_catalog.pg_namespace.oid
) t
GROUP BY schema_name
ORDER BY schema_name;

# Sair
\q
```

---

#### **Recomendação Final**

**Para primeira instalação:**
✅ Use **Opção A** (Backup Completo) - mais simples e seguro

**Para controle granular:**
✅ Use **Opção B** (Backup por Schema) - separação clara

**Para ambiente limpo:**
✅ Use **Opção C** (Prisma + Dados) - estrutura gerenciada pelo Prisma

**Exemplo de fluxo completo:**

```bash
# 1. No computador local
pg_dump -U postgres -h localhost -Fc db_airquality > ~/airquality_full_backup.dump

# 2. Transferir
scp ~/airquality_full_backup.dump airquality@192.168.1.100:/home/airquality/

# 3. No servidor
ssh airquality@192.168.1.100
cd /home/airquality
pg_restore -U airquality_user -d db_airquality -v airquality_full_backup.dump

# 4. Verificar
psql -U airquality_user -d db_airquality -c "\dn"
psql -U airquality_user -d db_airquality -c "\dt public.*"
psql -U airquality_user -d db_airquality -c "\dt sc_padata.*"
psql -U airquality_user -d db_airquality -c "SELECT COUNT(*) FROM _prisma_migrations;"
```

### 3.4 Configurar Backup Automático

```bash
# Criar diretório de backups
mkdir -p /home/airquality/backups

# Criar script de backup
nano /home/airquality/backup-database.sh
```

```bash
#!/bin/bash
# Script de backup automático do banco de dados

BACKUP_DIR="/home/airquality/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="db_airquality"
DB_USER="airquality_user"

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

# Fazer backup compactado
PGPASSWORD='cB%Q2qiK&Fth2eMBS^Ks' pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/backup_${TIMESTAMP}.sql.gz

# Manter apenas últimos 7 dias
find $BACKUP_DIR -type f -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup concluído: backup_${TIMESTAMP}.sql.gz"
```

```bash
# Tornar executável
chmod +x /home/airquality/backup-database.sh

# Adicionar ao crontab (diário às 2h da manhã)
crontab -e

# Adicionar linha:
0 2 * * * /home/airquality/backup-database.sh >> /home/airquality/logs/backup.log 2>&1
```

---

## 🎨 FASE 4: DEPLOY DO CÓDIGO (GitHub)

### 4.1 Clonar Repositório do GitHub

```bash
# Criar diretório de trabalho
cd /home/airquality
mkdir -p apps logs

# Clonar repositório
cd apps
git clone https://github.com/willianflores/airquality-app.git
cd airquality-app

# Verificar estrutura
ls -la
# Deve mostrar: frontend/, backend/, README.md, etc.
```

### 4.2 Configurar Git para Atualizações Futuras

```bash
# Configurar credenciais (se necessário)
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

# Para atualizações futuras, basta fazer:
git pull origin main
```

---

## 🎯 FASE 5: DEPLOY DO FRONTEND (Next.js)

### 5.1 Configuração do Frontend

```bash
cd /home/airquality/apps/airquality-app/frontend

# Instalar dependências
npm install

# Criar arquivo de ambiente de produção
nano .env.production
```

**Conteúdo do `.env.production`:**

```env
# API URL - IMPORTANTE: Use o IP do servidor + /api (para acesso via Nginx)
# ⚠️ NÃO use localhost:8080 - isso não funciona no browser do cliente!
NEXT_PUBLIC_API_URL=http://146.190.62.188/api

# Quando tiver domínio configurado, trocar para:
# NEXT_PUBLIC_API_URL=https://seudominio.com/api

# Configurações do mapa
NEXT_PUBLIC_MAP_CENTER_LAT=-9.9753
NEXT_PUBLIC_MAP_CENTER_LNG=-67.8243

# API Keys
NEXT_PUBLIC_PURPLEAIR_API_KEY=sua_chave_purpleair_aqui

# Ambiente
NODE_ENV=production
```

### 5.2 Build do Frontend

```bash
# Build da aplicação
npm run build

# Testar localmente (opcional)
npm run start
# Ctrl+C para parar
```

### 5.3 Configurar PM2 para Frontend

```bash
# Criar arquivo de configuração PM2
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'airquality-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/home/airquality/apps/airquality-app/frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/home/airquality/logs/frontend-error.log',
    out_file: '/home/airquality/logs/frontend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
```

```bash
# Iniciar aplicação com PM2
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Ver logs
pm2 logs airquality-frontend

# Salvar configuração PM2
pm2 save
```

---

## 🔧 FASE 6: DEPLOY DO BACKEND (Node.js)

### 6.1 Configuração do Backend

```bash
cd /home/airquality/apps/airquality-app/backend

# Instalar dependências
npm install

# Criar arquivo de ambiente
nano .env.production
```

**Conteúdo do `.env.production`:**

```env
# Ambiente
NODE_ENV=production
PORT=8080

# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=db_airquality
DB_USER=airquality_user
DB_PASSWORD=SUA_SENHA_FORTE_AQUI

# API Keys
PURPLEAIR_API_KEY=sua_chave_purpleair_aqui

# JWT (se usar autenticação)
JWT_SECRET=sua_chave_secreta_jwt_muito_forte_aqui

# CORS
ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com
```

### 6.2 Build do Backend (se TypeScript)

```bash
# Se o backend usa TypeScript
npm run build

# Verificar pasta dist/
ls -la dist/
```

### 6.3 Configurar PM2 para Backend

```bash
# Adicionar ao ecosystem.config.js
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'airquality-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/airquality/apps/airquality-app/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/home/airquality/logs/frontend-error.log',
      out_file: '/home/airquality/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'airquality-backend',
      script: 'dist/server.js', // Arquivo correto após build do TypeScript
      cwd: '/home/airquality/apps/airquality-app/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        DATABASE_URL: 'postgresql://airquality_user:SUA_SENHA@localhost:5432/db_airquality?schema=public',
        JWT_SECRET: 'sua_chave_jwt_aqui',
        CORS_ORIGIN: 'http://146.190.62.188',
        PURPLEAIR_API_KEY: 'sua_chave_purpleair_aqui'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/home/airquality/logs/backend-error.log',
      out_file: '/home/airquality/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
}
```

```bash
# Recarregar configuração PM2
pm2 delete all  # Parar todos
pm2 start ecosystem.config.js

# Verificar
pm2 status
pm2 logs
```

---

## 🐍 FASE 7: CONFIGURAÇÃO DOS SCRIPTS PYTHON

### 7.1 Setup do Ambiente Python

```bash
cd /home/airquality/apps/airquality-app/backend/scripts

# Criar ambiente virtual
python3 -m venv venv

# Ativar ambiente virtual
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Verificar instalação
pip list
```

### 7.2 Criar Estrutura de Pastas e Configurar Variáveis de Ambiente

#### 7.2.1 Criar Diretórios Necessários

```bash
# Criar diretório de logs (se ainda não existir)
mkdir -p /home/airquality/logs

# Criar diretório de logs do backend (para logs do script Python)
mkdir -p /home/airquality/apps/airquality-app/backend/logs

# Definir permissões adequadas
chown -R airquality:airquality /home/airquality/logs
chown -R airquality:airquality /home/airquality/apps/airquality-app/backend/logs
chmod 755 /home/airquality/logs
chmod 755 /home/airquality/apps/airquality-app/backend/logs
```

**Estrutura de pastas criada:**
```
/home/airquality/
├── apps/
│   └── airquality-app/
│       └── backend/
│           └── logs/          # Logs do script Python (daily_update.log)
└── logs/                      # Logs gerais do sistema
    ├── daily_update_cron.log  # Log do cron job
    ├── frontend-error.log     # Logs do PM2 frontend
    ├── frontend-out.log
    ├── backend-error.log      # Logs do PM2 backend
    └── backend-out.log
```

#### 7.2.2 Configurar Variáveis de Ambiente Python

```bash
# Navegar para o diretório de scripts
cd /home/airquality/apps/airquality-app/backend/scripts

# Copiar exemplo de configuração
cp config.env.example config.env

# Editar configuração
nano config.env
```

**Conteúdo do `config.env` (servidor de produção):**

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=db_airquality
DB_USER=airquality_user
DB_PASSWORD=SUA_SENHA_FORTE_AQUI
DB_SCHEMA=sc_padata
TABLE_REALTIME=tb_parealtimedata

# PurpleAir API
PURPLEAIR_API_KEY=sua_chave_purpleair_aqui

# Timezone
TIMEZONE=America/Rio_Branco

# Logging
LOG_LEVEL=INFO
LOG_FILE=/home/airquality/logs/daily_update.log
```

**⚠️ IMPORTANTE:** 
- O script `daily_update.py` cria automaticamente o diretório de logs se não existir (linha 38)
- Mas é recomendado criar manualmente para garantir permissões corretas
- O caminho `LOG_FILE` deve apontar para `/home/airquality/logs/daily_update.log` no servidor

### 7.3 Testar Scripts Manualmente

```bash
# Com ambiente virtual ativado
source venv/bin/activate

# Testar health check
python3 health_check.py

# Testar download de dados (opcional - pode levar alguns minutos)
# python3 getPurpleairApiHistoricalData.py

# Testar processamento (só se tiver dados no banco)
# python3 runFuctions_server.py

# Desativar ambiente virtual
deactivate
```

### 7.4 Configurar Cron Job para Execução Diária

```bash
# Tornar scripts executáveis
chmod +x /home/airquality/apps/airquality-app/backend/scripts/*.sh
chmod +x /home/airquality/apps/airquality-app/backend/scripts/daily_update.py

# Editar crontab
crontab -e

# Adicionar linha (executa diariamente às 05:10)
10 5 * * * cd /home/airquality/apps/airquality-app/backend/scripts && /home/airquality/apps/airquality-app/backend/scripts/venv/bin/python3 daily_update.py >> /home/airquality/logs/daily_update_cron.log 2>&1
```

**OU usar o script setup_cron.sh:**

```bash
cd /home/airquality/apps/airquality-app/backend/scripts
./setup_cron.sh
```

### 7.5 Verificar Cron Job

```bash
# Listar cron jobs
crontab -l

# Ver log do cron (após primeira execução)
tail -f /home/airquality/logs/daily_update_cron.log
```

---

## 🌐 FASE 8: CONFIGURAÇÃO DO NGINX

### 8.1 Remover Configuração Padrão

```bash
# Remover site padrão
sudo rm /etc/nginx/sites-enabled/default
```

### 8.2 Criar Configuração para Aplicação

```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/airquality
```

**Conteúdo inicial (sem SSL - temporário):**

```nginx
# /etc/nginx/sites-available/airquality

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    # Para acesso via IP, use: server_name _;
    # Para domínio específico, use: server_name seudominio.com www.seudominio.com;
    server_name _;

    # Diretório para validação SSL (Let's Encrypt)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Backend API
    location /api/ {
        # CORS Headers (importante para requisições do frontend)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            return 204;
        }
        
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts (aumentados para queries grandes)
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Logging
    access_log /var/log/nginx/airquality_access.log;
    error_log /var/log/nginx/airquality_error.log;
}
```

### 8.3 Ativar Configuração

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/airquality /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 8.4 Testar Sem SSL

```bash
# No navegador, acessar:
# http://SEU_IP_DO_SERVIDOR
# ou
# http://seudominio.com (se DNS já estiver configurado)

# Deve aparecer a aplicação frontend

# Testar backend via Nginx:
curl http://SEU_IP_DO_SERVIDOR/api/health

# Deve retornar: {"status":"ok","timestamp":"..."}
```

### 8.5 ⚠️ NOTAS IMPORTANTES - CONFIGURAÇÃO CRÍTICA

#### 🔴 **Problema Comum: Frontend não carrega dados do backend**

**Sintomas:**
- Frontend carrega, mas gráficos não aparecem
- Console do browser mostra erro: `Failed to fetch` ou `Network Error`
- Requisições vão para porta errada (ex: 3333 ao invés de passar pelo Nginx)

**Causa Raiz:**
O `.env.production` do frontend foi configurado ANTES do build com URL incorreta.

**✅ Solução:**

```bash
# 1. Verificar .env.production do frontend
cd /home/airquality/apps/airquality-app/frontend
cat .env.production

# DEVE CONTER (para acesso via IP):
# NEXT_PUBLIC_API_URL=http://146.190.62.188/api
# 
# NÃO DEVE CONTER:
# ❌ http://localhost:8080
# ❌ http://146.190.62.188:8080
# ❌ http://146.190.62.188:3333

# 2. Se estiver errado, corrigir:
nano .env.production

# 3. REBUILD obrigatório (variáveis são hardcoded no build):
npm run build

# 4. Reiniciar frontend:
pm2 restart airquality-frontend

# 5. Limpar cache do browser e testar:
# Ctrl+Shift+R (Chrome/Firefox) ou Cmd+Shift+R (Mac)
```

#### 🔴 **Checklist Pós-Deploy Fase 8:**

```bash
# ✅ 1. Verificar .env.production do frontend
cat /home/airquality/apps/airquality-app/frontend/.env.production | grep NEXT_PUBLIC_API_URL
# Deve mostrar: NEXT_PUBLIC_API_URL=http://SEU_IP/api

# ✅ 2. Verificar Nginx está rodando
sudo systemctl status nginx

# ✅ 3. Testar backend direto (deve funcionar)
curl http://localhost:8080/health

# ✅ 4. Testar backend via Nginx (deve funcionar)
curl http://localhost/api/health

# ✅ 5. Testar do browser
# Abrir: http://SEU_IP/api/health
# Deve mostrar: {"status":"ok","timestamp":"..."}

# ✅ 6. Verificar logs do Nginx
sudo tail -f /var/log/nginx/airquality_error.log

# ✅ 7. Verificar se PM2 está rodando ambos os apps
pm2 status
# Deve mostrar: airquality-frontend (online) e airquality-backend (online)

# ✅ 8. Abrir aplicação no browser
# http://SEU_IP
# Abrir DevTools (F12) > Console > Network
# Verificar se requisições estão indo para: http://SEU_IP/api/...
```

---

## 🔒 FASE 9: CONFIGURAÇÃO SSL COM LET'S ENCRYPT

### 9.1 Instalar Certbot

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Criar diretório para validação
sudo mkdir -p /var/www/certbot
```

### 9.2 Obter Certificado SSL

```bash
# Obter certificado (substitua pelos seus domínios)
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Siga as instruções:
# - Digite seu email
# - Aceite os termos
# - Escolha se quer compartilhar email (opcional)
# - Certbot configurará SSL automaticamente
```

### 9.3 Configuração Final do Nginx com SSL

Certbot modifica automaticamente, mas você pode ajustar manualmente:

```bash
sudo nano /etc/nginx/sites-available/airquality
```

**Configuração completa com SSL:**

```nginx
# /etc/nginx/sites-available/airquality

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name seudominio.com www.seudominio.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seudominio.com www.seudominio.com;

    # SSL Configuration (gerado pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss application/json
               application/javascript application/xml image/svg+xml;

    # Logging
    access_log /var/log/nginx/airquality_ssl_access.log;
    error_log /var/log/nginx/airquality_ssl_error.log;
}
```

```bash
# Testar e recarregar
sudo nginx -t
sudo systemctl reload nginx
```

### 9.4 Configurar Renovação Automática

```bash
# Certbot já configura renovação automática
# Testar renovação (dry-run)
sudo certbot renew --dry-run

# Ver timer de renovação automática
sudo systemctl list-timers | grep certbot
```

---

## 🔒 FASE 10: SEGURANÇA E HARDENING

### 10.1 Configurar Fail2Ban para Nginx

```bash
# Editar configuração Fail2Ban
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22

[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true

[nginx-noproxy]
enabled = true
```

```bash
# Reiniciar Fail2Ban
sudo systemctl restart fail2ban

# Ver status
sudo fail2ban-client status
```

### 10.2 Limitar Taxa de Requisições no Nginx

```bash
# Editar configuração do Nginx
sudo nano /etc/nginx/nginx.conf
```

Adicionar dentro do bloco `http`:

```nginx
http {
    # ... configurações existentes ...

    # Limite de requisições
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;
    
    # ... resto do arquivo ...
}
```

Adicionar no site específico:

```nginx
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
        # ... resto da configuração ...
        }
        
        location / {
            limit_req zone=general_limit burst=50 nodelay;
        # ... resto da configuração ...
}
```

### 10.3 Desabilitar Acesso Direto ao Banco de Dados

```bash
# O PostgreSQL já está configurado para aceitar apenas localhost
# Verificar se está correto:
sudo nano /etc/postgresql/17/main/postgresql.conf

# Linha deve estar:
# listen_addresses = 'localhost'

# Firewall já está bloqueando porta 5432
sudo ufw status
```

---

## 📊 FASE 11: MONITORAMENTO E LOGS

### 11.1 Configurar Logrotate

```bash
# Criar configuração de logrotate para aplicação
sudo nano /etc/logrotate.d/airquality
```

```
/home/airquality/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 airquality airquality
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 11.2 Monitoramento com PM2

```bash
# Ver dashboard do PM2
pm2 monit

# Ver logs em tempo real
pm2 logs

# Ver logs específicos
pm2 logs airquality-frontend
pm2 logs airquality-backend

# Ver status detalhado
pm2 show airquality-frontend
pm2 show airquality-backend

# Ver estatísticas
pm2 list
```

### 11.3 Script de Health Check

```bash
# Criar script de monitoramento
nano /home/airquality/health-check-system.sh
```

```bash
#!/bin/bash

LOG_FILE="/home/airquality/logs/health-check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Iniciando health check..." >> $LOG_FILE

# Verificar frontend
if curl -f -s http://localhost:3000 > /dev/null; then
    echo "[$DATE] ✅ Frontend OK" >> $LOG_FILE
else
    echo "[$DATE] ❌ Frontend DOWN - Reiniciando..." >> $LOG_FILE
    pm2 restart airquality-frontend
fi

# Verificar backend
if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "[$DATE] ✅ Backend OK" >> $LOG_FILE
else
    echo "[$DATE] ❌ Backend DOWN - Reiniciando..." >> $LOG_FILE
    pm2 restart airquality-backend
fi

# Verificar PostgreSQL
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "[$DATE] ✅ PostgreSQL OK" >> $LOG_FILE
else
    echo "[$DATE] ❌ PostgreSQL DOWN - Verificar manualmente!" >> $LOG_FILE
fi

# Verificar Nginx
if systemctl is-active --quiet nginx; then
    echo "[$DATE] ✅ Nginx OK" >> $LOG_FILE
else
    echo "[$DATE] ❌ Nginx DOWN - Reiniciando..." >> $LOG_FILE
    sudo systemctl restart nginx
fi

echo "[$DATE] Health check concluído" >> $LOG_FILE
echo "---" >> $LOG_FILE
```

```bash
# Tornar executável
chmod +x /home/airquality/health-check-system.sh

# Adicionar ao crontab (a cada 5 minutos)
crontab -e

# Adicionar:
*/5 * * * * /home/airquality/health-check-system.sh
```

---

## 🔄 FASE 12: PROCEDIMENTOS DE ATUALIZAÇÃO

### 12.1 Script de Atualização da Aplicação

```bash
# Criar script de atualização
nano /home/airquality/update-app.sh
```

```bash
#!/bin/bash

echo "🔄 Iniciando atualização da aplicação Air Quality App..."

# Ir para diretório da aplicação
cd /home/airquality/apps/airquality-app

# Fazer backup do banco antes de atualizar
echo "💾 Fazendo backup do banco de dados..."
/home/airquality/backup-database.sh

# Atualizar código do GitHub
echo "📥 Baixando atualizações do GitHub..."
          git pull origin main
          
# Atualizar Frontend
echo "🎨 Atualizando Frontend..."
          cd frontend
          npm install
          npm run build
          pm2 restart airquality-frontend
          
# Atualizar Backend
echo "🔧 Atualizando Backend..."
          cd ../backend
          npm install
          npm run build
          pm2 restart airquality-backend
          
# Atualizar scripts Python
echo "🐍 Atualizando scripts Python..."
          cd scripts
          source venv/bin/activate
          pip install -r requirements.txt
deactivate

# Recarregar Nginx
echo "🌐 Recarregando Nginx..."
sudo systemctl reload nginx

echo "✅ Atualização concluída!"
pm2 status
```

```bash
# Tornar executável
chmod +x /home/airquality/update-app.sh

# Para atualizar no futuro:
./update-app.sh
```

### 12.2 Atualização Manual Passo a Passo

```bash
# 1. Fazer backup
/home/airquality/backup-database.sh

# 2. Baixar código atualizado
cd /home/airquality/apps/airquality-app
git pull origin main

# 3. Atualizar frontend
cd frontend
npm install
npm run build
pm2 restart airquality-frontend

# 4. Atualizar backend
cd ../backend
npm install
npm run build
pm2 restart airquality-backend

# 5. Atualizar Python (se necessário)
cd scripts
source venv/bin/activate
pip install -r requirements.txt
deactivate

# 6. Verificar
pm2 status
pm2 logs
```

---

## ✅ CHECKLIST COMPLETO DE DEPLOY

### Pré-Deploy
- [ ] VPS contratado e IP obtido
- [ ] Domínio registrado e DNS configurado apontando para IP do VPS
- [ ] Backup do banco de dados local preparado (se houver)
- [ ] Chave API PurpleAir obtida
- [ ] Arquivo `.env` com credenciais preparados

### Configuração do Servidor
- [ ] Servidor Ubuntu 22.04 instalado e atualizado
- [ ] Usuário `airquality` criado
- [ ] Firewall UFW configurado (portas 22, 80, 443)
- [ ] Fail2Ban instalado e configurado
- [ ] Node.js 20.x LTS instalado
- [ ] Python 3.11+ instalado
- [ ] PostgreSQL 17 LTS instalado
- [ ] Nginx instalado

### Banco de Dados
- [ ] Banco `db_airquality` criado
- [ ] Usuário `airquality_user` criado com senha forte
- [ ] Permissões concedidas
- [ ] Dados transferidos/importados (se houver)
- [ ] Backup automático configurado

### Código da Aplicação
- [ ] Repositório clonado do GitHub
- [ ] Dependências do frontend instaladas
- [ ] Frontend buildado
- [ ] Dependências do backend instaladas
- [ ] Backend buildado (se TypeScript)
- [ ] Ambiente virtual Python criado
- [ ] Dependências Python instaladas

### Configurações
- [ ] `.env.production` do frontend configurado
- [ ] `.env.production` do backend configurado
- [ ] `config.env` dos scripts Python configurado
- [ ] ecosystem.config.js do PM2 criado

### Serviços
- [ ] Frontend rodando no PM2 (porta 3000)
- [ ] Backend rodando no PM2 (porta 8080)
- [ ] PM2 configurado para iniciar no boot
- [ ] Cron job dos scripts Python configurado (05:10)
- [ ] Nginx configurado e rodando
- [ ] SSL obtido e configurado (Let's Encrypt)
- [ ] Renovação automática SSL configurada

### Segurança
- [ ] Firewall ativo
- [ ] Fail2Ban configurado
- [ ] Rate limiting configurado no Nginx
- [ ] Headers de segurança configurados
- [ ] PostgreSQL acessível apenas localmente

### Monitoramento
- [ ] Logrotate configurado
- [ ] Health check script criado e agendado
- [ ] PM2 monit funcionando
- [ ] Logs sendo gerados corretamente

### Testes Finais
- [ ] Frontend acessível via HTTPS
- [ ] Backend API respondendo
- [ ] Banco de dados conectando
- [ ] Scripts Python executando
- [ ] SSL válido e funcionando
- [ ] Redirecionamento HTTP → HTTPS funcionando
- [ ] Todas as páginas carregando corretamente

---

## 🆘 TROUBLESHOOTING

### Problema: Frontend não inicia

```bash
# Ver logs
pm2 logs airquality-frontend

# Verificar se porta 3000 está livre
sudo lsof -i :3000

# Verificar build
cd /home/airquality/apps/airquality-app/frontend
ls -la .next/

# Rebuild
npm run build
pm2 restart airquality-frontend
```

### Problema: Backend não conecta ao banco

```bash
# Testar conexão manual
psql -U airquality_user -d db_airquality -h localhost

# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Ver logs do PostgreSQL (PostgreSQL 17)
sudo tail -f /var/log/postgresql/postgresql-17-main.log

# Verificar credenciais no .env
cat /home/airquality/apps/airquality-app/backend/.env.production
```

### Problema: Nginx retorna 502 Bad Gateway

```bash
# Verificar se backend está rodando
pm2 status
curl http://localhost:3000
curl http://localhost:8080

# Ver logs do Nginx
sudo tail -f /var/log/nginx/airquality_error.log

# Verificar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Problema: SSL não funciona

```bash
# Verificar certificados
sudo certbot certificates

# Tentar renovar
sudo certbot renew --dry-run

# Se falhar, obter novamente
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Verificar configuração Nginx
sudo nginx -t
```

### Problema: Scripts Python não executam

```bash
# Verificar cron job
crontab -l

# Testar script manualmente
cd /home/airquality/apps/airquality-app/backend/scripts
source venv/bin/activate
python3 health_check.py

# Ver logs do cron
tail -f /home/airquality/logs/daily_update_cron.log

# Verificar permissões
ls -la /home/airquality/apps/airquality-app/backend/scripts/
```

---

## 📞 COMANDOS ÚTEIS PARA MANUTENÇÃO

### Gerenciamento PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs
pm2 logs airquality-frontend --lines 100
pm2 logs airquality-backend --lines 100

# Reiniciar
pm2 restart all
pm2 restart airquality-frontend
pm2 restart airquality-backend

# Parar
pm2 stop all
pm2 stop airquality-frontend

# Ver informações detalhadas
pm2 show airquality-frontend

# Monitoramento em tempo real
pm2 monit
```

### Gerenciamento PostgreSQL

```bash
# Status do serviço
sudo systemctl status postgresql

# Reiniciar
sudo systemctl restart postgresql

# Conectar ao banco
psql -U airquality_user -d db_airquality -h localhost

# Backup manual
pg_dump -U airquality_user -h localhost db_airquality > backup_$(date +%Y%m%d).sql

# Restore
psql -U airquality_user -d db_airquality < backup_20241109.sql

# Ver logs (PostgreSQL 17)
sudo tail -f /var/log/postgresql/postgresql-17-main.log
```

### Gerenciamento Nginx

```bash
# Status
sudo systemctl status nginx

# Reiniciar
sudo systemctl restart nginx

# Recarregar configuração (sem downtime)
sudo systemctl reload nginx

# Testar configuração
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/airquality_access.log
sudo tail -f /var/log/nginx/airquality_error.log
```

### Monitoramento do Sistema

```bash
# Uso de memória
free -h

# Uso de disco
df -h

# Uso de CPU e processos
htop  # ou: top

# Espaço usado por aplicação
du -sh /home/airquality/*

# Ver portas em uso
sudo lsof -i -P -n | grep LISTEN
```

---

## 📈 ESTIMATIVA DE CUSTOS

### VPS (Mensal)
- **DigitalOcean Droplet:** $24/mês (4GB RAM, 2 vCPUs, 80GB SSD)
- **Linode:** $24/mês (4GB RAM, 2 vCPUs, 80GB SSD)
- **Hetzner:** €4.15/mês (~$4.50) (4GB RAM, 2 vCPUs, 40GB SSD)
- **Contabo:** €6.99/mês (~$7.50) (8GB RAM, 4 vCPUs, 200GB SSD)

### Outros Custos
- **Domínio:** $10-15/ano
- **SSL:** Grátis (Let's Encrypt)
- **Backup externo (opcional):** $5-10/mês

### Total Estimado
- **Mínimo:** ~$12/mês (Hetzner + domínio/12)
- **Recomendado:** ~$25-40/mês (DigitalOcean/Linode)
- **Anual:** ~$300-480/ano

---

## 📚 RECURSOS ADICIONAIS

### Documentação Oficial
- [Next.js Production](https://nextjs.org/docs/going-to-production)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL 17 Documentation](https://www.postgresql.org/docs/17/)
- [Let's Encrypt](https://letsencrypt.org/getting-started/)

### Tutoriais Úteis
- [DigitalOcean Initial Server Setup](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-22-04)
- [Securing Nginx with Let's Encrypt](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-22-04)
- [PM2 Process Management](https://www.digitalocean.com/community/tutorials/how-to-use-pm2-to-setup-a-node-js-production-environment-on-an-ubuntu-vps)

---

## 📚 APÊNDICE: MIGRAÇÃO POSTGRESQL 15 → 17

Se você já tem PostgreSQL 15 instalado e deseja migrar para PostgreSQL 17:

### Passo 1: Backup do Banco Atual

```bash
# Fazer backup completo do banco
sudo -u postgres pg_dumpall > /tmp/postgres-backup-before-upgrade.sql

# Verificar tamanho do backup
ls -lh /tmp/postgres-backup-before-upgrade.sql

# Backup adicional do banco específico (formato custom)
sudo -u postgres pg_dump -Fc db_airquality > /tmp/db_airquality-backup.dump
```

### Passo 2: Instalar PostgreSQL 17 (mantendo o 15)

```bash
# Adicionar repositório se ainda não tiver
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/postgresql-archive-keyring.gpg
sudo apt update

# Instalar PostgreSQL 17 (rodará na porta 5433)
sudo apt install -y postgresql-17 postgresql-contrib-17

# Verificar clusters rodando
sudo pg_lsclusters
# Deve mostrar:
# Ver Cluster Port Status Owner    Data directory              Log file
# 15  main    5432 online postgres /var/lib/postgresql/15/main ...
# 17  main    5433 online postgres /var/lib/postgresql/17/main ...
```

### Passo 3: Parar Ambos os Clusters

```bash
# Parar PostgreSQL 15 e 17
sudo systemctl stop postgresql
sudo pg_ctlcluster 15 main stop
sudo pg_ctlcluster 17 main stop

# Verificar que estão parados
sudo pg_lsclusters
```

### Passo 4: Upgrade com pg_upgrade

**Opção A: Upgrade usando pg_upgrade (Mais Rápido)**

```bash
# Criar diretório para logs
sudo mkdir -p /var/log/postgresql/upgrade
sudo chown postgres:postgres /var/log/postgresql/upgrade

# Executar upgrade como usuário postgres
sudo -u postgres /usr/lib/postgresql/17/bin/pg_upgrade \
  --old-datadir=/var/lib/postgresql/15/main \
  --new-datadir=/var/lib/postgresql/17/main \
  --old-bindir=/usr/lib/postgresql/15/bin \
  --new-bindir=/usr/lib/postgresql/17/bin \
  --old-options '-c config_file=/etc/postgresql/15/main/postgresql.conf' \
  --new-options '-c config_file=/etc/postgresql/17/main/postgresql.conf' \
  --check

# Se o check passou, executar o upgrade real (remova --check)
sudo -u postgres /usr/lib/postgresql/17/bin/pg_upgrade \
  --old-datadir=/var/lib/postgresql/15/main \
  --new-datadir=/var/lib/postgresql/17/main \
  --old-bindir=/usr/lib/postgresql/15/bin \
  --new-bindir=/usr/lib/postgresql/17/bin \
  --old-options '-c config_file=/etc/postgresql/15/main/postgresql.conf' \
  --new-options '-c config_file=/etc/postgresql/17/main/postgresql.conf'
```

**Opção B: Migração usando dump/restore (Mais Seguro)**

```bash
# Iniciar apenas PostgreSQL 17 na porta padrão
sudo pg_dropcluster 17 main --stop
sudo pg_createcluster 17 main --start --port 5432

# Restaurar backup
sudo -u postgres psql -p 5432 < /tmp/postgres-backup-before-upgrade.sql

# Ou restaurar banco específico
sudo -u postgres createdb db_airquality -p 5432
sudo -u postgres pg_restore -d db_airquality -p 5432 /tmp/db_airquality-backup.dump
```

### Passo 5: Configurar PostgreSQL 17 na Porta Padrão

```bash
# Remover cluster antigo do PostgreSQL 15
sudo pg_dropcluster 15 main --stop

# Reconfigurar PostgreSQL 17 para porta 5432 (se ainda não estiver)
sudo pg_dropcluster 17 main --stop
sudo pg_createcluster 17 main --start --port 5432

# Ou editar manualmente:
sudo nano /etc/postgresql/17/main/postgresql.conf
# Alterar: port = 5432

# Reiniciar
sudo systemctl restart postgresql
```

### Passo 6: Verificar Migração

```bash
# Verificar versão
psql --version
sudo -u postgres psql -c "SELECT version();"

# Testar conexão com banco
psql -U airquality_user -d db_airquality -h localhost -c "\dt"

# Verificar dados
psql -U airquality_user -d db_airquality -h localhost -c "SELECT COUNT(*) FROM sua_tabela;"

# Verificar que está rodando na porta correta
sudo ss -tunelp | grep 5432
```

### Passo 7: Remover PostgreSQL 15 (Após Confirmação)

```bash
# APENAS após confirmar que tudo está funcionando!

# Remover cluster (se ainda existir)
sudo pg_dropcluster 15 main --stop

# Desinstalar PostgreSQL 15
sudo apt remove --purge postgresql-15 postgresql-contrib-15 -y
sudo apt autoremove -y

# Remover dados antigos (CUIDADO!)
sudo rm -rf /var/lib/postgresql/15
sudo rm -rf /etc/postgresql/15
```

### Passo 8: Atualizar Scripts e Configurações

```bash
# Atualizar referências de caminhos nos scripts
# Exemplo: backup scripts, cron jobs, etc.

# Verificar pg_hba.conf
sudo nano /etc/postgresql/17/main/pg_hba.conf

# Verificar postgresql.conf
sudo nano /etc/postgresql/17/main/postgresql.conf

# Reiniciar serviço
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

### Rollback (Se algo der errado)

```bash
# Parar PostgreSQL 17
sudo pg_dropcluster 17 main --stop

# Recriar cluster PostgreSQL 15
sudo pg_createcluster 15 main --start --port 5432

# Restaurar backup
sudo -u postgres psql -p 5432 < /tmp/postgres-backup-before-upgrade.sql

# Verificar
psql --version
sudo -u postgres psql -c "SELECT version();"
```

### Notas Importantes

1. ⚠️ **Sempre faça backup antes de migrar!**
2. ✅ **Teste o upgrade em ambiente de desenvolvimento primeiro**
3. ✅ **Planeje uma janela de manutenção**
4. ✅ **Mantenha os backups por pelo menos 1 semana após a migração**
5. ✅ **Verifique a compatibilidade de extensões (PostGIS, etc.)**
6. ✅ **Atualize strings de conexão na aplicação se necessário**
7. ✅ **Monitore logs após migração:** `sudo tail -f /var/log/postgresql/postgresql-17-main.log`

### Diferenças PostgreSQL 17 vs 15

**Novos recursos do PostgreSQL 17:**
- ✅ Performance melhorada em queries complexas (até 30% mais rápido)
- ✅ Melhor gerenciamento de memória
- ✅ Novos índices de performance (BRIN improvements)
- ✅ Suporte melhorado para JSON
- ✅ Autovacuum mais eficiente
- ✅ Melhor replicação lógica
- ✅ Suporte a SQL/JSON standard
- ✅ Segurança aprimorada

**Compatibilidade:**
- ✅ PostgreSQL 17 é totalmente compatível com aplicações escritas para PostgreSQL 15
- ✅ Não requer mudanças no código da aplicação
- ✅ Sintaxe SQL permanece a mesma

---

### Ferramentas de Monitoramento (Opcionais)
- **Uptime Robot:** Monitoramento gratuito de disponibilidade
- **Better Uptime:** Monitoramento com alertas
- **Netdata:** Dashboard de monitoramento em tempo real

---

## 📝 CONCLUSÃO

Este plano cobre o deploy completo da aplicação Air Quality App em um VPS, sem uso de Docker, com foco em:

✅ **Simplicidade:** Comandos diretos e bem explicados  
✅ **Segurança:** SSL, firewall, Fail2Ban, rate limiting  
✅ **Confiabilidade:** PM2, health checks, backups automáticos  
✅ **Manutenibilidade:** Scripts de atualização, logs, monitoramento  
✅ **Performance:** Nginx otimizado, compressão gzip  

**Tempo estimado de deploy:** 2-3 horas para primeira vez  
**Tempo estimado de atualização:** 5-10 minutos  

---

**Autor:** Air Quality Team  
**Data:** 2025-11-09  
**Versão:** 2.0 (VPS sem Docker)  
**Status:** ✅ Pronto para Produção
