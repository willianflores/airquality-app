# 🚀 GUIA RÁPIDO DE DEPLOY - AIR QUALITY APP (VPS)

## ⚡ Deploy Completo em 2 Horas

### 📋 Pré-requisitos
- VPS Ubuntu 22.04 com 4GB RAM
- Domínio configurado apontando para IP do VPS
- Acesso SSH root
- Backup do banco de dados (se houver)
- Chave API PurpleAir

---

## 🎯 PARTE 1: SETUP INICIAL (30 min)

### 1. Conectar e Preparar Servidor

```bash
# Conectar
ssh root@SEU_IP_VPS

# Atualizar sistema
apt update && apt upgrade -y

# Instalar essenciais
apt install -y curl wget git build-essential ufw fail2ban

# Criar usuário
adduser airquality
usermod -aG sudo airquality

# Configurar firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Trocar para novo usuário
su - airquality
```

### 2. Instalar Node.js, Python, PostgreSQL, Nginx

```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2
pm2 startup systemd
# Executar comando mostrado

# Python (já vem no Ubuntu)
sudo apt install -y python3 python3-pip python3-venv python3-dev libpq-dev

# PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15

# Nginx
sudo apt install -y nginx
```

---

## 💾 PARTE 2: BANCO DE DADOS (20 min)

### 3. Configurar PostgreSQL

```bash
# Criar banco e usuário
sudo -u postgres psql << EOF
CREATE DATABASE db_airquality;
CREATE USER airquality_user WITH ENCRYPTED PASSWORD 'SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE db_airquality TO airquality_user;
\c db_airquality
GRANT ALL ON SCHEMA public TO airquality_user;
\q
EOF
```

### 4. Transferir Dados (se houver backup)

**No seu computador local:**
```bash
# Transferir backup para servidor
scp backup.sql airquality@SEU_IP_VPS:/home/airquality/
```

**No servidor VPS:**
```bash
# Restaurar backup
psql -U airquality_user -d db_airquality < /home/airquality/backup.sql
```

### 5. Configurar Backup Automático

```bash
# Criar script de backup
cat > /home/airquality/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/airquality/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
PGPASSWORD='SENHA_FORTE_AQUI' pg_dump -U airquality_user -h localhost db_airquality | gzip > $BACKUP_DIR/backup_${TIMESTAMP}.sql.gz
find $BACKUP_DIR -type f -name "backup_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /home/airquality/backup-database.sh

# Agendar backup diário às 2h
(crontab -l 2>/dev/null; echo "0 2 * * * /home/airquality/backup-database.sh") | crontab -
```

---

## 📦 PARTE 3: CÓDIGO DA APLICAÇÃO (30 min)

### 6. Clonar Repositório do GitHub

```bash
cd /home/airquality
mkdir -p apps logs
cd apps
git clone https://github.com/willianflores/airquality-app.git
cd airquality-app
```

### 7. Configurar e Deploy Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Criar .env de produção
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_MAP_CENTER_LAT=-9.9753
NEXT_PUBLIC_MAP_CENTER_LNG=-67.8243
NEXT_PUBLIC_PURPLEAIR_API_KEY=SUA_CHAVE_AQUI
NODE_ENV=production
EOF

# Build
npm run build

# Criar configuração PM2
cat > /home/airquality/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'airquality-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/home/airquality/apps/airquality-app/frontend',
    env: { NODE_ENV: 'production', PORT: 3000 },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/home/airquality/logs/frontend-error.log',
    out_file: '/home/airquality/logs/frontend-out.log'
  }]
}
EOF
```

### 8. Configurar e Deploy Backend

```bash
cd /home/airquality/apps/airquality-app/backend

# Instalar dependências
npm install

# Criar .env de produção
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_NAME=db_airquality
DB_USER=airquality_user
DB_PASSWORD=SENHA_FORTE_AQUI
PURPLEAIR_API_KEY=SUA_CHAVE_AQUI
JWT_SECRET=CHAVE_JWT_FORTE_AQUI
ALLOWED_ORIGINS=https://seudominio.com
EOF

# Build (se TypeScript)
npm run build

# Adicionar backend ao PM2
cat >> /home/airquality/ecosystem.config.js << 'EOF'
  ,{
    name: 'airquality-backend',
    script: 'dist/index.js',
    cwd: '/home/airquality/apps/airquality-app/backend',
    env: { NODE_ENV: 'production', PORT: 8080 },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/home/airquality/logs/backend-error.log',
    out_file: '/home/airquality/logs/backend-out.log'
  }]
}
EOF

# Iniciar aplicações
pm2 start /home/airquality/ecosystem.config.js
pm2 save
pm2 status
```

### 9. Configurar Scripts Python

```bash
cd /home/airquality/apps/airquality-app/backend/scripts

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Configurar variáveis
cp config.env.example config.env
nano config.env
# Editar: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, PURPLEAIR_API_KEY

# Testar
source venv/bin/activate
python3 health_check.py
deactivate

