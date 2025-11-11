from sqlalchemy import create_engine
import mysql.connector
import psycopg2
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

## Get data from PostgreSQL database 
def processDatabaseData(DBMS_name, host_name, user_name, password, db_name, table_name, start_date, end_date):
    engine = None
    try:
        # Conexão com o banco de dados usando SQLAlchemy
        if DBMS_name == 'MySQL':
            engine = create_engine(f"mysql+mysqlconnector://{user_name}:{password}@{host_name}/{db_name}")
        elif DBMS_name == 'PostgreSQL':
            engine = create_engine(f"postgresql+psycopg2://{user_name}:{password}@{host_name}/{db_name}")
        else:
            print("O DBMS_name inserido não é suportado por esta função!")
            return None
        
        # Definir a consulta SQL
        query = f"""
        SELECT time_stamp AS date, 
               0.5 * pm2_5_atm_a - 0.66 AS pm2_5_a, 
               0.5 * pm2_5_atm_b - 0.66 AS pm2_5_b,
               mun_name AS municipio
        FROM {table_name}
        WHERE time_stamp BETWEEN '{start_date}' AND '{end_date}';
        """
        
        # Executar a consulta e carregar os resultados em um DataFrame
        data = pd.read_sql(query, engine)
        
        # Converter a coluna 'date' para datetime com o fuso horário correto
        data['date'] = pd.to_datetime(data['date']).dt.tz_convert('America/Lima')
        
        # Processamento dos dados
        # Função auxiliar para remover o fuso horário
        def convert_timestamp_type(date_column):
            if pd.api.types.is_datetime64tz_dtype(date_column):
                return date_column.dt.tz_localize(None)
            return date_column
        
        # Remover o fuso horário da coluna 'date'
        data['date'] = convert_timestamp_type(data['date'])

        # Ajustar valores de pm2_5_a e pm2_5_b
        data['pm2_5_a'] = data['pm2_5_a'].apply(lambda x: max(x, 0))  # Definir como 0 se menor que 0
        data['pm2_5_b'] = data['pm2_5_b'].apply(lambda x: max(x, 0))
        data['pm2_5_a'] = data['pm2_5_a'].apply(lambda x: np.nan if x >= 1000 else x)  # Definir como NaN se >= 1000
        data['pm2_5_b'] = data['pm2_5_b'].apply(lambda x: np.nan if x >= 1000 else x)

        # Calcular a média entre pm2_5_a e pm2_5_b, ignorando NaN
        data['pm2_5'] = data[['pm2_5_a', 'pm2_5_b']].mean(axis=1, skipna=True)

        # Substituir NaN por None e selecionar colunas relevantes
        data['pm2_5'] = data['pm2_5'].replace({np.nan: None})
        processed_data = data[['date', 'pm2_5', 'municipio']]

        return processed_data

    except Exception as e:
        print(f"Erro ao conectar ou processar os dados: {e}")
        return None

    finally:
        if engine:
            engine.dispose()

def getDbase(DBMS_name, host_name, user_name, password, db_name, table_name, start_date, end_date):
    engine = None
    
    try:
        # Conexão com MySQL usando SQLAlchemy
        if DBMS_name == 'MySQL':
            engine = create_engine(f"mysql+mysqlconnector://{user_name}:{password}@{host_name}/{db_name}")
            # Definir a consulta SQL para MySQL
            query = f"""
            SELECT time_stamp AS date, 
                   0.5 * pm2_5_atm_a - 0.66 AS PM2_5_a, 
                   0.5 * pm2_5_atm_b - 0.66 AS pm2_5_b,
                   mun_name AS municipio
            FROM {table_name}
            WHERE time_stamp BETWEEN '{start_date}' AND '{end_date}';
            """
        
        # Conexão com PostgreSQL usando SQLAlchemy
        elif DBMS_name == 'PostgreSQL':
            engine = create_engine(f"postgresql+psycopg2://{user_name}:{password}@{host_name}/{db_name}")
            # Definir a consulta SQL para PostgreSQL
            query = f"""
            SELECT time_stamp AS date, 
                   0.5 * pm2_5_atm_a - 0.66 AS PM2_5_a, 
                   0.5 * pm2_5_atm_b - 0.66 AS pm2_5_b,
                   mun_name AS municipio
            FROM {table_name}
            WHERE time_stamp BETWEEN '{start_date}' AND '{end_date}';
            """
        
        else:
            print("O DBMS_name inserido não é suportado por esta função!")
            return None
        
        # Executar a consulta e carregar os resultados em um DataFrame usando o SQLAlchemy engine
        data = pd.read_sql(query, engine)
        data['date'] = pd.to_datetime(data['date']).dt.tz_convert('America/Lima')
        
        return data
    
    except Exception as e:
        print(f"Erro ao conectar ou realizar a consulta: {e}")
    
    finally:
        if engine:
            engine.dispose()
            
