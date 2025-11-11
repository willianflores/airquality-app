# -*- coding: utf-8 -*-
"""
Script para download de dados históricos da API PurpleAir
Preparado para execução diária automatizada
"""
import pandas as pd
from datetime import datetime, timedelta, timezone
import time
from io import StringIO
from sqlalchemy import create_engine
import requests
import logging
import os
from dotenv import load_dotenv
import pytz

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

# Função auxiliar para converter timestamps
def asPosixct(timestampStr):
    """Converte string de timestamp (formato ISO 8601) para datetime."""
    return datetime.strptime(timestampStr, '%Y-%m-%dT%H:%M:%SZ')

# Função auxiliar para construir a URL dos campos de dados
def build_fields_api_url(fields_list):
    """Retorna a string de URL para os campos, codificados para URL."""
    return "&fields=" + "%2C".join(fields_list)

# Função auxiliar para gerar intervalos de tempo respeitando limites da API
def generate_time_intervals(startDate, endDate, interval_days=30):
    """Gera listas de timestamps de início e fim para intervalos de dados."""
    startTime = asPosixct(startDate)
    endTime = asPosixct(endDate)
    
    if (endTime - startTime).days <= interval_days:
        return [startTime.strftime('%Y-%m-%dT%H:%M:%SZ')], [endTime.strftime('%Y-%m-%dT%H:%M:%SZ')]
    
    start_ts = pd.date_range(start=startTime, end=endTime, freq=f'{interval_days}D').strftime('%Y-%m-%dT%H:%M:%SZ').tolist()
    end_ts = pd.date_range(start=startTime + timedelta(days=interval_days), end=endTime, freq=f'{interval_days}D').strftime('%Y-%m-%dT%H:%M:%SZ').tolist()
    
    if len(start_ts) != len(end_ts):
        end_ts.append(endTime.strftime('%Y-%m-%dT%H:%M:%SZ'))
    
    return start_ts, end_ts

