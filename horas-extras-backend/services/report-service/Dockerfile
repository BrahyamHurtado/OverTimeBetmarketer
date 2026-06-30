# Build context = monorepo root (definido en docker-compose.yml).
# El report-service comparte la BD del overtime-service para lectura,
# por eso necesita el cliente Prisma con ese schema. Lo copiamos.
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
RUN npm i -g pnpm@9

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared ./packages/shared
COPY services/report-service ./services/report-service
# El report-service importa @prisma/client generado desde el schema del overtime-service
COPY services/overtime-service ./services/overtime-service

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @he/shared build
# El report-service reutiliza el cliente Prisma del overtime-service (mismo schema/BD).
# Como @prisma/client está hoisted en pnpm, generar una vez basta para ambos.
RUN pnpm --filter overtime-service exec prisma generate
RUN pnpm --filter report-service build

WORKDIR /app/services/report-service
EXPOSE 4003
CMD ["pnpm", "start"]
