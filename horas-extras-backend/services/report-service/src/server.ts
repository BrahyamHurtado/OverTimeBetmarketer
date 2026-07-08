import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = Fastify({ logger: true });
app.register(jwt, { secret: process.env.JWT_SECRET ?? 'cambia-esto-en-prod' });


app.addHook('preHandler', async (req, reply) => {
  if (req.url.startsWith('/health')) return;
  try {
    await req.jwtVerify();
    if ((req.user as any).rol !== 'CONTABILIDAD') {
      return reply.code(403).send({ error: 'Solo contabilidad' });
    }
  } catch {
    return reply.code(401).send({ error: 'No autorizado' });
  }
});

app.get('/health', async () => ({ ok: true }));

app.get('/reportes/general', async (req: any) => {
  const { mes, anio } = z
    .object({ mes: z.coerce.number().optional(), anio: z.coerce.number() })
    .parse(req.query);

  const planillas = await prisma.planilla.findMany({
    where: { anio, ...(mes ? { mes } : {}), estado: { in: ['APROBADA', 'PROCESADA'] } },
    include: { registros: true },
  });

  const porEmpleado = planillas.map((p) => ({
    planillaId: p.id,
    empleadoId: p.empleadoId,
    empleadoNombre: p.empleadoNombre,
    empleadoCedula: p.empleadoCedula,
    empleadoCargo: p.empleadoCargo,
    empleadoDependencia: p.empleadoDependencia,
    supervisorId: p.supervisorId,
    supervisorNombre: p.supervisorNombre,
    firmaSupervisorUrl: p.firmaSupervisorUrl,
    estado: p.estado,
    revisadaAt: p.revisadaAt,
    mes: p.mes,
    anio: p.anio,
    totalExtraDiurna: p.registros.reduce((s, r) => s + r.extraDiurna, 0),
    totalExtraNocturna: p.registros.reduce((s, r) => s + r.extraNocturna, 0),
    totalDomDiurna: p.registros.reduce((s, r) => s + r.domFestivaDiurna, 0),
    totalDomNocturna: p.registros.reduce((s, r) => s + r.domFestivaNocturna, 0),
    totalHoras: p.registros.reduce((s, r) => s + r.totalHoras, 0),
    registros: p.registros
      .slice()
      .sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha))
      .map((r) => ({
        id: r.id,
        fecha: r.fecha,
        tipoDia: r.tipoDia,
        horaInicio: r.horaInicio,
        horaFin: r.horaFin,
        extraDiurna: r.extraDiurna,
        extraNocturna: r.extraNocturna,
        domFestivaDiurna: r.domFestivaDiurna,
        domFestivaNocturna: r.domFestivaNocturna,
        totalHoras: r.totalHoras,
      })),
  }));

  return { periodo: { mes, anio }, totalPlanillas: planillas.length, porEmpleado };
});

app.get('/reportes/empleado/:empleadoId', async (req: any) => {
  const planillas = await prisma.planilla.findMany({
    where: { empleadoId: req.params.empleadoId },
    include: { registros: { orderBy: { fecha: 'asc' } } },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
  });
  return { empleadoId: req.params.empleadoId, planillas };
});

app.get('/reportes/trazabilidad/:planillaId', async (req: any) => {
  return prisma.eventoPlanilla.findMany({
    where: { planillaId: req.params.planillaId },
    orderBy: { createdAt: 'asc' },
  });
});

app.post('/reportes/procesar', async (req: any) => {
  const { ids } = z.object({ ids: z.array(z.string().uuid()) }).parse(req.body);
  await prisma.planilla.updateMany({
    where: { id: { in: ids }, estado: 'APROBADA' },
    data: { estado: 'PROCESADA' },
  });
  return { procesadas: ids.length };
});

app.post('/reportes/rechazar', async (req: any, reply) => {
  const { ids, motivoRechazo } = z
    .object({
      ids: z.array(z.string().uuid()).min(1),
      motivoRechazo: z.string().min(3),
    })
    .parse(req.body);

  const actor = req.user.sub as string;

  const candidatas = await prisma.planilla.findMany({
    where: { id: { in: ids }, estado: 'APROBADA' },
    select: { id: true },
  });
  const idsPermitidos = candidatas.map((p) => p.id);

  if (idsPermitidos.length === 0) {
    return reply.code(400).send({ error: 'Solo se pueden rechazar planillas APROBADAS' });
  }

  await prisma.planilla.updateMany({
    where: { id: { in: idsPermitidos } },
    data: {
      estado: 'RECHAZADA',
      motivoRechazo,
      firmaSupervisorUrl: null,
      revisadaAt: new Date(),
      revisadaPor: actor,
    },
  });
  await prisma.eventoPlanilla.createMany({
    data: idsPermitidos.map((id) => ({
      planillaId: id,
      tipo: 'RECHAZADA',
      actorId: actor,
      detalle: `Rechazo contabilidad: ${motivoRechazo}`,
    })),
  });

  return {
    rechazadas: idsPermitidos.length,
    omitidas: ids.length - idsPermitidos.length,
    ids: idsPermitidos,
  };
});

const port = Number(process.env.PORT ?? 4003);
app.listen({ port, host: '0.0.0.0' }).then(() => app.log.info(`report-service en :${port}`));
