# Horas Extras · Guía de despliegue y operación

Documentación del despliegue en producción en DigitalOcean, cómo acceder, cómo hacer cambios futuros y cómo administrar la base de datos.

**Última actualización:** 2026-09-25

---

## Índice

1. [Arquitectura y servicios](#1-arquitectura-y-servicios)
2. [Infraestructura desplegada](#2-infraestructura-desplegada)
3. [Cómo acceden los usuarios](#3-cómo-acceden-los-usuarios)
4. [Acceso administrativo (SSH)](#4-acceso-administrativo-ssh)
5. [Acceso a la base de datos](#5-acceso-a-la-base-de-datos)
6. [Cambiar contraseñas de usuarios](#6-cambiar-contraseñas-de-usuarios)
7. [Workflow de cambios de código](#7-workflow-de-cambios-de-código)
8. [Cambios de esquema de BD (Prisma)](#8-cambios-de-esquema-de-bd-prisma)
9. [Backups](#9-backups)
10. [Troubleshooting común](#10-troubleshooting-común)
11. [Costos](#11-costos)

---

## 1. Arquitectura y servicios

Monorepo con backend de microservicios (TypeScript + Fastify + Prisma) y frontend SPA (Modern.js + React 18).

### Servicios (dentro de Docker)

| Servicio | Puerto interno | Descripción |
|---|---|---|
| `db-auth` | 5432 | PostgreSQL 18 · BD `auth` (usuarios, roles, sesiones) |
| `db-overtime` | 5432 | PostgreSQL 18 · BD `overtime` (planillas, registros, eventos) |
| `redis` | 6379 | Cache de festivos, rate limiting distribuido |
| `rabbitmq` | 5672 | Cola para generación async de PDF y notificaciones |
| `auth-service` | 4001 | Registro, login (JWT), perfiles, roles |
| `overtime-service` | 4002 | Planillas, cálculo de horas, workflow de aprobación |
| `report-service` | 4003 | Informes, trazabilidad, cierre de periodos |
| `gateway` | 4000 | API Gateway (CORS, rate-limit, ruteo `/api/*`) |
| `caddy` | 80, 443 | Web server: HTTPS auto (Let's Encrypt) + frontend estático + proxy a gateway |

### Bases de datos (database-per-service)

- **`auth`**: tabla `Usuario` (id, nombre, cédula, correo, `passwordHash`, cargo, dependencia, rol, supervisorId, activo).
- **`overtime`**: tablas `Planilla`, `RegistroHoras`, `EventoPlanilla`.

---

## 2. Infraestructura desplegada

### Provider: DigitalOcean

- **Droplet:** `marketplace-s-2vcpu-2gb-nyc1`
- **Región:** NYC1
- **Imagen:** Docker on Ubuntu 22.04 (marketplace)
- **Specs:** 2 vCPU, 2 GB RAM, 60 GB SSD
- **IPv4 pública:** `142.93.196.92`

### DNS

- **Dominio público:** `horasextrasbet.duckdns.org`
- **Provider DNS:** DuckDNS (gratis, cuenta ligada al GitHub `BrahyamHurtado`)
- Apunta a `142.93.196.92`. Si cambia el IP del droplet, actualizar en `https://www.duckdns.org/domains`.

### HTTPS

- Certificado emitido por Let's Encrypt automáticamente por Caddy.
- Se renueva solo cada 60 días. Cero mantenimiento.

### Firewall (UFW)

Puertos abiertos:
- `22/tcp` (SSH, con rate-limit `LIMIT`)
- `80/tcp` (HTTP, necesario para Let's Encrypt)
- `443/tcp` (HTTPS)

Los puertos de Postgres/Redis/RabbitMQ **NO** están expuestos al internet. Solo accesibles desde dentro del droplet o vía SSH tunnel.

---

## 3. Cómo acceden los usuarios

Los 15 usuarios entran a: **https://horasextrasbet.duckdns.org**

Login con correo y contraseña. Después del login, la app redirige según el rol:

| Rol | Ruta |
|---|---|
| `EMPLEADO` | `/empleado` (mis planillas) |
| `SUPERVISOR` | `/supervisor` (bandeja de aprobación) |
| `CONTABILIDAD` | `/contabilidad` (informes y cierre) |

Las cuentas + planillas existentes fueron restauradas del backup TablePlus del servidor anterior. **La primera vez** que un usuario ingresa después de la migración tiene que loguearse de nuevo — sus sesiones viejas quedaron invalidadas al cambiar el `JWT_SECRET` (esto es esperado y correcto; las contraseñas siguen funcionando porque están hasheadas en la BD).

---

## 4. Acceso administrativo (SSH)

### Conectarse al droplet

Desde tu PC:

```powershell
ssh root@142.93.196.92
```

Requiere que tu llave privada esté en `~/.ssh/id_ed25519` (registrada en DigitalOcean → Settings → Security → SSH Keys).

### Ubicación del proyecto

```
/opt/he/OverTimeBetmarketer/
├── horas-extras-backend/       ← docker-compose vive aquí
│   ├── docker-compose.yml
│   ├── Caddyfile
│   ├── .env                    ← JWT_SECRET, FRONT_ORIGIN, URLs de BD
│   ├── frontend-dist/          ← build del frontend (servido por Caddy)
│   └── services/               ← código de los 4 microservicios
└── horas-extras-frontend/       ← fuente del frontend (no se usa en el droplet)
```

### Comandos útiles

```bash
cd /opt/he/OverTimeBetmarketer/horas-extras-backend

# Estado de contenedores
docker compose ps

# Logs de un servicio
docker compose logs gateway --tail=50
docker compose logs overtime-service -f       # sigue en vivo (Ctrl+C para salir)

# Reiniciar un servicio
docker compose restart overtime-service

# Reiniciar todo
docker compose restart

# Bajar y volver a subir todo (mantiene datos)
docker compose down
docker compose up -d
```

⚠️ **NUNCA correr `docker compose down -v`** — el `-v` borra los volúmenes de las BDs → **pierdes todos los datos**.

---

## 5. Acceso a la base de datos

Los puertos 5433 (auth) y 5434 (overtime) están bindeados solo a `127.0.0.1` del droplet — no accesibles desde internet. Para conectarse desde TablePlus/otros clientes hay que usar un túnel SSH.

### Opción A · TablePlus con SSH tunnel (recomendado)

1. Nueva conexión → **PostgreSQL**.
2. Pestaña **Server**:
   - Host: `127.0.0.1`
   - Port: `5433` (para `auth`) o `5434` (para `overtime`)
   - User: `he`
   - Password: `he`
   - Database: `auth` o `overtime`
3. Pestaña **Over SSH** → activar:
   - Server: `142.93.196.92`
   - Port: `22`
   - User: `root`
   - Use key file → seleccionar `C:\Users\brahy\.ssh\id_ed25519`

Guarda y prueba. Conecta a la BD como si fuera local.

### Opción B · psql directo desde el droplet (rápido, sin instalar nada)

```bash
# BD auth
docker exec -it horas-extras-backend-db-auth-1 psql -U he -d auth

# BD overtime
docker exec -it horas-extras-backend-db-overtime-1 psql -U he -d overtime
```

Comandos útiles dentro de psql:
- `\dt` — listar tablas
- `\d "Usuario"` — describir tabla
- `\q` — salir
- `SELECT ...;` — queries normales

---

## 6. Cambiar contraseñas de usuarios

### Importante · bcrypt es unidireccional

Las contraseñas se guardan como **hash bcrypt** (`bcryptjs`, cost factor 10) en la columna `Usuario.passwordHash`. Un hash bcrypt se ve así:

```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

**No se pueden "descifrar" ni recuperar la contraseña original.** Esto es a propósito: si un atacante roba la BD, no puede leer contraseñas. Cuando un usuario olvida su clave la única opción es **generar un hash nuevo y reemplazarlo**.

### Cómo resetear la contraseña de un usuario

**Paso 1** — Generar el hash de la contraseña nueva (en el droplet):

```bash
docker exec horas-extras-backend-auth-service-1 \
  node -e "console.log(require('bcryptjs').hashSync('NuevaContraseña123', 10))"
```

Salida ejemplo:
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

Copia ese hash.

**Paso 2** — Actualizarlo en la BD (todavía en el droplet):

```bash
docker exec -it horas-extras-backend-db-auth-1 psql -U he -d auth
```

Dentro de psql:

```sql
UPDATE "Usuario"
SET "passwordHash" = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE correo = 'usuario@ejemplo.com';
```

Verifica que dice `UPDATE 1` (una fila afectada).

**Paso 3** — Avisar al usuario: "tu nueva contraseña es `NuevaContraseña123`, cámbiala apenas entres".

### Alternativa: hacer el hash desde TablePlus (sin SSH al droplet)

En TablePlus (conectado a `auth`) puedes correr:

```sql
SELECT id, nombre, correo, activo FROM "Usuario" WHERE correo = 'usuario@ejemplo.com';
```

Pero para el hash sí necesitas generar el bcrypt en algún lado. Alternativas:
- Herramienta web: `https://bcrypt-generator.com` (poner cost = 10). ⚠️ Solo úsalo para contraseñas temporales que el usuario cambiará al entrar — nunca metas contraseñas sensibles reales en un sitio online.
- Desde tu PC con Node instalado: `node -e "console.log(require('bcryptjs').hashSync('temp123', 10))"` (previo `npm i -g bcryptjs`).

### Cambiar rol o activar/desactivar usuario

```sql
-- Desactivar (bloquea login sin borrar)
UPDATE "Usuario" SET activo = false WHERE correo = 'usuario@ejemplo.com';

-- Cambiar rol
UPDATE "Usuario" SET rol = 'SUPERVISOR' WHERE correo = 'usuario@ejemplo.com';

-- Roles válidos: 'EMPLEADO', 'SUPERVISOR', 'CONTABILIDAD'
```

---

## 7. Workflow de cambios de código

### Ciclo normal

1. **En tu PC local:** editas → pruebas local → `git commit` → `git push` a GitHub.
2. **En el droplet:**

   ```bash
   ssh root@142.93.196.92
   cd /opt/he/OverTimeBetmarketer
   git pull

   cd horas-extras-backend
   # Solo rebuildear el servicio que cambió (más rápido)
   docker compose build overtime-service
   docker compose up -d overtime-service
   docker compose logs -f overtime-service       # verifica que arrancó bien
   ```

### Si cambiaste varios servicios

```bash
docker compose up -d --build
```

### Cambios en el frontend

El frontend se **buildea en tu PC** (no en el droplet) y se sube el `dist/` con `scp`.

```powershell
# PC local
cd C:\Users\brahy\Documents\Atomo\extraHoursBetMarketer\horas-extras-frontend
pnpm build

scp -r C:\Users\brahy\Documents\Atomo\extraHoursBetMarketer\horas-extras-frontend\dist\* root@142.93.196.92:/opt/he/OverTimeBetmarketer/horas-extras-backend/frontend-dist/
```

Caddy sirve el `dist/` como volumen montado → los cambios se ven **al instante**, no hace falta reiniciar nada.

⚠️ El archivo `.env.production` del frontend tiene `API_URL=https://horasextrasbet.duckdns.org`. **No lo cambies** al desarrollar localmente — usa el `.env` (que tiene `API_URL=http://localhost:4000`) para dev y `.env.production` para el build de producción. Modern.js elige automáticamente según el modo.

### Rollback rápido

Si un cambio rompió algo:

```bash
cd /opt/he/OverTimeBetmarketer
git log --oneline -10                     # busca el hash del commit anterior bueno
git checkout <hash-anterior>
cd horas-extras-backend
docker compose up -d --build
```

Para volver a la última versión: `git checkout main` (o el branch principal).

---

## 8. Cambios de esquema de BD (Prisma)

Cada microservicio tiene su propio `schema.prisma`:
- `services/auth-service/prisma/schema.prisma`
- `services/overtime-service/prisma/schema.prisma`

### Flujo de una migración

**En tu PC local** (con `docker compose up -d db-auth db-overtime` corriendo):

```bash
cd services/auth-service
pnpm prisma migrate dev --name descripcion_del_cambio
```

Esto:
- Crea el SQL de migración en `prisma/migrations/`.
- Lo aplica a tu BD local.
- Regenera el Prisma Client.

Hazle **commit** al SQL generado (`prisma/migrations/YYYYMMDDHHMMSS_descripcion/migration.sql`).

**En el droplet:**

```bash
cd /opt/he/OverTimeBetmarketer
git pull
cd horas-extras-backend
docker compose build auth-service
docker compose up -d auth-service

# Aplicar la migración a la BD de producción
docker compose exec auth-service pnpm prisma migrate deploy
```

`migrate deploy` (a diferencia de `migrate dev`) **no borra datos** — solo aplica migraciones pendientes. Es el comando correcto para producción.

⚠️ **Antes de una migración destructiva** (drop column, rename, etc.), haz backup manual (ver sección 9).

---

## 9. Backups

### Backup automático (ya configurado)

Backups activados en el droplet mediante DigitalOcean:
- Semanales, +$3.60/mes.
- Recuperables desde DO Console → Droplet → Backups.

### Backup manual de la BD (recomendado antes de cambios grandes)

```bash
ssh root@142.93.196.92
mkdir -p /root/backups

docker exec horas-extras-backend-db-auth-1 pg_dump -U he -Fc auth > /root/backups/auth-$(date +%F-%H%M).dump
docker exec horas-extras-backend-db-overtime-1 pg_dump -U he -Fc overtime > /root/backups/overtime-$(date +%F-%H%M).dump

ls -lh /root/backups/
```

### Bajar backups a tu PC

Desde tu PC:

```powershell
scp root@142.93.196.92:/root/backups/*.dump C:\Users\brahy\Documents\backup-BD-overtime\
```

### Configurar backup nocturno automático (opcional)

Ejecutar UNA vez en el droplet:

```bash
crontab -e
```

Agregar al final:

```
0 3 * * * mkdir -p /root/backups && docker exec horas-extras-backend-db-auth-1 pg_dump -U he -Fc auth > /root/backups/auth-$(date +\%F).dump && docker exec horas-extras-backend-db-overtime-1 pg_dump -U he -Fc overtime > /root/backups/overtime-$(date +\%F).dump && find /root/backups -mtime +14 -delete
```

Esto corre cada día a las 3 AM y borra backups mayores a 14 días.

### Restaurar un backup

```bash
# Copiar el dump al contenedor
docker cp /root/backups/auth-2026-09-25.dump horas-extras-backend-db-auth-1:/tmp/restore.dump

# Restaurar (--clean borra tablas existentes primero)
docker exec horas-extras-backend-db-auth-1 pg_restore -U he -d auth --clean --if-exists /tmp/restore.dump
```

Idem para `overtime`.

---

## 10. Troubleshooting común

### La app no carga / HTTPS falla

```bash
docker compose ps                                # ¿todos los servicios "Up"?
docker compose logs caddy --tail=30              # ¿Caddy tiene cert?
```

Si Caddy no puede emitir cert: verificar que DuckDNS apunta a la IP correcta (`nslookup horasextrasbet.duckdns.org`).

### Login devuelve error 500

```bash
docker compose logs gateway --tail=30
docker compose logs auth-service --tail=30
```

Causas comunes:
- `db-auth` caído o no healthy → `docker compose ps` y verificar.
- Contraseña inválida (401), no 500.
- `JWT_SECRET` cambió y el frontend tiene un token viejo cacheado — pide al usuario limpiar cookies/localStorage.

### El frontend muestra "Failed to construct 'URL'"

Significa que el bundle se buildeó con un `API_URL` inválido. Ver sección 7 (frontend) — `.env.production` debe tener `API_URL=https://horasextrasbet.duckdns.org` (URL absoluta, no path relativo).

### Un servicio queda en loop de restart

```bash
docker compose logs <servicio> --tail=60
```

Los errores más frecuentes:
- `Can't reach database server` → BD aún no healthy. Espera 30s o reinicia el servicio.
- `PrismaClientInitializationError` → schema.prisma cambió sin correr `migrate deploy`.
- OOM (out of memory) → el droplet de 2GB puede quedar corto. Ver `docker stats` para ver consumo. Si es persistente, subir a droplet de 4GB.

### Escalar (más usuarios)

- Vertical (más fácil): subir el droplet en DO → Resize → 4 GB / 2 vCPU ($24/mo).
- Horizontal: aumentar `deploy.replicas` de `overtime-service` en `docker-compose.yml`. El gateway ya balancea internamente vía DNS de Docker.

---

## 11. Costos

### Actual (crédito DigitalOcean cubre 2 meses)

| Ítem | Coste |
|---|---|
| Droplet 2 vCPU / 2 GB / 60 GB SSD | $18/mo |
| Backups semanales | $3.60/mo |
| Dominio DuckDNS | Gratis |
| **Total mensual desde el mes 3** | **~$22/mo** (≈ $95.000 COP) |

### Si escalan a más usuarios

- Droplet 4 GB / 2 vCPU: $24/mo (+ $4.80 backups) = ~$29/mo.

### Alternativa más barata a largo plazo

Hetzner CX22 (Alemania) — 2 vCPU / 4 GB / 40 GB SSD por **€4.51/mo (~$5)**. Migración: snapshot en DO → restore en Hetzner. Una tarde de trabajo.

---

## Referencias rápidas

| Recurso | Link / Comando |
|---|---|
| URL pública | https://horasextrasbet.duckdns.org |
| IP del droplet | 142.93.196.92 |
| SSH | `ssh root@142.93.196.92` |
| Panel DigitalOcean | https://cloud.digitalocean.com/droplets |
| Panel DuckDNS | https://www.duckdns.org/domains |
| GitHub repo | https://github.com/BrahyamHurtado/OverTimeBetmarketer |
| Ruta en droplet | `/opt/he/OverTimeBetmarketer/horas-extras-backend/` |
| Credenciales BD | user: `he` · pass: `he` · dbs: `auth`, `overtime` |
