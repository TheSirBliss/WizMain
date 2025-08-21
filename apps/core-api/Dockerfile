# Fase 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json ./
# La riga pnpm-lock.yaml è stata rimossa
RUN npm install
COPY . .
RUN npm run build
# Prisma generate è necessario solo se usi Prisma nel backend
# RUN npx prisma generate

# Fase 2: Production
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/prisma ./prisma
EXPOSE 8080
CMD ["node", "dist/main.js"]