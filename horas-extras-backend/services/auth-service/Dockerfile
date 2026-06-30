# Build context = monorepo root (definido en docker-compose.yml).
# Esto le da acceso al pnpm-workspace.yaml y al paquete @he/shared.
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
RUN npm i -g pnpm@9

# Metadata del workspace
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Paquetes necesarios para este servicio
COPY packages/shared ./packages/shared
COPY services/auth-service ./services/auth-service

# Instala dependencias (lee el lockfile del monorepo)
RUN pnpm install --frozen-lockfile

# Compila el paquete compartido y genera el cliente de Prisma
RUN pnpm --filter @he/shared build
RUN pnpm --filter auth-service exec prisma generate
RUN pnpm --filter auth-service build

WORKDIR /app/services/auth-service
EXPOSE 4001
CMD ["pnpm", "start"]
