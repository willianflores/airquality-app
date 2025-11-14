#!/bin/bash

################################################################################
# Script de Instalação do PostGIS para PostgreSQL 17
# Air Quality App - Deployment Helper
################################################################################

set -e  # Parar em caso de erro

echo "================================================================================"
echo "  INSTALAÇÃO DO POSTGIS PARA POSTGRESQL 17"
echo "================================================================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Verificar se está rodando como root
if [ "$EUID" -eq 0 ]; then
    print_error "Não execute este script como root. Use sudo apenas quando necessário."
    exit 1
fi

echo ""
print_warning "⚠️  IMPORTANTE: PostGIS é necessário apenas para dados geoespaciais!"
print_warning "Se seu projeto não usa coordenadas/mapas, você pode pular esta instalação."
echo ""
read -p "Deseja continuar com a instalação do PostGIS? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    print_warning "Instalação cancelada pelo usuário."
    exit 0
fi

echo ""
print_status "Iniciando instalação do PostGIS..."
echo ""

# 1. Atualizar repositórios
print_status "1/7 - Atualizando repositórios..."
sudo apt update > /dev/null 2>&1
print_success "Repositórios atualizados"

# 2. Verificar se PostgreSQL 17 está instalado
print_status "2/7 - Verificando PostgreSQL 17..."
if ! dpkg -l | grep -q "postgresql-17"; then
    print_error "PostgreSQL 17 não encontrado!"
    print_error "Instale o PostgreSQL 17 primeiro."
    exit 1
fi
print_success "PostgreSQL 17 encontrado"

# 3. Tentar instalar PostGIS
print_status "3/7 - Instalando postgresql-17-postgis-3..."
if sudo apt install -y postgresql-17-postgis-3 2>&1 | grep -q "Unable to locate package"; then
    print_warning "Pacote não encontrado no repositório padrão"
    print_status "Adicionando repositório PostgreSQL oficial..."
    
    # Adicionar repositório
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    
    # Importar chave GPG
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
    
    # Atualizar e instalar
    sudo apt update > /dev/null 2>&1
    sudo apt install -y postgresql-17-postgis-3
fi
print_success "PostGIS instalado"

# 4. Verificar instalação
print_status "4/7 - Verificando instalação do PostGIS..."
if dpkg -l | grep -q "postgresql-17-postgis-3"; then
    VERSION=$(dpkg -l | grep "postgresql-17-postgis-3" | awk '{print $3}')
    print_success "PostGIS versão $VERSION instalado"
else
    print_error "Falha ao instalar PostGIS"
    exit 1
fi

# 5. Verificar arquivos de controle
print_status "5/7 - Verificando arquivos de extensão..."
if [ -f "/usr/share/postgresql/17/extension/postgis.control" ]; then
    print_success "Arquivo postgis.control encontrado"
else
    print_error "Arquivo postgis.control não encontrado"
    exit 1
fi

# 6. Listar extensões disponíveis
print_status "6/7 - Extensões PostGIS disponíveis:"
ls -1 /usr/share/postgresql/17/extension/postgis*.control 2>/dev/null | while read file; do
    basename "$file" .control | sed 's/^/  - /'
done

# 7. Instruções finais
print_status "7/7 - Configuração final..."
echo ""
print_success "✅ PostGIS instalado com sucesso!"
echo ""
echo "================================================================================"
echo "  PRÓXIMOS PASSOS"
echo "================================================================================"
echo ""
print_status "Para habilitar o PostGIS no seu banco de dados, execute:"
echo ""
echo "  1. Conectar ao banco:"
echo "     ${GREEN}sudo -u postgres psql -d db_airquality${NC}"
echo ""
echo "  2. Criar extensão:"
echo "     ${GREEN}CREATE EXTENSION IF NOT EXISTS postgis;${NC}"
echo ""
echo "  3. Verificar versão:"
echo "     ${GREEN}SELECT PostGIS_Version();${NC}"
echo ""
echo "  4. Listar extensões:"
echo "     ${GREEN}\\dx${NC}"
echo ""
echo "================================================================================"
echo ""

# Perguntar se quer habilitar agora
read -p "Deseja habilitar o PostGIS no banco 'db_airquality' agora? (s/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[SsYy]$ ]]; then
    print_status "Habilitando PostGIS no banco de dados..."
    
    # Verificar se o banco existe
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw db_airquality; then
        # Criar extensão
        sudo -u postgres psql -d db_airquality -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>&1
        
        if [ $? -eq 0 ]; then
            print_success "PostGIS habilitado no banco db_airquality!"
            
            # Mostrar versão
            echo ""
            print_status "Versão do PostGIS instalada:"
            sudo -u postgres psql -d db_airquality -c "SELECT PostGIS_Version();" -t
            
            # Listar extensões
            echo ""
            print_status "Extensões habilitadas:"
            sudo -u postgres psql -d db_airquality -c "\dx" | grep -E "postgis|Name"
        else
            print_error "Erro ao habilitar PostGIS"
        fi
    else
        print_error "Banco 'db_airquality' não encontrado!"
        print_warning "Crie o banco primeiro e execute:"
        print_warning "  sudo -u postgres psql -d db_airquality -c 'CREATE EXTENSION IF NOT EXISTS postgis;'"
    fi
else
    print_warning "Habilite o PostGIS manualmente quando necessário."
fi

echo ""
print_success "🎉 Instalação concluída!"
echo ""