## Processes data from PostgreSQL database

def setPSQLPm25Data(pm25_data):
    # Required libraries
    import pandas as pd
    import numpy as np
    
    # Cria uma cópia do DataFrame para evitar modificar o original
    request_db_set = pm25_data.copy()

    # Função auxiliar para verificar e converter o tipo de data
    def convert_timestamp_type(date_column):
        # Verifica se o tipo de coluna é "timestamp with time zone" e converte para "timestamp without time zone"
        if pd.api.types.is_datetime64tz_dtype(date_column):
            # Remove o fuso horário para converter para "timestamp without time zone"
            return date_column.dt.tz_localize(None)
        return date_column
    
    # Verifica e converte a coluna 'date' caso tenha fuso horário
    request_db_set['date'] = convert_timestamp_type(request_db_set['date'])

    # Define pm2_5_a e pm2_5_b para 0 se forem menores que 0
    request_db_set['pm2_5_a'] = request_db_set['pm2_5_a'].apply(lambda x: max(x, 0))
    request_db_set['pm2_5_b'] = request_db_set['pm2_5_b'].apply(lambda x: max(x, 0))
    
    # Define pm2_5_a e pm2_5_b como NaN se forem maiores ou iguais a 1000
    request_db_set['pm2_5_a'] = request_db_set['pm2_5_a'].apply(lambda x: np.nan if x >= 1000 else x)
    request_db_set['pm2_5_b'] = request_db_set['pm2_5_b'].apply(lambda x: np.nan if x >= 1000 else x)

    # Calcula a média de pm2_5_a e pm2_5_b, ignorando NaN
    request_db_set['pm2_5'] = request_db_set[['pm2_5_a', 'pm2_5_b']].mean(axis=1, skipna=True)

    # Substitui NaN por None e converte pm2_5 para tipo numérico
    request_db_set['pm2_5'] = request_db_set['pm2_5'].replace({np.nan: None})

    # Seleciona apenas as colunas date, pm2_5 e municipio
    request_db_set = request_db_set[['date', 'pm2_5', 'municipio']]

    return request_db_set


## Fill missing dates

def fillPm25MissingDate(pm25_data, start_date, end_date, time_unit):
    # Remover fuso horário da coluna 'date' em pm25_data
    pm25_data['date'] = pd.to_datetime(pm25_data['date']).dt.tz_localize(None)
    
    # Lista de municípios
    mun_list = [
        'Rio Branco', 'Assis Brasil', 'Acrelândia', 'Bujari', 'Brasiléia', 'Capixaba',
        'Cruzeiro do Sul', 'Epitaciolândia', 'Feijó', 'Jordão', 'Mâncio Lima',
        'Marechal Thaumaturgo', 'Manoel Urbano', 'Plácido de Castro', 'Porto Acre',
        'Porto Walter', 'Rodrigues Alves', 'Senador Guiomard', 'Sena Madureira',
        'Santa Rosa do Purus', 'Tarauacá', 'Xapuri'
    ]
    
    # Função para criar a sequência de datas
    def time_seq_by_interval(start_date, end_date, time_unit):
        date_range = pd.date_range(start=start_date, end=end_date, freq=time_unit)
        return pd.DataFrame({'date': date_range})

    # Criar a sequência de datas
    other_df = time_seq_by_interval(start_date, end_date, time_unit)
    request_list = []

    for mun in mun_list:
        # Filtrar dados do município atual
        request = pm25_data[pm25_data['municipio'] == mun][['date', 'pm2_5']]
        
        # Fazer a junção completa (full join) com a sequência de datas
        request = pd.merge(other_df, request, on='date', how='outer')
        request['municipio'] = mun
        
        request_list.append(request)
    
    # Concatenar todos os DataFrames na lista
    request_db_day_df = pd.concat(request_list, ignore_index=True)
    
    return request_db_day_df

