# Frontend Dockerfile para airquality-app
FROM node:18-alpine AS builder

# Instalar dependências do sistema
RUN apk add --no-cache libc6-compat

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação para produção
RUN npm run build

# Imagem de produção
FROM node:18-alpine AS runner

# Instalar dependências do sistema
RUN apk add --no-cache libc6-compat curl

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos buildados
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Comando de inicialização
CMD ["node", "server.js"]

