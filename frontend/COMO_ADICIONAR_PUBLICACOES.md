# 📚 Como Adicionar Novas Publicações

## 🎯 Guia Rápido para Atualização

### 📁 Localização dos Arquivos

```
frontend/src/data/reports.json     # Dados das publicações
public/reports/img/               # Imagens das capas
public/reports/pdf/               # Arquivos PDF
```

### ✅ Processo Simples de Adição

#### **1. Preparar Arquivos**
```bash
# 1. Adicione a imagem da capa
public/reports/img/AAAAMMDD_nome-do-arquivo.jpg

# 2. Adicione o arquivo PDF
public/reports/pdf/AAAAMMDD_nome-do-arquivo.pdf
```

#### **2. Atualizar JSON**
Edite o arquivo `src/data/reports.json` e adicione o novo relatório **no início** do array:

```json
[
  {
    "title": "Título da Nova Publicação",
    "description": "Descrição detalhada do conteúdo da publicação...",
    "imageUrl": "/reports/img/20241231_nova-publicacao.jpg",
    "fileUrl": "/reports/pdf/20241231_nova-publicacao.pdf",
    "date": "31/12/2024"
  },
  // ... publicações existentes
]
```

### 📋 Template para Nova Publicação

```json
{
  "title": "Título Completo da Publicação",
  "description": "Descrição detalhada que explique o conteúdo, metodologia e principais resultados da publicação. Mínimo de 20 caracteres.",
  "imageUrl": "/reports/img/AAAAMMDD_arquivo.jpg",
  "fileUrl": "/reports/pdf/AAAAMMDD_arquivo.pdf",
  "date": "DD/MM/AAAA"
}
```

### 🎨 Padrão de Nomenclatura

#### **Arquivos:**
- **Formato**: `AAAAMMDD_nome-descritivo.extensao`
- **Exemplo**: `20241231_relatorio-qualidade-ar-2024.pdf`

#### **Datas:**
- **Formato**: `DD/MM/AAAA`
- **Exemplo**: `31/12/2024`

### 🔧 Validações Automáticas

O sistema possui validações que verificam:

- ✅ **Título**: Mínimo 5 caracteres
- ✅ **Descrição**: Mínimo 20 caracteres  
- ✅ **URLs**: Formato válido
- ✅ **Data**: Formato DD/MM/AAAA válido
- ✅ **Imagens**: Fallback automático se não carregar

### 📊 Atualizações Automáticas

Ao adicionar uma nova publicação, o sistema automaticamente:

- ✅ **Atualiza estatísticas** (total, período, etc.)
- ✅ **Reordena por data** (mais recente primeiro)
- ✅ **Adiciona aos filtros** (ano disponível)
- ✅ **Inclui na pesquisa** (título e descrição)

### 🚀 Processo Completo - Exemplo Prático

#### **Cenário**: Adicionar "Relatório Qualidade do Ar 2024"

```bash
# 1. Preparar arquivos
cp relatorio-2024.pdf public/reports/pdf/20241231_relatorio-qualidade-ar-2024.pdf
cp capa-2024.jpg public/reports/img/20241231_relatorio-qualidade-ar-2024.jpg

# 2. Editar JSON (adicionar no início)
```

```json
[
  {
    "title": "Relatório Executivo: Qualidade do Ar no Acre - 2024",
    "description": "Análise completa da qualidade do ar em todos os municípios do Acre durante o ano de 2024, incluindo comparações com anos anteriores e recomendações para políticas públicas.",
    "imageUrl": "/reports/img/20241231_relatorio-qualidade-ar-2024.jpg",
    "fileUrl": "/reports/pdf/20241231_relatorio-qualidade-ar-2024.pdf",
    "date": "31/12/2024"
  },
  // ... outras publicações
]
```

```bash
# 3. Verificar resultado
# A página automaticamente:
# - Mostra a nova publicação no topo
# - Atualiza estatísticas para "11 publicações"
# - Adiciona "2024" nos filtros de ano
# - Inclui na pesquisa
```

### 🔮 Melhorias Futuras Planejadas

#### **Interface Administrativa (Roadmap)**
- 📝 **Formulário de adição** via interface web
- 🖼️ **Upload de imagens** drag-and-drop
- 📄 **Upload de PDFs** com validação
- ✏️ **Edição inline** de publicações existentes
- 🗑️ **Remoção** com confirmação
- 📊 **Dashboard** de estatísticas avançadas

#### **Automação (Roadmap)**
- 🔄 **Auto-deploy** ao atualizar JSON
- 📧 **Notificações** de novas publicações
- 🔍 **SEO automático** para cada publicação
- 📱 **PWA** para acesso offline

### 💡 Dicas Importantes

#### **✅ Boas Práticas:**
- Sempre adicionar **no início** do array JSON
- Usar **datas reais** de publicação
- **Descrever bem** o conteúdo (melhora SEO)
- **Testar** links antes de publicar

#### **❌ Evitar:**
- Não quebrar a sintaxe JSON
- Não usar caracteres especiais em URLs
- Não duplicar nomes de arquivo
- Não esquecer de adicionar vírgula entre objetos

### 📞 Suporte

Para dúvidas sobre adição de publicações:
- 📧 **Email**: willian.flores@ufac.br
- 🐛 **Issues**: GitHub do projeto
- 📖 **Documentação**: Este arquivo

---

**🎉 Agora é muito fácil adicionar novas publicações! Basta editar um arquivo JSON e os arquivos aparecem automaticamente na página com todas as funcionalidades modernas.**

