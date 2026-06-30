# Build context = monorepo root (definido en docker-compose.yml).
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
RUN npm i -g pnpm@9

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared ./packages/shared
COPY services/overtime-service ./services/overtime-service

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @he/shared build
RUN pnpm --filter overtime-service exec prisma generate
RUN pnpm --filter overtime-service build

WORKDIR /app/services/overtime-service
EXPOSE 4002
CMD ["pnpm", "start"]