## Calculate PM2.5 median by time interval
def calculatePM25Median(request_db_day):
    # Calcular a mediana de todas as colunas exceto 'municipio', agrupando por 'date'
    t_mean = request_db_day.groupby('date').median(numeric_only=True).reset_index()

    # Adicionar uma coluna 'municipio' com o valor 'media'
    t_mean['municipio'] = 'media'

    # Combinar os DataFrames original e calculado
    request_db_day = pd.concat([request_db_day, t_mean], ignore_index=True)
    
    return request_db_day

## Filter days up WHO level by time interval
def filterUpWHOLevel(request_db_day, start_date, end_date, time_unit):
    """
    Filtra dados onde PM2.5 está acima de 15 e estrutura os dados para análise.

    Parâmetros:
        request_db_day (DataFrame): Dados diários de PM2.5.
        start_date (str): Data de início no formato 'YYYY-MM-DD' ou 'YYYY-MM-DD HH:MM:SS'.
        end_date (str): Data de fim no mesmo formato de start_date.
        time_unit (str): Unidade de tempo, aceita "1d" ou "1h".

    Retorna:
        DataFrame processado com filtro e datas alinhadas.
    """
    # Filtrar valores acima de 15
    t_mean = request_db_day.groupby('date').median(numeric_only=True).reset_index()
    mun_up_oms = t_mean[t_mean['pm2_5'] > 15][['date', 'pm2_5']]

    # Converter para datetime
    mun_up_oms['date'] = pd.to_datetime(mun_up_oms['date'])

    # Verifica se a data contém horário e escolhe o formato correto
    try:
        if " " in start_date:  # Caso tenha horário, usar o formato completo
            start_date_parsed = datetime.strptime(start_date, '%Y-%m-%d %H:%M:%S')
            end_date_parsed = datetime.strptime(end_date, '%Y-%m-%d %H:%M:%S')
        else:  # Caso contrário, usar apenas ano-mês-dia
            start_date_parsed = datetime.strptime(start_date, '%Y-%m-%d')
            end_date_parsed = datetime.strptime(end_date, '%Y-%m-%d')
    except ValueError as e:
        raise ValueError(f"Erro ao converter datas: {e}. Verifique o formato das entradas.")

    # Criar sequência de datas conforme o time_unit
    date_range = pd.date_range(start=start_date_parsed, end=end_date_parsed, freq=time_unit)

    # Criar DataFrame com datas geradas
    other_df = pd.DataFrame({'date': date_range})

    # Fazer merge (full join) para alinhar as datas
    mun_up_oms = pd.merge(other_df, mun_up_oms, on='date', how='outer')

    # Adicionar município fixo para indicar excesso de PM2.5
    mun_up_oms['municipio'] = 'up_pm2_5'

    # Combinar os DataFrames original e processado
    request_db_day = pd.concat([request_db_day, mun_up_oms], ignore_index=True)
    
    return request_db_day

## Day moving average

def pm25DayAverage(pm25_data, start_date, end_date):
    # Certificar-se de que a coluna 'date' está no formato datetime
    pm25_data['date'] = pd.to_datetime(pm25_data['date'])

    # Filtrar os dados entre as datas especificadas
    filtered_data = pm25_data[(pm25_data['date'] >= start_date) & (pm25_data['date'] <= end_date)]

    # Agrupar por município e resamplear para médias diárias
    request_db_day = (filtered_data
                      .set_index('date')  # Definir 'date' como índice para resample
                      .groupby('municipio')  # Agrupar por 'municipio'
                      .resample('1D')  # Reamostrar para médias diárias
                      .mean()
                      .reset_index())  # Resetar índice para manter 'municipio' e 'date' como colunas

    # Substituir valores NA por NaN
    request_db_day['pm2_5'] = request_db_day['pm2_5'].replace({np.nan: 'NaN'})
    
    # Converter para tipo numérico, mantendo NaN
    request_db_day['pm2_5'] = pd.to_numeric(request_db_day['pm2_5'], errors='coerce')

    return request_db_day

