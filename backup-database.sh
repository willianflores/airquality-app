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

# Manter apenas últimos 28 dias (4 semanas de backups)
find $BACKUP_DIR -type f -name "backup_*.sql.gz" -mtime +28 -delete

echo "Backup concluído: backup_${TIMESTAMP}.sql.gz"
