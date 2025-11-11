#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Verificação de Saúde - Air Quality App
=================================================
Verifica se todos os componentes estão funcionando corretamente

Uso:
    python3 health_check.py
"""

import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv
import pytz

# Cores para terminal
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n")

def print_check(name, status, details=""):
    status_color = Colors.GREEN if status == "OK" else Colors.YELLOW if status == "WARN" else Colors.RED
    status_symbol = "✅" if status == "OK" else "⚠️ " if status == "WARN" else "❌"
    print(f"{status_symbol} {Colors.BOLD}{name:.<50}{Colors.END} {status_color}{status}{Colors.END}")
    if details:
        print(f"   {details}")

def check_config_file():
    """Verifica se o arquivo de configuração existe"""
    config_file = 'config.env'
    if os.path.exists(config_file):
        load_dotenv(config_file)
        return "OK", f"Arquivo encontrado: {config_file}"
    else:
        return "FAIL", "Arquivo config.env não encontrado!"

def check_dependencies():
    """Verifica se todas as dependências estão instaladas"""
    required = ['pandas', 'numpy', 'sqlalchemy', 'psycopg2', 'requests', 'dotenv', 'pytz']
    missing = []
    
    for lib in required:
        try:
            __import__(lib if lib != 'dotenv' else 'dotenv')
        except ImportError:
            missing.append(lib)
    
    if not missing:
        return "OK", f"Todas as {len(required)} dependências instaladas"
    else:
        return "FAIL", f"Faltam: {', '.join(missing)}"

def check_database_connection():
    """Verifica conexão com o banco de dados"""
    try:
        from sqlalchemy import create_engine
        
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '5432')
        db_name = os.getenv('DB_NAME', 'db_airquality')
        db_user = os.getenv('DB_USER', 'postgres')
        db_password = os.getenv('DB_PASSWORD')
        
        if not db_password:
            return "FAIL", "DB_PASSWORD não configurada em config.env"
        
        engine = create_engine(f'postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}')
        conn = engine.connect()
        result = conn.execute("SELECT 1;")
        conn.close()
        engine.dispose()
        
        return "OK", f"Conectado a {db_name}@{db_host}:{db_port}"
    except Exception as e:
        return "FAIL", f"Erro de conexão: {str(e)}"

def check_api_key():
    """Verifica se a API key está configurada"""
    api_key = os.getenv('PURPLEAIR_API_KEY')
    
    if not api_key:
        return "FAIL", "PURPLEAIR_API_KEY não configurada em config.env"
    
    # Teste básico de formato
    if len(api_key) < 20:
        return "WARN", f"API key parece inválida (muito curta: {len(api_key)} chars)"
    
    return "OK", f"API key configurada ({len(api_key)} chars)"

def check_log_directory():
    """Verifica se o diretório de logs existe"""
    log_file = os.getenv('LOG_FILE', '/home/willianflores/localhost/airquality-app/backend/logs/daily_update.log')
    log_dir = os.path.dirname(log_file)
    
    if os.path.exists(log_dir):
        if os.access(log_dir, os.W_OK):
            return "OK", f"Diretório acessível: {log_dir}"
        else:
            return "WARN", f"Sem permissão de escrita em: {log_dir}"
    else:
        return "FAIL", f"Diretório não existe: {log_dir}"

def check_last_execution():
    """Verifica quando foi a última execução bem-sucedida"""
    log_file = os.getenv('LOG_FILE', '/home/willianflores/localhost/airquality-app/backend/logs/daily_update.log')
    
    if not os.path.exists(log_file):
        return "WARN", "Nenhuma execução encontrada (log não existe)"
    
    try:
        with open(log_file, 'r') as f:
            lines = f.readlines()
        
        # Procurar última linha com SUCESSO
        success_lines = [l for l in lines if '✅ SUCESSO' in l or 'SUCESSO' in l]
        
        if not success_lines:
            return "WARN", "Nenhuma execução bem-sucedida encontrada nos logs"
        
        last_success = success_lines[-1]
        # Extrair timestamp (formato: 2025-11-09 00:23:15)
        parts = last_success.split(' - ')
        if len(parts) > 0:
            timestamp_str = parts[0].strip()
            try:
                last_time = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S,%f')
            except:
                try:
                    last_time = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                except:
                    return "WARN", "Não foi possível extrair timestamp do log"
            
            now = datetime.now()
            hours_ago = (now - last_time).total_seconds() / 3600
            
            if hours_ago < 26:  # Menos de 26 horas
                return "OK", f"Última execução há {hours_ago:.1f} horas ({last_time.strftime('%Y-%m-%d %H:%M')})"
            else:
                return "WARN", f"Última execução há {hours_ago:.1f} horas ({last_time.strftime('%Y-%m-%d %H:%M')})"
        
        return "WARN", "Não foi possível analisar última execução"
        
    except Exception as e:
        return "FAIL", f"Erro ao ler log: {str(e)}"

def check_database_data():
    """Verifica se há dados recentes no banco"""
    try:
        from sqlalchemy import create_engine
        import pandas as pd
        
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '5432')
        db_name = os.getenv('DB_NAME', 'db_airquality')
        db_user = os.getenv('DB_USER', 'postgres')
        db_password = os.getenv('DB_PASSWORD')
        db_schema = os.getenv('DB_SCHEMA', 'sc_padata')
        table_realtime = os.getenv('TABLE_REALTIME', 'tb_parealtimedata')
        
        engine = create_engine(f'postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}')
        
        query = f"""
        SELECT MAX(time_stamp) as last_data, COUNT(*) as total
        FROM {db_schema}.{table_realtime}
        WHERE time_stamp >= NOW() - INTERVAL '48 hours';
        """
        
        df = pd.read_sql(query, engine)
        engine.dispose()
        
        last_data = df['last_data'].iloc[0]
        total = df['total'].iloc[0]
        
        if last_data is None:
            return "WARN", "Nenhum dado nas últimas 48 horas"
        
        now = datetime.now(pytz.UTC)
        last_data_aware = pd.to_datetime(last_data).tz_localize('UTC')
        hours_ago = (now - last_data_aware).total_seconds() / 3600
        
        if hours_ago < 26:
            return "OK", f"{total} registros nas últimas 48h (último: {hours_ago:.1f}h atrás)"
        else:
            return "WARN", f"{total} registros, mas último é de {hours_ago:.1f}h atrás"
            
    except Exception as e:
        return "FAIL", f"Erro ao verificar dados: {str(e)}"

def check_cron_job():
    """Verifica se o cron job está configurado"""
    try:
        import subprocess
        result = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
        
        if result.returncode != 0:
            return "WARN", "Cron vazio ou erro ao ler crontab"
        
        if 'daily_update.py' in result.stdout:
            # Extrair horário
            for line in result.stdout.split('\n'):
                if 'daily_update.py' in line and not line.startswith('#'):
                    parts = line.split()
                    if len(parts) >= 5:
                        minute = parts[0]
                        hour = parts[1]
                        return "OK", f"Configurado para rodar às {hour}:{minute} diariamente"
            
            return "OK", "Cron job configurado"
        else:
            return "WARN", "Cron job não encontrado (precisa executar setup_cron.sh)"
            
    except Exception as e:
        return "FAIL", f"Erro ao verificar cron: {str(e)}"

def main():
    print_header("VERIFICAÇÃO DE SAÚDE - AIR QUALITY APP")
    
    checks = [
        ("Arquivo de Configuração", check_config_file),
        ("Dependências Python", check_dependencies),
        ("Conexão com Banco de Dados", check_database_connection),
        ("API Key PurpleAir", check_api_key),
        ("Diretório de Logs", check_log_directory),
        ("Cron Job", check_cron_job),
        ("Última Execução", check_last_execution),
        ("Dados no Banco", check_database_data),
    ]
    
    results = []
    
    for name, check_func in checks:
        try:
            status, details = check_func()
            print_check(name, status, details)
            results.append(status)
        except Exception as e:
            print_check(name, "FAIL", f"Erro: {str(e)}")
            results.append("FAIL")
    
    # Resumo
    print_header("RESUMO")
    
    ok_count = results.count("OK")
    warn_count = results.count("WARN")
    fail_count = results.count("FAIL")
    
    total = len(results)
    
    print(f"  ✅ OK:      {ok_count}/{total}")
    print(f"  ⚠️  AVISOS:  {warn_count}/{total}")
    print(f"  ❌ FALHAS:  {fail_count}/{total}")
    print()
    
    if fail_count > 0:
        print(f"{Colors.RED}{Colors.BOLD}❌ Sistema com problemas críticos!{Colors.END}")
        print(f"   Consulte README_DAILY_UPDATE.md para solução\n")
        return 1
    elif warn_count > 0:
        print(f"{Colors.YELLOW}{Colors.BOLD}⚠️  Sistema funcional mas com avisos{Colors.END}")
        print(f"   Recomenda-se verificar os avisos acima\n")
        return 0
    else:
        print(f"{Colors.GREEN}{Colors.BOLD}✅ Todos os sistemas operacionais!{Colors.END}\n")
        return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Verificação interrompida pelo usuário{Colors.END}")
        sys.exit(130)
    except Exception as e:
        print(f"\n{Colors.RED}Erro crítico: {str(e)}{Colors.END}")
        sys.exit(1)