# Função principal para obter dados históricos da API PurpleAir
def getPurpleairApiHistoricalData(sensorsList, startDate, endDate, averageTime, keyRead, munLabel, maxRetries=5, sleepSeconds=2):
    """
    Baixa dados históricos da API PurpleAir para os sensores especificados.

    Parâmetros:
      sensorsList: Lista de IDs dos sensores.
      startDate, endDate: Datas de início e fim (no formato 'YYYY-MM-DDTHH:MM:SSZ').
      averageTime: Tempo de média desejado (em minutos).
      keyRead: API key para leitura.
      munLabel: Dicionário mapeando sensor_id para nome do município.
      maxRetries: Número máximo de tentativas para cada requisição.
      sleepSeconds: Tempo de espera entre as requisições.

    Retorna:
      DataFrame concatenado com todos os dados obtidos.
    """
    root_api_url = 'https://api.purpleair.com/v1/sensors/'
    averageApi = f'&average={averageTime}'
    fieldsList = [
        # Station information and status fields:
        "latitude, longitude, private, rssi, uptime, pa_latency, memory",

        # Environmental fields:
        "humidity, humidity_a, humidity_b, temperature, temperature_a, temperature_b, pressure, pressure_a, pressure_b",

        # PM1.0 fields:
        "pm1.0_atm, pm1.0_atm_a, pm1.0_atm_b, pm1.0_cf_1, pm1.0_cf_1_a, pm1.0_cf_1_b",

        # PM2.5 fields:
        "pm2.5_alt, pm2.5_alt_a, pm2.5_alt_b, pm2.5_atm, pm2.5_atm_a, pm2.5_atm_b, pm2.5_cf_1, pm2.5_cf_1_a, pm2.5_cf_1_b",

        # PM10.0 fields:
        "pm10.0_atm, pm10.0_atm_a, pm10.0_atm_b, pm10.0_cf_1, pm10.0_cf_1_a, pm10.0_cf_1_b",

        # Particle count fields:
        "0.3_um_count, 0.3_um_count_a, 0.3_um_count_b, 0.5_um_count, 0.5_um_count_a, 0.5_um_count_b, "
        "1.0_um_count, 1.0_um_count_a, 1.0_um_count_b, 2.5_um_count, 2.5_um_count_a, 2.5_um_count_b, "
        "5.0_um_count, 5.0_um_count_a, 5.0_um_count_b, 10.0_um_count, 10.0_um_count_a, 10.0_um_count_b"
    ]
    fields_api_url = build_fields_api_url(fieldsList)
    
    # Gera intervalos de tempo respeitando os limites da API
    start_Timestamps, end_Timestamps = generate_time_intervals(startDate, endDate, interval_days=30)
    
    df_all = pd.DataFrame()
    session = requests.Session()  # Reutiliza conexões para melhor desempenho

    for sensor_id in sensorsList:
        sensor_name = munLabel.get(sensor_id, "Desconhecido")
        logger.info(f"Iniciando download de dados para o sensor {sensor_id} ({sensor_name})")

        base_url = f"{root_api_url}{sensor_id}/history/csv?api_key={keyRead}"
        
        for start_ts, end_ts in zip(start_Timestamps, end_Timestamps):
            api_url = f"{base_url}&start_timestamp={start_ts}&end_timestamp={end_ts}{averageApi}{fields_api_url}"

            for attempt in range(maxRetries):
                try:
                    logger.debug(f"Tentando obter dados para {sensor_id} ({sensor_name}): {start_ts} - {end_ts} (Tentativa {attempt + 1})")
                    response = session.get(api_url, timeout=30)
                    response.raise_for_status()
                    df = pd.read_csv(StringIO(response.text), sep=",")
                    
                    if not df.empty:
                        df["mun_name"] = sensor_name
                        df_all = pd.concat([df_all, df], ignore_index=True)
                        logger.info(f"Dados do sensor {sensor_id} ({sensor_name}) obtidos com sucesso - {len(df)} registros")
                    else:
                        logger.warning(f"Nenhum dado retornado para o sensor {sensor_id} ({sensor_name}) no período {start_ts} - {end_ts}")
                    
                    break  # Sucesso, sai do loop de tentativas
                except requests.exceptions.RequestException as e:
                    wait_time = sleepSeconds * (2 ** attempt)  # Espera exponencial
                    logger.warning(f"Erro ao baixar dados do sensor {sensor_id} ({sensor_name}) na tentativa {attempt+1}: {e}")
                    if attempt < maxRetries - 1:
                        logger.info(f"Aguardando {wait_time} segundos antes da próxima tentativa...")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Máximo de tentativas atingido para o sensor {sensor_id} ({sensor_name}). Pulando para o próximo intervalo.")

    if not df_all.empty:
        df_all.columns = df_all.columns.str.replace('.', '_')
        df_all['time_stamp'] = pd.to_datetime(df_all['time_stamp']).dt.tz_convert('-05:00')
        df_all.sort_values(by=["time_stamp", "sensor_index"], inplace=True)

    return df_all

def get_last_24h_dates(timezone_str='America/Rio_Branco'):
    """
    Calcula as datas de início e fim para o dia anterior completo.
    Retorna: 00:00:00 até 23:59:59 do dia anterior
    Formato: ISO 8601 UTC esperado pela API PurpleAir.
    
    Exemplo: Se hoje é 2025-11-10, retorna:
      - Início: 2025-11-09 00:00:00 (horário local) → convertido para UTC
      - Fim:    2025-11-09 23:59:59 (horário local) → convertido para UTC
    """
    tz = pytz.timezone(timezone_str)
    now_local = datetime.now(tz)
    
    # Define o início como 00:00:00 do dia anterior
    yesterday_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
    
    # Define o fim como 23:59:59 do dia anterior
    yesterday_end = yesterday_start.replace(hour=23, minute=59, second=59, microsecond=0)
    
    # Converte para UTC (formato que a API espera)
    start_utc = yesterday_start.astimezone(pytz.UTC)
    end_utc = yesterday_end.astimezone(pytz.UTC)
    
    # Formata como string ISO 8601
    start_str = start_utc.strftime('%Y-%m-%dT%H:%M:%SZ')
    end_str = end_utc.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    return start_str, end_str


