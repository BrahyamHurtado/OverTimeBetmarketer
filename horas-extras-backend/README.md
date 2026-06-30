# Horas Extras — Backend + Infra

Reemplazo digital del formato físico de horas extras. Monorepo de microservicios en TypeScript (Fastify + Prisma + PostgreSQL), con motor de cálculo compartido y testeado.

## Contenido

- `PLAN.md` — plan general: análisis del formato, actores, workflow, arquitectura, endpoints, escalabilidad, roadmap.
- `PROMPT-FRONTEND.md` — prompt listo para generar el front (Modern.js + React Query + Tailwind).
- `packages/shared/` — tipos, **motor de cálculo de horas** y calendario de festivos de Colombia (con tests).
- `services/gateway/` — API gateway (CORS, rate-limit, ruteo).
- `services/auth-service/` — registro, login, JWT, perfiles, roles.
- `services/overtime-service/` — planillas, cálculo y workflow de aprobación (núcleo).
- `services/report-service/` — informes, trazabilidad y cierre (contabilidad).
- `docker-compose.yml` — Postgres x2, Redis, RabbitMQ y los servicios.

## Arranque

```bash
cp .env.example .env            # define JWT_SECRET
pnpm install
pnpm --filter @he/shared build  # compila el paquete compartido
pnpm --filter @he/shared test   # corre los tests del motor
docker compose up -d            # infraestructura
# por servicio: pnpm prisma:migrate && pnpm dev
```

## Roles y flujo

Empleado llena su planilla (solo escribe fecha + horas, el resto se autocalcula) → guarda en BD → envía a revisión → Supervisor aprueba/rechaza con firma digital → Contabilidad genera informes, ve trazabilidad y cierra el periodo.

Las reglas legales (diurna 06:00–19:00, nocturna 19:00–06:00, dominicales/festivos) viven en un único lugar: `packages/shared`.
