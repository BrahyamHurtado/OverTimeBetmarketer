# Gateway: no usa Prisma ni @he/shared, solo Fastify + proxy.
# Build context = monorepo root.
FROM node:20-alpine
WORKDIR /app
RUN npm i -g pnpm@9

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY services/gateway ./services/gateway
# Las otras carpetas se copian vacías solo para que pnpm-workspace.yaml resuelva,
# pero no las instalamos. Truco: --filter gateway.
COPY packages/shared/package.json ./packages/shared/
COPY services/auth-service/package.json ./services/auth-service/
COPY services/overtime-service/package.json ./services/overtime-service/
COPY services/report-service/package.json ./services/report-service/

RUN pnpm install --frozen-lockfile --filter gateway...

RUN pnpm --filter gateway build

WORKDIR /app/services/gateway
EXPOSE 4000
CMD ["pnpm", "start"]