def get_sensors_config():
    """
    Retorna a configuração de sensores e municípios.
    Em produção, isso poderia vir de um arquivo de configuração ou banco de dados.
    """
    sensorsList = [
        57177, 31105, 25521, 27841, 31097, 25891, 56663, 31089, 25501, 57287,
        31117, 31101, 25551, 31111, 25531, 57309, 57171, 31107, 25541, 31099,
        151650, 31109, 31115, 25503, 31103, 31095, 25499, 31091, 56879, 176189,
    ]

    munLabel = {
        57177: "Acrelândia",
        31105: "Assis Brasil",
        25521: "Assis Brasil",
        27841: "Brasiléia",
        31097: "Brasiléia",
        25891: "Bujari",
        56663: "Capixaba",
        31089: "Cruzeiro do Sul",
        25501: "Cruzeiro do Sul",
        57287: "Cruzeiro do Sul",
        31117: "Epitaciolândia",
        31101: "Epitaciolândia",
        25551: "Feijó",
        31111: "Jordão",
        25531: "Mâncio Lima",
        57309: "Manoel Urbano",
        57171: "Marechal Thaumaturgo",
        31107: "Plácido de Castro",
        25541: "Porto Acre",
        31099: "Porto Walter",
        151650: "Rio Branco",
        31109: "Rio Branco",
        31115: "Rodrigues Alves",
        25503: "Santa Rosa do Purus",
        31103: "Sena Madureira",
        31095: "Sena Madureira",
        25499: "Senador Guiomard",
        31091: "Tarauacá",
        56879: "Xapuri",
        176189: "Rio Branco"
    }
    
    return sensorsList, munLabel


def download_and_save_daily_data():
    """
    Função principal para download e salvamento dos dados das últimas 24 horas.
    """
    try:
        # Configurações do banco de dados
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '5432')
        db_name = os.getenv('DB_NAME', 'db_airquality')
        db_user = os.getenv('DB_USER', 'postgres')
        db_password = os.getenv('DB_PASSWORD', 'soil7525')
        db_schema = os.getenv('DB_SCHEMA', 'sc_padata')
        table_realtime = os.getenv('TABLE_REALTIME', 'tb_parealtimedata')
        
        # Configurações da API
        api_key = os.getenv('PURPLEAIR_API_KEY')
        if not api_key:
            raise ValueError("PURPLEAIR_API_KEY não encontrada nas variáveis de ambiente")
        
        max_retries = int(os.getenv('MAX_RETRIES', '8'))
        sleep_seconds = int(os.getenv('SLEEP_SECONDS', '1'))
        timezone_str = os.getenv('TIMEZONE', 'America/Rio_Branco')
        
        # Calcular datas das últimas 24 horas
        start_date, end_date = get_last_24h_dates(timezone_str)
        logger.info(f"Período de download: {start_date} até {end_date}")
        
        # Obter configuração de sensores
        sensors_list, mun_label = get_sensors_config()
        logger.info(f"Total de sensores a processar: {len(sensors_list)}")
        
        # Download dos dados
        logger.info("Iniciando download dos dados da API PurpleAir...")
        df = getPurpleairApiHistoricalData(
            sensors_list,
            start_date,
            end_date,
            averageTime=0,  # real-time data
            keyRead=api_key,
            munLabel=mun_label,
            maxRetries=max_retries,
            sleepSeconds=sleep_seconds
        )
        
        if df.empty:
            logger.warning("Nenhum dado foi obtido da API PurpleAir")
            return None
        
        logger.info(f"Download concluído. Total de registros obtidos: {len(df)}")
        
        # Salvar no banco de dados
        engine = create_engine(f'postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}')
        
        logger.info(f"Salvando dados na tabela {db_schema}.{table_realtime}...")
        df.to_sql(
            table_realtime,
            con=engine,
            schema=db_schema,
            if_exists='append',
            index=False
        )
        
        logger.info(f"✅ Dados salvos com sucesso! {len(df)} registros inseridos.")
        engine.dispose()
        
        return df
        
    except Exception as e:
        logger.error(f"❌ Erro durante a execução: {str(e)}", exc_info=True)
        raise


# Exemplo de uso no terminal:
if __name__ == "__main__":
    logger.info("=" * 80)
    logger.info("Iniciando script de download de dados PurpleAir")
    logger.info("=" * 80)
    
    try:
        df = download_and_save_daily_data()
        if df is not None:
            logger.info("Script finalizado com sucesso!")
        else:
            logger.warning("Script finalizado sem dados para processar")
    except Exception as e:
        logger.error(f"Script finalizado com erro: {str(e)}")
        exit(1)
