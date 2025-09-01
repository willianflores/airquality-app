# Configuração do Repositório no GitHub

## Passos para fazer upload do projeto para o GitHub

### 1. Criar um novo repositório no GitHub

1. Acesse [GitHub.com](https://github.com) e faça login
2. Clique no botão "+" no canto superior direito
3. Selecione "New repository"
4. Configure o repositório:
   - **Repository name**: `airquality-app`
   - **Description**: Portal de Qualidade do Ar do Acre - Maior rede de monitoramento da qualidade do ar da Amazônia
   - **Visibility**: Public (ou Private, conforme sua preferência)
   - **NÃO** marque "Add a README file" (já temos um)
   - **NÃO** marque "Add .gitignore" (já temos um)
   - **NÃO** marque "Choose a license" (já temos um)

### 2. Conectar o repositório local ao GitHub

Após criar o repositório, execute os seguintes comandos:

```bash
# Adicionar o repositório remoto (substitua SEU_USUARIO pelo seu username do GitHub)
git remote add origin https://github.com/SEU_USUARIO/airquality-app.git

# Verificar se foi adicionado corretamente
git remote -v

# Fazer push do código para o GitHub
git push -u origin main
```

### 3. Configurar GitHub Pages (Opcional)

Se quiser hospedar o frontend no GitHub Pages:

1. Vá para Settings > Pages
2. Source: Deploy from a branch
3. Branch: main
4. Folder: /frontend
5. Save

### 4. Configurar Secrets para CI/CD

Para que o CI/CD funcione corretamente, configure os secrets:

1. Vá para Settings > Secrets and variables > Actions
2. Adicione os seguintes secrets:
   - `DATABASE_URL`: URL do banco de dados PostgreSQL
   - `JWT_SECRET`: Chave secreta para JWT
   - `NEXT_PUBLIC_API_URL`: URL da API

### 5. Configurar Dependabot

O Dependabot já está configurado para:
- Atualizar dependências npm do backend semanalmente
- Atualizar dependências npm do frontend semanalmente
- Atualizar GitHub Actions semanalmente

### 6. Configurar Branch Protection (Recomendado)

1. Vá para Settings > Branches
2. Add rule para a branch `main`
3. Configure:
   - Require a pull request before merging
   - Require status checks to pass before merging
   - Require branches to be up to date before merging

### 7. Configurar Issues e Projects

1. Vá para Settings > Features
2. Habilite:
   - Issues
   - Projects
   - Wiki (opcional)
   - Discussions (opcional)

### 8. Configurar Labels

Crie labels úteis para organizar issues e PRs:
- `bug`: Para bugs
- `enhancement`: Para novas funcionalidades
- `documentation`: Para documentação
- `good first issue`: Para iniciantes
- `help wanted`: Para contribuições

### 9. Configurar Milestones

Crie milestones para organizar releases:
- `v1.0.0`: Primeira versão estável
- `v1.1.0`: Melhorias e correções
- `v2.0.0`: Novas funcionalidades principais

## Comandos Úteis

```bash
# Verificar status do repositório
git status

# Ver histórico de commits
git log --oneline

# Ver branches
git branch -a

# Criar nova branch para feature
git checkout -b feature/nova-funcionalidade

# Fazer push de uma nova branch
git push -u origin feature/nova-funcionalidade

# Atualizar repositório local
git pull origin main
```

## Estrutura do Repositório

```
airquality-app/
├── .github/                    # Configurações do GitHub
│   ├── workflows/             # CI/CD
│   ├── ISSUE_TEMPLATE/        # Templates de issues
│   └── dependabot.yml         # Atualizações automáticas
├── backend/                   # API Node.js
├── frontend/                  # Aplicação Next.js
├── scripts/                   # Scripts de manutenção
├── .gitignore                 # Arquivos ignorados
├── README.md                  # Documentação principal
├── LICENSE                    # Licença MIT
└── GITHUB_SETUP.md           # Este arquivo
```

## Próximos Passos

1. **Configurar ambiente de desenvolvimento**:
   - Instalar dependências: `npm install` em backend/ e frontend/
   - Configurar banco de dados PostgreSQL
   - Configurar variáveis de ambiente

2. **Configurar deploy**:
   - Vercel para frontend
   - Railway/Heroku para backend
   - Banco de dados PostgreSQL

3. **Configurar monitoramento**:
   - Sentry para erros
   - Analytics para uso
   - Logs estruturados

4. **Configurar backup**:
   - Backup automático do banco
   - Backup dos arquivos de configuração

## Suporte

Para dúvidas sobre a configuração:
- Consulte a documentação do GitHub
- Abra uma issue no repositório
- Entre em contato com a equipe de desenvolvimento
