# Plan General — App de Horas Extras (reemplazo del formato físico)

Sistema web que reemplaza la *Planilla de Horas Extras Diurnas, Nocturnas, Dominicales y Festivos*. Tres actores (empleado, supervisor, contabilidad), cálculo automático de horas, workflow de aprobación, trazabilidad, informes e impresión.

---

## 1. Análisis campo por campo del formato físico

| Campo del formato | Quién lo llena hoy | En la app | Origen |
|---|---|---|---|
| Nombre del servidor | Empleado (manual) | **Autorrelleno** | Perfil del usuario |
| Cédula | Empleado (manual) | **Autorrelleno** | Perfil del usuario |
| Cargo | Empleado (manual) | **Autorrelleno** | Perfil del usuario |
| Correo electrónico | Empleado (manual) | **Autorrelleno** | Perfil del usuario |
| Dependencia | Empleado (manual) | **Autorrelleno** | Perfil del usuario |
| Directivo / jefe inmediato | Empleado (manual) | **Autorrelleno** | `supervisorId` del perfil |
| Mes / Año | Empleado (manual) | **Auto-default** (mes actual, editable) | Sistema |
| Fecha (por fila) | Empleado | Input (date picker) | Empleado |
| Hábil / No hábil / Dom-Fest | Empleado (marca X) | **Autodetectado** por calendario de festivos Colombia (editable) | Motor + Ley Emiliani |
| Hora inicio labores | Empleado | Input (time, 24h) | Empleado |
| Hora finaliza labores | Empleado | Input (time, 24h) | Empleado |
| Total horas extras diurnas | Empleado (cálculo manual) | **Calculado** | Motor |
| Total horas extras nocturnas | Empleado (cálculo manual) | **Calculado** | Motor |
| Total dominicales/festivas diurnas | Talento Humano | **Calculado** | Motor |
| Total dominicales/festivas nocturnas | Talento Humano | **Calculado** | Motor |
| Subtotales / Total | Manual | **Calculado** (suma) | Motor |
| Firma de quien recibió el servicio | Firma física | **Firma digital** (aprobación + timestamp) | Supervisor |
| Firma del jefe inmediato | Firma física | **Firma digital** (aprobación + timestamp) | Supervisor |
| Observaciones | Manual | Textarea | Empleado / Supervisor |

**Reglas legales codificadas** (en `packages/shared`):
- Hora extra **diurna**: 06:00–19:00.
- Hora extra **nocturna**: 19:00–06:00 (soporta turnos que cruzan medianoche).
- Si el día es dominical/festivo, las mismas horas se enrutan a los buckets dominicales.
- Horas en formato 24h (militar), tal como exige la nota del formato.

**Conclusión del análisis:** de ~18 campos, el empleado solo escribe **3 por fila** (fecha, hora inicio, hora fin). Todo lo demás se autorrellena, autodetecta o calcula. Eso es lo que vuelve la app intuitiva y minimalista.

---

## 2. Actores y permisos

| Actor | Puede |
|---|---|
| **Empleado** | Registrarse, iniciar sesión, crear/editar su planilla, calcular en vivo, **guardar en BD**, enviar a revisión, imprimir su planilla |
| **Supervisor** | Iniciar sesión, ver bandeja de pendientes de su equipo, aprobar/rechazar (firma digital) con observaciones |
| **Contabilidad** | Iniciar sesión, informe general por periodo, informe por empleado, trazabilidad, marcar como procesadas, exportar/imprimir |

---

## 3. Workflow (máquina de estados de la planilla)

```
BORRADOR → (empleado envía) → ENVIADA → (supervisor) → APROBADA → (contabilidad) → PROCESADA
                                  ↓
                              RECHAZADA → (empleado corrige) → BORRADOR
```

- Una planilla = un empleado + un mes + un año (constraint único).
- Tras `APROBADA` la planilla se bloquea para edición del empleado.
- Cada transición genera un `EventoPlanilla` inmutable → **trazabilidad** completa.

---

## 4. Arquitectura de microservicios

