#!/bin/bash
# -*- coding: utf-8 -*-
"""
Script para configurar o cron job de atualização diária
========================================================
Este script configura o cron para executar daily_update.py todos os dias às 00:05

Uso:
    chmod +x setup_cron.sh
    ./setup_cron.sh
"""

# Diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PYTHON_EXEC=$(which python3)

# Verifica se python3 está instalado
if [ -z "$PYTHON_EXEC" ]; then
    echo "❌ Erro: python3 não encontrado no sistema"
    exit 1
fi

echo "📝 Configurando cron job para atualização diária..."
echo "   Diretório: $SCRIPT_DIR"
echo "   Python: $PYTHON_EXEC"

# Criar o cron job (executa às 00:05 todos os dias)
CRON_JOB="5 0 * * * cd $SCRIPT_DIR && $PYTHON_EXEC daily_update.py >> $SCRIPT_DIR/../logs/cron_output.log 2>&1"

# Verificar se o cron job já existe
(crontab -l 2>/dev/null | grep -F "daily_update.py") && {
    echo "⚠️  Cron job já existe. Removendo entrada antiga..."
    crontab -l 2>/dev/null | grep -v "daily_update.py" | crontab -
}

# Adicionar o novo cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job configurado com sucesso!"
echo ""
echo "📋 Cron jobs atuais:"
crontab -l | grep "daily_update.py"
echo ""
echo "ℹ️  O script será executado todos os dias às 00:05 (horário do sistema)"
echo "ℹ️  Para verificar os logs: tail -f $SCRIPT_DIR/../logs/daily_update.log"
echo "ℹ️  Para remover o cron job: crontab -e (e remover a linha manualmente)"


