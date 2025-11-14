"""
Script para processar dados de PM2.5 baixados da API PurpleAir
Calcula médias horárias e diárias, e filtra dados conforme padrões da OMS
Preparado para execução diária automatizada
"""
import psycopg2
import pandas as pd
import numpy as np
import logging
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import pytz
from purpleairFunctions import (
    getDbase, setPSQLPm25Data, pm25HourAverage, saveToPostgresql, 
    pm25DayAverage, fillPm25MissingDate, calculatePM25Median, filterUpWHOLevel
)

# Carregar variáveis de ambiente
load_dotenv('config.env')

# Configurar logging
log_file = os.getenv('LOG_FILE', 'daily_update.log')
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

# Parâmetros de conexão (vindos do .env ou valores default)
DBMS_NAME = 'PostgreSQL'
HOST = os.getenv('DB_HOST', 'localhost')
USER = os.getenv('DB_USER', 'postgres')
PASSWORD = os.getenv('DB_PASSWORD', 'soil7525')
DB_NAME = os.getenv('DB_NAME', 'db_airquality')
DB_SCHEMA = os.getenv('DB_SCHEMA', 'sc_padata')
TABLE_REALTIME = os.getenv('TABLE_REALTIME', 'tb_parealtimedata')
TABLE_NAME = f'{DB_SCHEMA}.{TABLE_REALTIME}'

def get_last_24h_dates_local(timezone_str='America/Rio_Branco'):
    """
    Calcula as datas de início e fim para o dia anterior completo no horário local.
    Retorna: 00:00:00 até 23:59:59 do dia anterior
    Formato: String no formato esperado pelas funções de processamento.
    
    Exemplo: Se hoje é 2025-11-10, retorna:
      - Início: 2025-11-09 00:00:00
      - Fim:    2025-11-09 23:59:59
    """
    tz = pytz.timezone(timezone_str)
    now_local = datetime.now(tz)
    
    # Define o início como 00:00:00 do dia anterior
    yesterday_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
    
    # Define o fim como 23:59:59 do dia anterior
    yesterday_end = yesterday_start.replace(hour=23, minute=59, second=59, microsecond=0)
    
    # Remove timezone info para compatibilidade com as funções existentes
    start_str = yesterday_start.replace(tzinfo=None).strftime('%Y-%m-%d %H:%M:%S')
    end_str = yesterday_end.replace(tzinfo=None).strftime('%Y-%m-%d %H:%M:%S')
    
    return start_str, end_str


def process_daily_data():
    """
    Função principal para processar dados das últimas 24 horas.
    """
    try:
        # Calcular período de processamento (últimas 24 horas)
        timezone_str = os.getenv('TIMEZONE', 'America/Rio_Branco')
        start_date, end_date = get_last_24h_dates_local(timezone_str)
        
        logger.info("=" * 80)
        logger.info("Iniciando processamento de dados PM2.5")
        logger.info(f"Período: {start_date} até {end_date}")
        logger.info("=" * 80)

        # Conectar ao banco e obter dados
        logger.info("Obtendo dados brutos do banco...")
        df = getDbase(DBMS_NAME, HOST, USER, PASSWORD, DB_NAME, TABLE_NAME, start_date, end_date)

        if df is None or df.empty:
            logger.warning("Nenhum dado encontrado no banco para o período especificado")
            return False
        
        logger.info(f"Dados carregados: {len(df)} registros")
        
        # Transformar dados
        logger.info("Transformando dados...")
        df = setPSQLPm25Data(df)

        # Calcular médias horárias
        logger.info("Calculando médias horárias...")
        df_hours = pm25HourAverage(df, start_date, end_date)
        
        # Salvar médias horárias
        table_hour = os.getenv('TABLE_HOUR', 'hour')
        logger.info(f"Salvando {len(df_hours)} registros de médias horárias na tabela '{table_hour}'...")
        saveToPostgresql(df_hours, table_hour, DB_NAME, USER, PASSWORD, HOST, 5432, 'append')

        # Calcular médias diárias
        logger.info("Calculando médias diárias...")
        df_day = pm25DayAverage(df, start_date, end_date)

        # Preencher valores ausentes
        logger.info("Preenchendo valores ausentes...")
        df_day = fillPm25MissingDate(df_day, start_date, end_date, "1d")
        
        # Calcular mediana
        logger.info("Calculando mediana...")
        df_day = calculatePM25Median(df_day)

        # Filtrar conforme limites da OMS
        logger.info("Filtrando dados conforme padrões da OMS (PM2.5 > 15 µg/m³)...")
        df_day = filterUpWHOLevel(df_day, start_date, end_date, "1d")

        # Salvar dados diários
        table_day = os.getenv('TABLE_DAY', 'day')
        logger.info(f"Salvando {len(df_day)} registros de médias diárias na tabela '{table_day}'...")
        saveToPostgresql(df_day, table_day, DB_NAME, USER, PASSWORD, HOST, 5432, 'append')

        logger.info("=" * 80)
        logger.info("✅ Processamento concluído com sucesso!")
        logger.info("=" * 80)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Erro durante o processamento: {str(e)}", exc_info=True)
        return False


if __name__ == "__main__":
    success = process_daily_data()
    exit(0 if success else 1)
