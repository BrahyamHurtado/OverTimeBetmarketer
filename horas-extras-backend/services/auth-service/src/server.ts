import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

app.register(jwt, { secret: process.env.JWT_SECRET ?? 'cambia-esto-en-prod' });

const registroSchema = z.object({
  nombre: z.string().min(3),
  cedula: z.string().min(5),
  correo: z.string().email(),
  password: z.string().min(8),
  cargo: z.string().optional(),
  dependencia: z.string().optional(),
  supervisorId: z.string().uuid().optional(),
  rol: z.enum(['EMPLEADO', 'SUPERVISOR', 'CONTABILIDAD']).optional(),
});

// --- Registro ---
app.post('/auth/registro', async (req, reply) => {
  const data = registroSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 10);
  try {
    const u = await prisma.usuario.create({
      data: {
        nombre: data.nombre,
        cedula: data.cedula,
        correo: data.correo,
        passwordHash,
        cargo: data.cargo,
        dependencia: data.dependencia,
        supervisorId: data.supervisorId,
        rol: data.rol ?? 'EMPLEADO',
      },
    });
    return reply.code(201).send({ id: u.id, correo: u.correo, rol: u.rol });
  } catch (e: any) {
    if (e.code === 'P2002') return reply.code(409).send({ error: 'Cédula o correo ya registrados' });
    throw e;
  }
});

// --- Login ---
app.post('/auth/login', async (req, reply) => {
  const body = z
    .object({
      identificador: z.string().min(1).optional(),
      correo: z.string().min(1).optional(),
      password: z.string(),
    })
    .parse(req.body);

  const identificador = (body.identificador ?? body.correo ?? '').trim();
  if (!identificador) {
    return reply.code(400).send({ error: 'Ingresa correo o cédula' });
  }

  const esCorreo = identificador.includes('@');
  const u = esCorreo
    ? await prisma.usuario.findUnique({ where: { correo: identificador.toLowerCase() } })
    : await prisma.usuario.findUnique({ where: { cedula: identificador } });

  if (!u || !u.activo || !(await bcrypt.compare(body.password, u.passwordHash))) {
    return reply.code(401).send({ error: 'Credenciales inválidas' });
  }
  const token = app.jwt.sign(
    {
      sub: u.id,
      rol: u.rol,
      nombre: u.nombre,
      cedula: u.cedula,
      cargo: u.cargo ?? null,
      dependencia: u.dependencia ?? null,
      supervisorId: u.supervisorId ?? null,
    },
    { expiresIn: '8h' },
  );
  return { token, usuario: { id: u.id, nombre: u.nombre, rol: u.rol, correo: u.correo } };
});

app.get('/auth/perfil/:id', async (req: any, reply) => {
  const u = await prisma.usuario.findUnique({ where: { id: req.params.id } });
  if (!u) return reply.code(404).send({ error: 'No encontrado' });
  return {
    id: u.id,
    nombre: u.nombre,
    cedula: u.cedula,
    correo: u.correo,
    cargo: u.cargo,
    dependencia: u.dependencia,
    supervisorId: u.supervisorId,
    rol: u.rol,
  };
});

app.get('/auth/usuarios', async (req: any) => {
  await req.jwtVerify();
  const rol = typeof req.query?.rol === 'string' ? req.query.rol : undefined;
  const idsParam = typeof req.query?.ids === 'string' ? req.query.ids : undefined;
  const ids = idsParam ? idsParam.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined;
  const where: any = {};
  if (rol) where.rol = rol;
  if (ids && ids.length) where.id = { in: ids };
  const usuarios = await prisma.usuario.findMany({
    where,
    select: {
      id: true, nombre: true, cedula: true, correo: true, rol: true,
      cargo: true, dependencia: true, supervisorId: true,
    },
    orderBy: { nombre: 'asc' },
  });
  return usuarios;
});

app.patch('/auth/usuarios/:id', async (req: any, reply) => {
  await req.jwtVerify();
  const actor = req.user as { rol?: string };
  if (actor.rol !== 'SUPERVISOR' && actor.rol !== 'CONTABILIDAD') {
    return reply.code(403).send({ error: 'Solo supervisores o contabilidad' });
  }
  const body = z.object({
    supervisorId: z.string().uuid().nullable().optional(),
    rol: z.enum(['EMPLEADO', 'SUPERVISOR', 'CONTABILIDAD']).optional(),
  }).parse(req.body);
  const u = await prisma.usuario.update({
    where: { id: req.params.id },
    data: body,
    select: { id: true, nombre: true, rol: true, supervisorId: true },
  });
  return u;
});

app.get('/auth/verificar', async (req, reply) => {
  try {
    await req.jwtVerify();
    return req.user;
  } catch {
    return reply.code(401).send({ error: 'Token inválido' });
  }
});

const port = Number(process.env.PORT ?? 4001);
app.listen({ port, host: '0.0.0.0' }).then(() => app.log.info(`auth-service en :${port}`));
