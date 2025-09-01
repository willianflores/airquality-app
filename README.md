# Portal de Qualidade do Ar do Acre

O Portal de Qualidade do Ar do Acre é uma aplicação web desenvolvida para monitorar e disponibilizar dados de qualidade do ar em tempo real para todos os municípios do Estado do Acre. Esta é a maior rede de monitoramento da qualidade do ar da Amazônia, baseada em sensores PurpleAir PA-II-SD.

## 🚀 Características

- **Monitoramento em Tempo Real**: Dados atualizados constantemente dos sensores PurpleAir
- **Cobertura Completa**: 30 sensores distribuídos nos 22 municípios do Acre
- **Interface Administrativa**: Sistema de gestão para administradores
- **Gráficos Interativos**: Visualizações detalhadas da qualidade do ar
- **Relatórios e Publicações**: Seção dedicada para documentação científica
- **Responsivo**: Interface adaptável para desktop e dispositivos móveis

## 🏗️ Arquitetura

O projeto é dividido em duas partes principais:

### Frontend (Next.js)
- **Framework**: Next.js 14 com TypeScript
- **UI**: Tailwind CSS + Shadcn/ui
- **Autenticação**: Sistema de login administrativo
- **Gráficos**: Componentes interativos para visualização de dados

### Backend (Node.js)
- **Runtime**: Node.js com TypeScript
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **API**: RESTful API para dados dos sensores
- **Autenticação**: JWT para área administrativa

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/airquality-app.git
cd airquality-app
```

### 2. Configure o Backend
```bash
cd backend
npm install
cp env.example .env
# Configure as variáveis de ambiente no arquivo .env
npm run dev
```

### 3. Configure o Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Configure o Banco de Dados
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

## 🔧 Configuração das Variáveis de Ambiente

### Backend (.env)
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/airquality"
JWT_SECRET="sua-chave-secreta-jwt"
PORT=3001
NODE_ENV=development
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME="Portal de Qualidade do Ar do Acre"
```

## 📊 Estrutura do Projeto

```
airquality-app/
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── controllers/     # Controladores da API
│   │   ├── middleware/      # Middlewares de autenticação
│   │   ├── models/          # Modelos de dados
│   │   ├── routes/          # Rotas da API
│   │   ├── services/        # Lógica de negócio
│   │   └── prisma/          # Configuração do banco
│   └── package.json
├── frontend/                # Aplicação Next.js
│   ├── src/
│   │   ├── app/            # Páginas da aplicação
│   │   ├── components/     # Componentes React
│   │   ├── contexts/       # Contextos React
│   │   ├── hooks/          # Hooks customizados
│   │   └── utils/          # Utilitários
│   └── package.json
└── README.md
```

## 🚀 Scripts Disponíveis

### Backend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm run start        # Iniciar em produção
npm run migrate      # Executar migrações
```

### Frontend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm run start        # Iniciar em produção
npm run lint         # Verificar código
```

## 📱 Funcionalidades

### Páginas Públicas
- **Home**: Visão geral do projeto e mapa interativo
- **Gráficos Gerais**: Visualizações da qualidade do ar
- **Gráficos Municipais**: Dados específicos por município
- **Relatórios e Publicações**: Documentação científica
- **Sensores**: Informações sobre a rede de monitoramento

### Área Administrativa
- **Login**: Autenticação de administradores
- **Gestão de Sensores**: CRUD completo de sensores
- **Monitoramento de Sensores**: Dashboard de monitoramento
- **Configurações**: Configurações do sistema

## 🔐 Autenticação

O sistema possui dois níveis de acesso:
- **admin**: Acesso básico às funcionalidades administrativas
- **super_admin**: Acesso completo ao sistema

## 📊 Dados dos Sensores

Os dados são coletados dos sensores PurpleAir PA-II-SD e incluem:
- PM2.5 (10 minutos e 24 horas)
- Nível de confiança
- Status de conectividade
- Coordenadas geográficas
- Timestamp da última atualização

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Equipe

- **Dr. Willian Flores** - Coordenador do LabGAMA/UFAC
- **Equipe LabGAMA** - Universidade Federal do Acre
- **MPAC** - Ministério Público do Estado do Acre

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o projeto:
- Email: [email do suporte]
- GitHub Issues: [link para issues]

## 🔗 Links Úteis

- [PurpleAir API](https://api.purpleair.com/)
- [LabGAMA/UFAC](https://labgama.ufac.br/)
- [MPAC](https://www.mpac.mp.br/)

---

**Desenvolvido com ❤️ pelo LabGAMA/UFAC em parceria com o MPAC**
