#!/bin/bash

# 🐍 Script de Configuração Automática do Ambiente de Desenvolvimento Python
# Para airquality-app backend scripts
# Autor: Sistema de Deploy
# Data: 12/11/2025

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Banner
clear
echo -e "${GREEN}"
cat << "EOF"
   ___  _                      ___            __   __        ___              
  / _ \(_)______ ___ _____    / _ \___ _  __/ /__\ \  /\  / / /_ __ ____ __  
 / __ / / __/ -_|_-</ __/ /  / // / -_) |/ /  /  \ \/ \/ / __/ // / _ `/ _ \ 
/_/ /_/_/__/\__/___/\__/___/____/\__/|___/_/  /_/\_\__/__/__/\_,_/\_,_/_//_/ 
                      |___/ |___/                                             
                                                                               
      🐍 Configuração Automática do Ambiente de Desenvolvimento
EOF
echo -e "${NC}"

# Verificar se está no diretório correto
print_header "1. Verificando Diretório"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"
print_info "Diretório atual: $SCRIPT_DIR"

if [ ! -f "requirements.txt" ]; then
    print_error "Arquivo requirements.txt não encontrado!"
    print_info "Execute este script do diretório backend/scripts/"
    exit 1
fi
print_success "Arquivo requirements.txt encontrado"

# Verificar Python
print_header "2. Verificando Python"
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 não está instalado!"
    print_info "Instale com: sudo apt install python3 python3-pip python3-venv"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
print_success "Python $PYTHON_VERSION instalado"

# Verificar versão mínima (3.8)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    print_error "Python 3.8+ é necessário. Versão atual: $PYTHON_VERSION"
    exit 1
fi
print_success "Versão do Python é compatível (>= 3.8)"

# Verificar pip
if ! command -v pip3 &> /dev/null; then
    print_error "pip3 não está instalado!"
    print_info "Instale com: sudo apt install python3-pip"
    exit 1
fi
print_success "pip3 instalado"

# Criar ambiente virtual
print_header "3. Criando Ambiente Virtual"
if [ -d "venv" ]; then
    print_warning "Ambiente virtual já existe!"
    read -p "Deseja recriar? Isso removerá o ambiente atual (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        print_info "Removendo ambiente virtual antigo..."
        rm -rf venv
        print_success "Removido"
    else
        print_info "Mantendo ambiente virtual existente"
    fi
fi

if [ ! -d "venv" ]; then
    print_info "Criando novo ambiente virtual..."
    python3 -m venv venv
    print_success "Ambiente virtual criado em: $SCRIPT_DIR/venv"
else
    print_info "Usando ambiente virtual existente"
fi

# Ativar ambiente virtual
print_header "4. Ativando Ambiente Virtual"
source venv/bin/activate
print_success "Ambiente virtual ativado"
print_info "Python: $(which python)"
print_info "Versão: $(python --version)"

# Atualizar pip
print_header "5. Atualizando pip"
print_info "Atualizando pip para última versão..."
pip install --upgrade pip --quiet
PIP_VERSION=$(pip --version | cut -d' ' -f2)
print_success "pip atualizado para versão $PIP_VERSION"

# Instalar dependências
print_header "6. Instalando Dependências"
print_info "Instalando pacotes do requirements.txt..."
echo ""

# Instalar com output visível
pip install -r requirements.txt

echo ""
print_success "Todas as dependências instaladas!"

# Listar pacotes instalados
print_header "7. Pacotes Instalados"
pip list --format=columns

# Criar diretório de logs
print_header "8. Criando Estrutura de Diretórios"
if [ ! -d "logs" ]; then
    mkdir -p logs
    print_success "Diretório de logs criado"
else
    print_info "Diretório de logs já existe"
fi

