# Horas Extras — Frontend

SPA en **Modern.js + React 18 + TypeScript + TailwindCSS + React Query** que reemplaza el formato físico de horas extras diurnas, nocturnas, dominicales y festivas.

Conecta con el backend de microservicios a través del gateway en `API_URL` (por defecto `http://localhost:4000`).

## Comandos

```bash
pnpm install
cp .env.example .env          # ajusta API_URL si tu gateway no está en :4000
pnpm dev                      # arranca el dev server (puerto 8080)
pnpm codegen                  # regenera los hooks de React Query a partir de los *.api.ts
pnpm build && pnpm serve      # build de producción
```

> El backend debe estar corriendo en `${API_URL}`. Levántalo con `docker compose up -d` en `horas-extras-backend`.

## Roles y rutas

| Rol | Acceso |
|---|---|
| `EMPLEADO` | `/empleado` (mis planillas) · `/empleado/planilla` (crear/editar) |
| `SUPERVISOR` | `/supervisor` (bandeja) · `/supervisor/:id` (revisar) |
| `CONTABILIDAD` | `/contabilidad` (informes, trazabilidad, cierre) |

`/login` y `/registro` son públicas. La raíz `/` redirige según el rol del usuario autenticado.

## Estructura

```
src/
├── __generated__/   # Hooks de React Query autogenerados (NO editar a mano)
├── config/          # API_URL y variables de entorno
├── lib/             # Cliente de React Query
├── shared/          # apiClient (fetch + JWT), tipos, motor de cálculo, festivos
├── pages/           # Páginas + definiciones de API (*.api.ts)
├── components/      # UI compartida + PlanillaImprimible + FirmaCanvas
├── contexts/        # AuthContext
└── routes/          # File-based routing + RoleGuard
```

## Flujo de desarrollo

1. Defines la API en `src/pages/<feature>/<feature>.api.ts` (descriptores tipados).
2. Corres `pnpm codegen` → genera hooks de React Query tipados en `src/__generated__/`.
3. Usas los hooks desde tus páginas.

## Cálculo en cliente

El motor en `src/shared/calculo.ts` replica el del backend para dar **preview instantáneo** mientras el empleado escribe. El backend sigue siendo la fuente de verdad al persistir.

- Diurna: 06:00–19:00
- Nocturna: 19:00–06:00 (soporta cruce de medianoche)
- Si el día es DOMINICAL/FESTIVO → las horas van a los buckets dominicales
- Autodetección de tipo de día con festivos de Colombia (Ley Emiliani)

## Impresión

`components/PlanillaImprimible.tsx` + CSS `@media print` → `window.print()` produce el formato oficial sin headers de la app.
