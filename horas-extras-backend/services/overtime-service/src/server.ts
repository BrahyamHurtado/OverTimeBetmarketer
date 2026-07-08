import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { calcularDesglose, autodetectarTipoDia, sumarDesgloses } from '@he/shared';

const prisma = new PrismaClient();
const app = Fastify({ logger: true });
app.register(jwt, { secret: process.env.JWT_SECRET ?? 'cambia-esto-en-prod' });

app.addHook('preHandler', async (req, reply) => {
  if (req.url.startsWith('/health')) return;
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'No autorizado' });
  }
});

type Usuario = {
  sub: string;
  rol: 'EMPLEADO' | 'SUPERVISOR' | 'CONTABILIDAD';
  nombre?: string;
  cedula?: string;
  cargo?: string | null;
  dependencia?: string | null;
  supervisorId?: string | null;
};
const user = (req: any): Usuario => req.user;

const registroSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/),
  tipoDia: z.enum(['HABIL', 'NO_HABIL', 'DOMINICAL_FESTIVO']).optional(),
});

const planillaSchema = z.object({
  mes: z.number().int().min(1).max(12),
  anio: z.number().int().min(2020).max(2100),
  observaciones: z.string().optional(),
  registros: z.array(registroSchema),
});

function calcularRegistros(registros: z.infer<typeof registroSchema>[]) {
  return registros.map((r) => {
    const tipoDia = r.tipoDia ?? autodetectarTipoDia(r.fecha);
    const d = calcularDesglose(r.horaInicio, r.horaFin, tipoDia);
    return {
      fecha: new Date(`${r.fecha}T00:00:00Z`),
      horaInicio: r.horaInicio,
      horaFin: r.horaFin,
      tipoDia,
      extraDiurna: d.extraDiurna,
      extraNocturna: d.extraNocturna,
      domFestivaDiurna: d.domFestivaDiurna,
      domFestivaNocturna: d.domFestivaNocturna,
      totalHoras: d.totalHoras,
    };
  });
}

app.get('/health', async () => ({ ok: true }));

app.post('/planillas/calcular', async (req) => {
  const body = planillaSchema.parse(req.body);
  const registros = calcularRegistros(body.registros);
  const totales = sumarDesgloses(registros);
  return { registros, totales };
});

app.post('/planillas', async (req, reply) => {
  const u = user(req);
  const body = planillaSchema.parse(req.body);
  const registros = calcularRegistros(body.registros);

  const planilla = await prisma.$transaction(async (tx) => {
    const existente = await tx.planilla.findUnique({
      where: { empleadoId_mes_anio: { empleadoId: u.sub, mes: body.mes, anio: body.anio } },
    });
    if (existente && existente.estado === 'APROBADA') {
      throw Object.assign(new Error('La planilla ya fue aprobada y no puede editarse'), {
        statusCode: 409,
      });
    }
    const snapshot = {
      empleadoNombre: u.nombre ?? undefined,
      empleadoCedula: u.cedula ?? undefined,
      empleadoCargo: u.cargo ?? undefined,
      empleadoDependencia: u.dependencia ?? undefined,
    };
    const p = await tx.planilla.upsert({
      where: { empleadoId_mes_anio: { empleadoId: u.sub, mes: body.mes, anio: body.anio } },
      create: {
        empleadoId: u.sub,
        supervisorId: u.supervisorId ?? null,
        mes: body.mes,
        anio: body.anio,
        observaciones: body.observaciones,
        ...snapshot,
        registros: { create: registros },
      },
      update: {
        supervisorId: u.supervisorId ?? undefined,
        ...snapshot,
        observaciones: body.observaciones,
        estado: 'BORRADOR',
        version: { increment: 1 },
        registros: { deleteMany: {}, create: registros },
      },
      include: { registros: true },
    });
    await tx.eventoPlanilla.create({
      data: { planillaId: p.id, tipo: existente ? 'EDITADA' : 'CREADA', actorId: u.sub },
    });
    return p;
  });

  return reply.code(201).send(planilla);
});

app.post('/planillas/:id/enviar', async (req: any, reply) => {
  const u = user(req);
  const p = await prisma.planilla.findUnique({ where: { id: req.params.id } });
  if (!p || p.empleadoId !== u.sub) return reply.code(404).send({ error: 'No encontrada' });
  const actualizada = await prisma.planilla.update({
    where: { id: p.id },
    data: { estado: 'ENVIADA', enviadaAt: new Date() },
  });
  await prisma.eventoPlanilla.create({ data: { planillaId: p.id, tipo: 'ENVIADA', actorId: u.sub } });
  return actualizada;
});