# Criar arquivo .env se não existir
print_header "9. Configurando Arquivo .env"
if [ ! -f "config.env" ]; then
    if [ -f "config.env.example" ]; then
        print_info "Criando config.env a partir do template..."
        cp config.env.example config.env
        print_success "Arquivo config.env criado"
        print_warning "IMPORTANTE: Edite config.env com suas credenciais reais!"
        print_info "Execute: nano config.env"
    else
        print_warning "config.env.example não encontrado"
    fi
else
    print_info "Arquivo config.env já existe"
fi

# Verificar instalação
print_header "10. Verificando Instalação"
print_info "Testando imports críticos..."

python << EOF
import sys
try:
    import pandas
    print("✅ pandas:", pandas.__version__)
except ImportError as e:
    print("❌ pandas: não instalado")
    sys.exit(1)

try:
    import sqlalchemy
    print("✅ sqlalchemy:", sqlalchemy.__version__)
except ImportError as e:
    print("❌ sqlalchemy: não instalado")
    sys.exit(1)

try:
    import psycopg2
    print("✅ psycopg2:", psycopg2.__version__)
except ImportError as e:
    print("❌ psycopg2: não instalado")
    sys.exit(1)

try:
    import requests
    print("✅ requests:", requests.__version__)
except ImportError as e:
    print("❌ requests: não instalado")
    sys.exit(1)

try:
    import dotenv
    print("✅ python-dotenv:", dotenv.__version__)
except ImportError as e:
    print("❌ python-dotenv: não instalado")
    sys.exit(1)

try:
    import pytz
    print("✅ pytz:", pytz.__version__)
except ImportError as e:
    print("❌ pytz: não instalado")
    sys.exit(1)

print("\n🎉 Todos os pacotes importados com sucesso!")
EOF

# Resumo final
print_header "✅ Configuração Concluída!"

echo -e "${GREEN}"
cat << "EOF"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     🎉  AMBIENTE DE DESENVOLVIMENTO CONFIGURADO!  🎉      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
print_info "Próximos passos:"
echo ""
echo "  1️⃣  Editar arquivo de configuração:"
echo "     ${YELLOW}nano config.env${NC}"
echo ""
echo "  2️⃣  Ativar ambiente virtual (sempre que necessário):"
echo "     ${YELLOW}source venv/bin/activate${NC}"
echo ""
echo "  3️⃣  Testar scripts:"
echo "     ${YELLOW}python getPurpleairApiHistoricalData.py${NC}"
echo "     ${YELLOW}python runFuctions_server.py${NC}"
echo ""
echo "  4️⃣  Verificar logs:"
echo "     ${YELLOW}tail -f logs/airquality_update.log${NC}"
echo ""
echo "  5️⃣  Desativar ambiente (quando terminar):"
echo "     ${YELLOW}deactivate${NC}"
echo ""

print_header "📚 Recursos"
echo "  📖 Guia completo: SETUP_DEV_ENVIRONMENT.md"
echo "  📋 Instruções de teste: TEST_INSTRUCTIONS.txt"
echo "  🏗️  Arquitetura: ARCHITECTURE.md"
echo ""

# Criar arquivo de ativação rápida
cat > activate-dev.sh << 'ACTIVATE_EOF'
#!/bin/bash
# Script de ativação rápida do ambiente de desenvolvimento

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
    echo "❌ Ambiente virtual não encontrado!"
    echo "Execute primeiro: ./setup-dev.sh"
    exit 1
fi

source venv/bin/activate

echo "✅ Ambiente de desenvolvimento ativado!"
echo "📂 Diretório: $SCRIPT_DIR"
echo "🐍 Python: $(python --version)"
echo ""
echo "💡 Para desativar, execute: deactivate"
ACTIVATE_EOF

chmod +x activate-dev.sh
print_success "Script de ativação rápida criado: ./activate-dev.sh"

echo ""
print_success "Pronto para desenvolvimento! 🚀"
echo ""

# Perguntar se quer editar config.env agora
if [ -f "config.env" ]; then
    read -p "Deseja editar config.env agora? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        nano config.env
    fi
fi