def saveToPostgresql(dataframe, table_name, db_name, user, password, host, port, if_exists):
    """
    Grava os dados de um DataFrame pandas para uma tabela PostgreSQL.

    Parâmetros:
    dataframe: pandas.DataFrame - O DataFrame a ser gravado no banco de dados.
    table_name: str - O nome da tabela no PostgreSQL onde os dados serão gravados.
    db_name: str - O nome do banco de dados PostgreSQL.
    user: str - O nome de usuário do PostgreSQL.
    password: str - A senha do usuário do PostgreSQL.
    host: str - O host do banco de dados PostgreSQL (padrão é 'localhost').
    port: int - A porta do banco de dados PostgreSQL (padrão é 5432).
    if_exists: str - A ação a ser tomada se a tabela já existir:
        'fail' - gera um erro,
        'replace' - substitui a tabela existente,
        'append' - adiciona os dados à tabela existente.

    Retorno:
    None
    """
    from sqlalchemy import create_engine
    import pandas as pd

    # Cria uma string de conexão com o banco de dados PostgreSQL usando SQLAlchemy
    connection_string = f"postgresql://{user}:{password}@{host}:{port}/{db_name}"
    
    # Cria o motor de conexão
    engine = create_engine(connection_string)
    
    try:
        # Grava os dados do DataFrame no PostgreSQL
        dataframe.to_sql(table_name, engine, if_exists=if_exists, index=False)
        print(f"Dados gravados com sucesso na tabela '{table_name}' do banco de dados '{db_name}'")
    except Exception as e:
        print(f"Erro ao gravar dados no PostgreSQL: {e}")

def pm25HourAverage(pm25_data, start_date, end_date):
    # Filtrar os dados dentro do intervalo de datas especificado
    pm25_data_filtered = pm25_data[(pm25_data['date'] >= start_date) & (pm25_data['date'] <= end_date)]

    # Converter a coluna 'date' para o formato datetime, se ainda não estiver
    pm25_data_filtered['date'] = pd.to_datetime(pm25_data_filtered['date'])

    # Definir a coluna 'date' como índice para facilitar a resample
    pm25_data_filtered = pm25_data_filtered.set_index('date')

    # Agrupar por município e calcular a média horária
    request_db_hour = pm25_data_filtered.groupby('municipio').resample('1h').mean().reset_index()

    # Substituir NaN por "NaN" (string) para ser consistente com o código R
    request_db_hour['pm2_5'] = request_db_hour['pm2_5'].replace({pd.NA: 'NaN'})

    # Certificar-se de que a coluna pm2_5 é numérica
    request_db_hour['pm2_5'] = pd.to_numeric(request_db_hour['pm2_5'], errors='coerce')
    
    # Fill missing hours 
    request_db_hour = fillPm25MissingDate(request_db_hour, start_date, end_date, "1h")
    
    ## Calculate PM2.5 median by time interval
    request_db_hour = calculatePM25Median(request_db_hour)
    
    ## Filter days up WHO level by time interval
    request_db_hour = filterUpWHOLevel(request_db_hour, start_date, end_date, "1h")
    
    return request_db_hour

import pandas as pd
import numpy as np

