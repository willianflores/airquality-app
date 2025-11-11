#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Principal de Atualização Diária
=======================================
Este script orquestra a execução diária de:
1. Download de dados das últimas 24 horas da API PurpleAir
2. Processamento dos dados (médias horárias e diárias)
3. Atualização das tabelas do banco de dados

Deve ser executado diariamente às 00:00 via cron job ou scheduler

Uso:
    python daily_update.py

Autor: Air Quality App Team
Data: 2025
"""

import sys
import os
import logging
from datetime import datetime
from dotenv import load_dotenv
import pytz

# Adicionar o diretório atual ao PYTHONPATH para imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Carregar variáveis de ambiente
load_dotenv('config.env')

# Configurar logging
log_file = os.getenv('LOG_FILE', '/home/willianflores/localhost/airquality-app/backend/logs/daily_update.log')
log_level = os.getenv('LOG_LEVEL', 'INFO')

# Criar diretório de logs se não existir
os.makedirs(os.path.dirname(log_file), exist_ok=True)

logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def main():
    """
    Função principal que executa todo o pipeline de atualização diária.
    """
    timezone_str = os.getenv('TIMEZONE', 'America/Rio_Branco')
    tz = pytz.timezone(timezone_str)
    start_time = datetime.now(tz)
    
    logger.info("╔" + "═" * 78 + "╗")
    logger.info("║" + " " * 20 + "ATUALIZAÇÃO DIÁRIA - AIR QUALITY APP" + " " * 21 + "║")
    logger.info("║" + f" Início: {start_time.strftime('%Y-%m-%d %H:%M:%S %Z')}" + " " * (77 - len(start_time.strftime('%Y-%m-%d %H:%M:%S %Z')) - 9) + "║")
    logger.info("╚" + "═" * 78 + "╝")
    
    success = True
    
    # ========================================
    # ETAPA 1: Download de Dados da API
    # ========================================
    logger.info("")
    logger.info("┌" + "─" * 78 + "┐")
    logger.info("│ ETAPA 1: Download de dados da API PurpleAir" + " " * 35 + "│")
    logger.info("└" + "─" * 78 + "┘")
    
    try:
        from getPurpleairApiHistoricalData import download_and_save_daily_data
        
        logger.info("Iniciando download dos dados das últimas 24 horas...")
        df_downloaded = download_and_save_daily_data()
        
        if df_downloaded is None or df_downloaded.empty:
            logger.warning("⚠️  Nenhum dado foi baixado da API. Verifique se há dados disponíveis.")
            logger.warning("Processo de download concluído sem dados.")
        else:
            logger.info(f"✅ Download concluído com sucesso! {len(df_downloaded)} registros obtidos.")
            
    except ImportError as e:
        logger.error(f"❌ Erro ao importar módulo de download: {e}")
        logger.error("Verifique se o arquivo getPurpleairApiHistoricalData.py está no mesmo diretório.")
        success = False
    except Exception as e:
        logger.error(f"❌ Erro durante o download de dados: {str(e)}", exc_info=True)
        success = False
    
    # ========================================
    # ETAPA 2: Processamento dos Dados
    # ========================================
    logger.info("")
    logger.info("┌" + "─" * 78 + "┐")
    logger.info("│ ETAPA 2: Processamento dos dados (médias horárias e diárias)" + " " * 17 + "│")
    logger.info("└" + "─" * 78 + "┘")
    
    try:
        from runFuctions_server import process_daily_data
        
        logger.info("Iniciando processamento dos dados...")
        processing_success = process_daily_data()
        
        if not processing_success:
            logger.warning("⚠️  Processamento concluído com avisos. Verifique os logs acima.")
            success = False
        else:
            logger.info("✅ Processamento concluído com sucesso!")
            
    except ImportError as e:
        logger.error(f"❌ Erro ao importar módulo de processamento: {e}")
        logger.error("Verifique se o arquivo runFuctions_server.py está no mesmo diretório.")
        success = False
    except Exception as e:
        logger.error(f"❌ Erro durante o processamento de dados: {str(e)}", exc_info=True)
        success = False
    
    # ========================================
    # RESUMO FINAL
    # ========================================
    end_time = datetime.now(tz)
    duration = end_time - start_time
    
    logger.info("")
    logger.info("╔" + "═" * 78 + "╗")
    logger.info("║" + " " * 30 + "RESUMO FINAL" + " " * 36 + "║")
    logger.info("╠" + "═" * 78 + "╣")
    logger.info("║ Status: " + ("✅ SUCESSO" if success else "❌ FALHA") + " " * (69 - len("✅ SUCESSO" if success else "❌ FALHA")) + "║")
    logger.info("║ Término: " + end_time.strftime('%Y-%m-%d %H:%M:%S %Z') + " " * (77 - len(end_time.strftime('%Y-%m-%d %H:%M:%S %Z')) - 10) + "║")
    logger.info("║ Duração: " + str(duration).split('.')[0] + " " * (69 - len(str(duration).split('.')[0])) + "║")
    logger.info("╚" + "═" * 78 + "╝")
    
    return 0 if success else 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.warning("\n⚠️  Processo interrompido pelo usuário")
        sys.exit(130)  # Exit code for SIGINT
    except Exception as e:
        logger.critical(f"❌ Erro crítico não tratado: {str(e)}", exc_info=True)
        sys.exit(1)