# Configurar cron job (diário às 00:05)
(crontab -l 2>/dev/null; echo "5 0 * * * cd /home/airquality/apps/airquality-app/backend/scripts && ./venv/bin/python3 daily_update.py >> /home/airquality/logs/daily_update.log 2>&1") | crontab -
```

---

## 🌐 PARTE 4: NGINX E SSL (40 min)

### 10. Configurar Nginx

```bash
# Remover site padrão
sudo rm /etc/nginx/sites-enabled/default

# Criar configuração
sudo tee /etc/nginx/sites-available/airquality > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name seudominio.com www.seudominio.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

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
    }

    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    access_log /var/log/nginx/airquality_access.log;
    error_log /var/log/nginx/airquality_error.log;
}
EOF

# Ativar site
sudo ln -s /etc/nginx/sites-available/airquality /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 11. Configurar SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot

# Obter certificado SSL
sudo certbot --nginx -d seudominio.com -d www.seudominio.com
# Siga as instruções

# Certbot configurará SSL automaticamente
# Verificar renovação automática
sudo certbot renew --dry-run
```

---

## ✅ VERIFICAÇÃO FINAL

### 12. Testar Tudo

```bash
# Ver status dos serviços
pm2 status
sudo systemctl status postgresql
sudo systemctl status nginx

# Testar endpoints
curl http://localhost:3000
curl http://localhost:8080/health

# Ver logs
pm2 logs --lines 20

# Testar no navegador
# https://seudominio.com
```

---

## 📝 CHECKLIST RÁPIDO

- [ ] Servidor configurado e atualizado
- [ ] Firewall ativo (UFW)
- [ ] Node.js 20.x instalado
- [ ] Python 3 instalado
- [ ] PostgreSQL 15 instalado
- [ ] Nginx instalado
- [ ] Banco de dados criado
- [ ] Dados transferidos (se houver)
- [ ] Código clonado do GitHub
- [ ] Frontend buildado e rodando (PM2)
- [ ] Backend buildado e rodando (PM2)
- [ ] Scripts Python configurados
- [ ] Cron jobs configurados
- [ ] Nginx configurado
- [ ] SSL configurado
- [ ] Aplicação acessível via HTTPS

---

## 🆘 SOLUÇÃO RÁPIDA DE PROBLEMAS

### Aplicação não acessa
```bash
pm2 logs
pm2 restart all
sudo systemctl reload nginx
```

### Banco não conecta
```bash
sudo systemctl status postgresql
psql -U airquality_user -d db_airquality -h localhost
# Verificar senha no .env
```

### SSL não funciona
```bash
sudo certbot certificates
sudo certbot --nginx -d seudominio.com
sudo systemctl reload nginx
```

### Scripts Python não executam
```bash
cd /home/airquality/apps/airquality-app/backend/scripts
source venv/bin/activate
python3 health_check.py
crontab -l
```

---

## 🔄 ATUALIZAR APLICAÇÃO NO FUTURO

```bash
# Script de atualização rápida
cat > /home/airquality/update.sh << 'EOF'
#!/bin/bash
cd /home/airquality/apps/airquality-app
/home/airquality/backup-database.sh
git pull origin main
cd frontend && npm install && npm run build && cd ..
cd backend && npm install && npm run build && cd ..
cd backend/scripts && source venv/bin/activate && pip install -r requirements.txt && deactivate && cd ../../..
pm2 restart all
sudo systemctl reload nginx
pm2 status
EOF

chmod +x /home/airquality/update.sh

# Para atualizar:
./update.sh
```

---

## 📞 COMANDOS ESSENCIAIS

### PM2
```bash
pm2 status              # Ver status
pm2 logs                # Ver logs
pm2 restart all         # Reiniciar tudo
pm2 monit              # Monitoramento
```

### PostgreSQL
```bash
sudo systemctl status postgresql
psql -U airquality_user -d db_airquality
pg_dump -U airquality_user db_airquality > backup.sql
```

### Nginx
```bash
sudo systemctl status nginx
sudo nginx -t
sudo systemctl reload nginx
sudo tail -f /var/log/nginx/airquality_error.log
```

### Sistema
```bash
df -h                   # Espaço em disco
free -h                 # Memória
htop                    # Processos
```

---

## 💰 CUSTO ESTIMADO

- **VPS:** $20-40/mês (DigitalOcean/Linode) ou $5-10/mês (Hetzner/Contabo)
- **Domínio:** $10-15/ano
- **SSL:** Grátis (Let's Encrypt)

**Total:** ~$25-50/mês

---

## 📚 RECURSOS

- [DEPLOY_PLAN.md](./DEPLOY_PLAN.md) - Guia detalhado completo
- [PM2 Docs](https://pm2.keymetrics.io/)
- [Nginx Docs](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**⏱️ Tempo Total:** 2-3 horas (primeira vez)  
**🔄 Atualizações:** 5-10 minutos  
**💻 Plataforma:** VPS sem Docker  
**✅ Status:** Pronto para produção!