def aqMatrix(hours_pm25_data, lang='pt'):
    # Copiando os dados
    day_and_hour = hours_pm25_data.copy()
    
    # Filtrar apra retirar dados de up_pm2_5
    day_and_hour = day_and_hour[(day_and_hour['municipio'] != 'up_pm2_5') | (day_and_hour['municipio'] != 'media')]
    
    # Extraindo componentes da data
    day_and_hour['mes'] = day_and_hour['date'].dt.month
    day_and_hour['hora'] = day_and_hour['date'].dt.hour
    
    # Convertendo os meses para string
    day_and_hour['mes'] = day_and_hour['mes'].astype(str)
    
    # Filtrando e somando PM2.5 acima de 15
    day_and_hour = day_and_hour[day_and_hour['pm2_5'] > 15]
    day_and_hour = day_and_hour.groupby(['mes', 'hora']).size().reset_index(name='total')
    
    # Ordenando os dados
    day_and_hour = day_and_hour.sort_values(by=['mes', 'hora'])
    
    # Criando a base para valores faltantes
    mes = np.tile(np.arange(1, 13), 24).astype(str)  # 12 meses repetidos 24 vezes
    hora = np.repeat(np.arange(0, 24), 12)  # 24 horas repetidas 12 vezes
    
    join = pd.DataFrame({'mes': mes, 'hora': hora})
    
    # Fazendo o merge para garantir todos os valores de horas e meses
    day_and_hour = pd.merge(join, day_and_hour, on=['mes', 'hora'], how='left')
    
    # Substituir valores NaN por 0
    day_and_hour['total'] = day_and_hour['total'].fillna(0)
    
    # Preparar labels e títulos
    if lang == 'en':
        xlabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        xtitle = 'Time (months)'
        ytitle = 'Time (hours)'
    elif lang == 'pt':
        xlabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        xtitle = 'Meses'
        ytitle = 'Horas'
    
    # Convertendo colunas para inteiros para evitar erros na plotagem
    day_and_hour['mes'] = day_and_hour['mes'].astype(int)
    day_and_hour['hora'] = day_and_hour['hora'].astype(int)

    return day_and_hour


import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def munList(output_path, utf8=False):
    # Função de exemplo para simular o retorno da lista de municípios
    # Modifique essa função para carregar a lista real de municípios
    return ["Municipio1", "Municipio2", "Municipio3"]

def setUpHourOMS(pm25_data_hours, start_date, end_date, output_path, utf8=False):
    # Carregar a lista de municípios (adaptar de acordo com a implementação real)
    mun_list = munList(output_path, utf8=utf8)
    mun_list = list(set(mun_list))  # Garantir que os municípios sejam únicos
    
    # Converter strings de data em objetos datetime
    start_date = datetime.strptime(start_date, "%b %d %Y %H:%M:%S")
    end_date = datetime.strptime(end_date, "%b %d %Y %H:%M:%S")
    
    # Criar intervalo de datas por hora
    date_range = pd.date_range(start=start_date, end=end_date, freq='H')
    other_df = pd.DataFrame({'date': date_range})

    request_list = []

    # Loop sobre cada município
    for mun in mun_list:
        # Filtrar os dados de PM2.5 e do município atual
        request = pm25_data_hours[(pm25_data_hours['pm2_5'] > 15) & (pm25_data_hours['municipio'] == mun)][['date', 'pm2_5']]
        
        # Fazer a junção completa para garantir todas as horas
        request = pd.merge(other_df, request, on='date', how='left')
        request['municipio'] = mun
        request_list.append(request)

    # Concatenar todas as tabelas em um único DataFrame
    mun_up_oms_hour = pd.concat(request_list, ignore_index=True)
    
    # Substituir NaNs onde o valor de pm2_5 é ausente
    mun_up_oms_hour['pm2_5'].fillna(value=np.nan, inplace=True)
    
    # Converter valores de pm2_5 para numéricos (caso sejam strings ou categorias)
    mun_up_oms_hour['pm2_5'] = pd.to_numeric(mun_up_oms_hour['pm2_5'], errors='coerce')

    return mun_up_oms_hour

# Exemplo de uso
# Suponha que `pm25_data_hours` seja um DataFrame com as colunas 'date', 'pm2_5', e 'municipio'
# Exemplo de DataFrame para teste:
# pm25_data_hours = pd.DataFrame({
#     'date': pd.date_range(start='2023-01-01', periods=1000, freq='H'),
#     'pm2_5': np.random.uniform(0, 50, 1000),
#     'municipio': np.random.choice(['Municipio1', 'Municipio2', 'Municipio3'], 1000)
# })