app.get('/planillas/pendientes', async (req, reply) => {
  const u = user(req);
  if (u.rol !== 'SUPERVISOR') return reply.code(403).send({ error: 'Solo supervisores' });
  return prisma.planilla.findMany({
    where: { supervisorId: u.sub, estado: 'ENVIADA' },
    include: { registros: true },
    orderBy: { enviadaAt: 'asc' },
  });
});


app.post('/planillas/:id/revisar', async (req: any, reply) => {
  const u = user(req);
  if (u.rol !== 'SUPERVISOR') return reply.code(403).send({ error: 'Solo supervisores' });
  const { aprobar, motivoRechazo, firmaSupervisorUrl } = z
    .object({
      aprobar: z.boolean(),
      motivoRechazo: z.string().optional(),
      firmaSupervisorUrl: z.string().optional(),
    })
    .parse(req.body);

  const p = await prisma.planilla.update({
    where: { id: req.params.id },
    data: {
      estado: aprobar ? 'APROBADA' : 'RECHAZADA',
      revisadaAt: new Date(),
      revisadaPor: u.sub,
      supervisorNombre: u.nombre ?? undefined,
      motivoRechazo: aprobar ? null : motivoRechazo,
      firmaSupervisorUrl,
    },
  });
  await prisma.eventoPlanilla.create({
    data: {
      planillaId: p.id,
      tipo: aprobar ? 'APROBADA' : 'RECHAZADA',
      actorId: u.sub,
      detalle: motivoRechazo,
    },
  });
  return p;
});

app.post('/planillas/revisar-lote', async (req: any, reply) => {
  const u = user(req);
  if (u.rol !== 'SUPERVISOR') return reply.code(403).send({ error: 'Solo supervisores' });
  const { ids, aprobar, motivoRechazo, firmaSupervisorUrl } = z
    .object({
      ids: z.array(z.string().uuid()).min(1),
      aprobar: z.boolean(),
      motivoRechazo: z.string().optional(),
      firmaSupervisorUrl: z.string().optional(),
    })
    .parse(req.body);

  const planillas = await prisma.planilla.findMany({
    where: { id: { in: ids }, supervisorId: u.sub, estado: 'ENVIADA' },
    select: { id: true },
  });
  const idsPermitidos = planillas.map((p) => p.id);

  if (idsPermitidos.length === 0) {
    return reply.code(400).send({ error: 'No hay planillas válidas para revisar' });
  }

  const ahora = new Date();
  await prisma.planilla.updateMany({
    where: { id: { in: idsPermitidos } },
    data: {
      estado: aprobar ? 'APROBADA' : 'RECHAZADA',
      revisadaAt: ahora,
      revisadaPor: u.sub,
      supervisorNombre: u.nombre ?? undefined,
      motivoRechazo: aprobar ? null : motivoRechazo,
      firmaSupervisorUrl,
    },
  });
  await prisma.eventoPlanilla.createMany({
    data: idsPermitidos.map((id) => ({
      planillaId: id,
      tipo: aprobar ? 'APROBADA' : 'RECHAZADA',
      actorId: u.sub,
      detalle: motivoRechazo ?? null,
    })),
  });

  return {
    procesadas: idsPermitidos.length,
    omitidas: ids.length - idsPermitidos.length,
    ids: idsPermitidos,
  };
});

app.get('/planillas/:id', async (req: any, reply) => {
  const u = user(req);
  const p = await prisma.planilla.findUnique({
    where: { id: req.params.id },
    include: { registros: { orderBy: { fecha: 'asc' } }, eventos: true },
  });
  if (!p) return reply.code(404).send({ error: 'No encontrada' });
  const permitido =
    u.rol === 'CONTABILIDAD' || p.empleadoId === u.sub || p.supervisorId === u.sub;
  if (!permitido) return reply.code(403).send({ error: 'Sin permiso' });
  return p;
});

app.get('/planillas', async (req, reply) => {
  const u = user(req);
  return prisma.planilla.findMany({
    where: { empleadoId: u.sub },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
  });
});

const port = Number(process.env.PORT ?? 4002);
app.listen({ port, host: '0.0.0.0' }).then(() => app.log.info(`overtime-service en :${port}`));
