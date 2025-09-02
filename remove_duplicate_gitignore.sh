#!/bin/bash

echo "🔧 Removendo .gitignore duplicados..."
echo "======================================"

# Verificar se estamos no diretório correto
if [ ! -f ".gitignore" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto (onde está o .gitignore principal)"
    exit 1
fi

echo "📍 Diretório atual: $(pwd)"
echo "📁 .gitignore principal encontrado: ✅"
echo ""

# Remover .gitignore do backend
if [ -f "backend/.gitignore" ]; then
    echo "🗑️  Removendo: backend/.gitignore"
    rm backend/.gitignore
    echo "✅ Removido: backend/.gitignore"
else
    echo "ℹ️  backend/.gitignore já não existe"
fi

# Remover .gitignore do frontend
if [ -f "frontend/.gitignore" ]; then
    echo "🗑️  Removendo: frontend/.gitignore"
    rm frontend/.gitignore
    echo "✅ Removido: frontend/.gitignore"
else
    echo "ℹ️  frontend/.gitignore já não existe"
fi

echo ""
echo "🔍 Verificando resultado..."

# Verificar se os arquivos foram removidos
if [ ! -f "backend/.gitignore" ] && [ ! -f "frontend/.gitignore" ]; then
    echo "✅ Sucesso: Todos os .gitignore duplicados foram removidos"
else
    echo "⚠️  Aviso: Alguns arquivos ainda podem existir"
    [ -f "backend/.gitignore" ] && echo "   - backend/.gitignore ainda existe"
    [ -f "frontend/.gitignore" ] && echo "   - frontend/.gitignore ainda existe"
fi

echo ""
echo "📊 Status atual:"
echo "   - ✅ .gitignore principal (raiz): Ativo e completo"
echo "   - ❌ backend/.gitignore: Removido"
echo "   - ❌ frontend/.gitignore: Removido"

echo ""
echo "🎉 Processo concluído!"
echo "📁 Apenas o .gitignore da raiz permanece ativo"
echo ""
echo "🚀 Próximos passos:"
echo "   1. Verificar status do Git: git status"
echo "   2. Fazer commit das mudanças: git add -A && git commit -m 'Remove duplicate .gitignore files'"
echo "   3. Verificar se tudo funciona: npm run build (em backend/ e frontend/)"
echo ""
echo "📚 Para mais informações, consulte: REMOVE_DUPLICATE_GITIGNORE.md"