## Count days up who have PM2.5 > 15 μg/m³ by time interval
import pandas as pd
from datetime import datetime

def countPm25UpWhoMun(pm25_data, start_year, end_year, mun_list):
    # Filtra os dados para o intervalo de anos especificado e valores de PM2.5 > 15
    filtered_data = pm25_data[
        (pm25_data['date'].dt.year >= start_year) &
        (pm25_data['date'].dt.year <= end_year) &
        (pm25_data['pm2_5'] > 15)
    ]
    
    # Adiciona uma coluna "year" com o ano extraído da coluna de data
    filtered_data['year'] = filtered_data['date'].dt.year
    
    # Agrupa por "municipio" e "year" e conta os dias acima de 15 µg/m³
    result = (
        filtered_data.groupby(['municipio', 'year'])
        .size()
        .reset_index(name='days_up')
    )
    
    # Cria uma lista de DataFrames para cada ano com todos os municípios e days_up=0 onde faltarem registros
    all_data = []
    for year in range(start_year, end_year + 1):
        # Filtra apenas o ano específico
        year_data = result[result['year'] == year]
        
        # Encontra os municípios faltantes para o ano atual
        missing_mun = set(mun_list) - set(year_data['municipio'])
        
        # Cria um DataFrame para os municípios faltantes com days_up = 0
        missing_data = pd.DataFrame({
            'municipio': list(missing_mun),
            'year': year,
            'days_up': 0
        })
        
        # Junta os dados do ano atual com os municípios faltantes
        year_complete_data = pd.concat([year_data, missing_data], ignore_index=True)
        all_data.append(year_complete_data)
    
    # Concatena os dados de todos os anos e municípios
    final_result = pd.concat(all_data, ignore_index=True)
    
    return final_result


import pandas as pd
from datetime import datetime

def countPm25UpWhoMunDrapper(pm25_data, start_year, end_year):
    # Cria lista de anos e nomes de colunas
    years = list(range(start_year, end_year + 1))
    columns_names = [str(year) for year in years]
    
    # Lista para armazenar os DataFrames de cada ano
    data_mun_up = []
    
    for year in years:
        # Filtra os dados por ano e PM2.5 > 15
        filtered_data = pm25_data[
            (pm25_data['date'] >= pd.to_datetime(f'{year}-01-01')) &
            (pm25_data['date'] <= pd.to_datetime(f'{year}-12-31')) &
            (pm25_data['pm2_5'] > 15)
        ]
        
        # Agrupa por município e conta as ocorrências
        mun_up = filtered_data.groupby('municipio').size().reset_index(name=str(year))
        
        # Adiciona o DataFrame resultante à lista
        data_mun_up.append(mun_up)
    
    # Junta todos os DataFrames por município, preenchendo valores ausentes
    mun_up_oms = pd.concat(data_mun_up, axis=1, join='outer').fillna(0)
    
    return mun_up_oms

# Exemplo de uso
# pm25_data: DataFrame contendo as colunas 'date', 'pm2_5', 'municipio'
# pm25_data = pd.read_csv('path_to_data.csv')  # Carregar dados de exemplo
# result = count_pm25_up_who_mun(pm25_data, 2018, 2020)
# print(result)

## Export pandas dataframe to CSV
def exportToCsv(df: pd.DataFrame, filename: str, index: bool = False, encoding: str = 'utf-8') -> None:
    """
    Exporta um DataFrame para um arquivo CSV.

    Parâmetros:
    df (pd.DataFrame): O DataFrame a ser exportado.
    filename (str): O nome do arquivo CSV de destino.
    index (bool): Define se o índice do DataFrame será incluído no CSV. Padrão é False.
    encoding (str): Codificação do arquivo CSV. Padrão é 'utf-8'.
    """
    try:
        df.to_csv(filename, index=index, encoding=encoding)
        print(f"Arquivo CSV '{filename}' salvo com sucesso!")
    except Exception as e:
        print(f"Erro ao salvar o arquivo CSV: {e}")

# Exemplo de uso
# Supondo que você tenha um DataFrame chamado df
# export_to_csv(df, 'meu_arquivo.csv')