```
                    ┌─────────────┐
   React SPA  ──────▶   Gateway   │  (CORS, rate-limit, ruteo, JWT)
                    └──────┬──────┘
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌───────────┐  ┌─────────────┐  ┌──────────────┐
     │   auth    │  │  overtime   │  │   report     │
     │  service  │  │   service   │  │   service    │
     └─────┬─────┘  └──────┬──────┘  └──────┬───────┘
        db-auth        db-overtime  ───────┘ (lectura)
                          │
                   Redis (cache)  +  RabbitMQ (PDF/correo async)
```

- **auth-service** (`:4001`): registro, login, JWT, perfiles, roles.
- **overtime-service** (`:4002`): núcleo — planillas, registros, motor de cálculo, workflow. Réplicas horizontales (stateless).
- **report-service** (`:4003`): solo contabilidad — informes, trazabilidad, cierre.
- **gateway** (`:4000`): entrada única para el front.
- **shared** (paquete): tipos + motor de cálculo + festivos. Una sola fuente de verdad para la lógica de negocio.

---

## 5. Endpoints (los que consume el front)

**Auth** (`/api/auth`)
- `POST /registro` — alta de cuenta
- `POST /login` — devuelve `{ token, usuario }`
- `GET /perfil/:id` — datos para autorrellenar la planilla

**Horas** (`/api/horas`)
- `POST /planillas/calcular` — preview en vivo (no guarda)
- `POST /planillas` — crear/actualizar (upsert por mes/año)
- `POST /planillas/:id/enviar` — pasar a ENVIADA
- `GET /planillas` — mis planillas (empleado)
- `GET /planillas/:id` — detalle
- `GET /planillas/pendientes` — bandeja del supervisor
- `POST /planillas/:id/revisar` — aprobar/rechazar (supervisor)

**Reportes** (`/api/reportes`)
- `GET /general?mes&anio` — informe agregado
- `GET /empleado/:empleadoId` — informe individual
- `GET /trazabilidad/:planillaId` — log de auditoría
- `POST /procesar` — cierre contable

---

## 6. Eficiencia y usuarios simultáneos

- **Servicios sin estado** detrás del gateway → escalan horizontalmente (réplicas en compose/k8s).
- **Preview de cálculo en cliente + endpoint**: el cálculo es puro; el front puede calcular localmente con `@he/shared` y solo persistir al guardar (menos carga).
- **Bloqueo optimista** (`version`) en la planilla para edición concurrente sin corromper datos.
- **Pool de conexiones** a Postgres (PgBouncer recomendado en prod).
- **Redis** para cachear festivos y rate-limit distribuido.
- **Índices** en estado, supervisor y empleado para bandejas e informes rápidos.
- **RabbitMQ** para descargar tareas pesadas (PDF oficial, correos) fuera del request.

---

## 7. Impresión

- **Rápida (cliente):** vista imprimible en React con CSS `@media print` que replica el layout del formato oficial → `window.print()`.
- **Oficial (servidor):** worker que consume la cola y genera PDF archivable con las firmas digitales y el log de trazabilidad.

---

## 8. Cómo levantar el backend (lo que ya está hecho)

```bash
cp .env.example .env          # define JWT_SECRET
docker compose up -d          # postgres, redis, rabbitmq, servicios
# en cada servicio: pnpm install && pnpm prisma:migrate && pnpm dev
pnpm --filter @he/shared test # corre los tests del motor
```

---

## 9. Roadmap de sprints

1. **Sprint 1 — Base:** auth (registro/login/roles), perfiles, motor de cálculo + tests. ✅ (incluido)
2. **Sprint 2 — Planilla:** CRUD + preview en vivo + autodetección de tipo de día + autorrelleno en el front.
3. **Sprint 3 — Workflow:** envío, bandeja del supervisor, aprobar/rechazar, firma digital, notificaciones.
4. **Sprint 4 — Contabilidad:** informes general/individual, trazabilidad, cierre, exportación.
5. **Sprint 5 — Impresión/PDF:** vista print + worker PDF oficial.
6. **Sprint 6 — Hardening:** rate-limit afinado, PgBouncer, observabilidad, despliegue k8s.
