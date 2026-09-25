# Rooster One — backend (NestJS + Prisma)
#
# Multi-stage: o estágio de build carrega devDependencies e o CLI do Nest; a
# imagem final leva só o necessário para rodar. Isso reduz a superfície da
# imagem e o tempo de subida.
#
# Base Alpine + openssl: o engine do Prisma precisa do OpenSSL, e sem ele a
# geração/execução falha com um erro pouco óbvio sobre biblioteca ausente.

# ---------- Estágio 1: dependências + build ----------
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app

# Copiar manifesto e schema antes do código: enquanto eles não mudarem, o
# Docker reaproveita a camada de instalação, que é a mais lenta.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# O client do Prisma é gerado a partir do schema e precisa existir antes da
# compilação — o TypeScript importa os tipos que ele produz.
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

# Reinstala só as dependências de produção, para copiar um node_modules enxuto.
RUN npm ci --omit=dev && npx prisma generate --schema=prisma/schema.prisma

# ---------- Estágio 2: imagem final ----------
FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# Roda como usuário sem privilégio. A imagem do Node já traz o usuário `node`.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json

# Anexos, certificados e notas fiscais são gravados aqui. É um VOLUME de
# propósito: sem isso, um redeploy apaga todo arquivo enviado — a limitação
# registrada em docs/engineering/08-divida-tecnica.md.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
VOLUME ["/app/uploads"]

USER node
EXPOSE 3000

# Usa o health check real (verifica o banco, não só se o processo responde).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/src/main.js"]
