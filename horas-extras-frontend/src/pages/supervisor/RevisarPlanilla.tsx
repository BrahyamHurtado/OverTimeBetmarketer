import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '@modern-js/runtime/router';
import { usePlanilla } from '@/__generated__/planilla.hooks';
import { useRevisarPlanilla } from '@/__generated__/supervisor.hooks';
import { usePerfil } from '@/__generated__/auth.hooks';
import { useToast } from '@/lib/toast';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { FirmaCanvas } from '@/components/FirmaCanvas';
import { PlanillaTable } from '@/pages/planilla/PlanillaTable';
import { printInforme, type InformePrintItem } from '@/shared/informePrint';
import { autodetectarTipoDia } from '@/shared/festivos';
import {
  COLOR_ESTADO,
  LABEL_ESTADO,
  nombreMes,
  formatFecha,
} from '@/shared/format';
import type { PerfilUsuario, Planilla, RegistroInput } from '@/shared/types';

type Decision = 'aprobar' | 'rechazar';

export default function RevisarPlanilla() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: planilla, isLoading } = usePlanilla(id);
  const perfilQuery = usePerfil(planilla?.empleadoId);
  const revisar = useRevisarPlanilla();

  const [decision, setDecision] = useState<Decision | null>(null);
  const [motivo, setMotivo] = useState('');
  const [firma, setFirma] = useState<string | null>(null);

  const registros = useMemo<RegistroInput[]>(
    () =>
      (planilla?.registros ?? []).map((r) => ({
        fecha: r.fecha.slice(0, 10),
        horaInicio: r.horaInicio,
        horaFin: r.horaFin,
        tipoDia: r.tipoDia,
      })),
    [planilla],
  );

  const onImprimir = () => {
    if (!planilla || !perfilQuery.data) return;
    printInforme({
      items: [construirItemImpresion(planilla, perfilQuery.data)],
      titulo: `Planilla · ${perfilQuery.data.nombre}`,
      subtitulo: `${nombreMes(planilla.mes)} ${planilla.anio}`,
    });
  };

  const onConfirm = () => {
    if (!planilla || !decision) return;
    if (decision === 'rechazar' && !motivo.trim()) {
      toast.error('Indica el motivo del rechazo');
      return;
    }
    revisar.mutate(
      {
        id: planilla.id,
        payload: {
          aprobar: decision === 'aprobar',
          motivoRechazo: decision === 'rechazar' ? motivo : undefined,
          firmaSupervisorUrl: firma ?? undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(decision === 'aprobar' ? 'Planilla aprobada' : 'Planilla rechazada');
          navigate('/supervisor', { replace: true });
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  if (isLoading) return <SkeletonRows rows={5} />;
  if (!planilla) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-slate-600">Planilla no encontrada.</p>
        <Link to="/supervisor" className="btn-primary mt-4 inline-block">
          Volver a la bandeja
        </Link>
      </div>
    );
  }

  const yaRevisada = planilla.estado === 'APROBADA' || planilla.estado === 'RECHAZADA' || planilla.estado === 'PROCESADA';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${nombreMes(planilla.mes)} ${planilla.anio}`}
        description={`Empleado ${planilla.empleadoId} · Enviada ${formatFecha(planilla.enviadaAt)}`}
        actions={
          <>
            <Badge className={COLOR_ESTADO[planilla.estado]}>{LABEL_ESTADO[planilla.estado]}</Badge>
            <Link to="/supervisor" className="btn-ghost">
              Volver
            </Link>
            <Button
              variant="secondary"
              onClick={onImprimir}
              disabled={!perfilQuery.data}
            >
              Imprimir
            </Button>
            <Button
              variant="danger"
              disabled={yaRevisada}
              onClick={() => {
                setDecision('rechazar');
                setMotivo('');
              }}
            >
              Rechazar
            </Button>
            <Button
              disabled={yaRevisada}
              onClick={() => {
                setDecision('aprobar');
                setMotivo('');
              }}
            >
              Aprobar
            </Button>
          </>
        }
      />

      <section className="card p-4 print:hidden" data-print="hide">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label="Nombre" value={perfilQuery.data?.nombre} />
          <InfoField label="Cédula" value={perfilQuery.data?.cedula} />
          <InfoField label="Cargo" value={perfilQuery.data?.cargo} />
          <InfoField label="Correo" value={perfilQuery.data?.correo} />
          <InfoField label="Dependencia" value={perfilQuery.data?.dependencia} />
          <InfoField label="Periodo" value={`${nombreMes(planilla.mes)} ${planilla.anio}`} />
        </div>
      </section>

      <PlanillaTable registros={registros} onChange={() => {}} readOnly />

      {planilla.observaciones && (
        <section className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Observaciones del empleado</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-800">{planilla.observaciones}</p>
        </section>
      )}

      <Modal
        open={decision !== null}
        onClose={() => setDecision(null)}
        title={decision === 'aprobar' ? 'Aprobar planilla' : 'Rechazar planilla'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDecision(null)}>
              Cancelar
            </Button>
            <Button
              variant={decision === 'rechazar' ? 'danger' : 'primary'}
              onClick={onConfirm}
              loading={revisar.isPending}
            >
              Confirmar
            </Button>
          </>
        }
      >
        {decision === 'rechazar' && (
          <Textarea
            label="Motivo del rechazo *"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Indica al empleado qué debe corregir"
            required
          />
        )}
        {decision === 'aprobar' && (
          <p className="mb-3 text-sm text-slate-700">
            Se registrará tu aprobación con fecha y hora. Opcionalmente puedes adjuntar tu firma.
          </p>
        )}
        <div className="mt-3">
          <p className="mb-2 text-sm font-medium text-ink-800">Firma (opcional)</p>
          <FirmaCanvas onChange={setFirma} />
        </div>
      </Modal>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-ink-800">{value || '—'}</p>
    </div>
  );
}

function construirItemImpresion(planilla: Planilla, perfil: PerfilUsuario): InformePrintItem {
  const registros = (planilla.registros ?? []).map((r) => ({
    id: r.id,
    fecha: r.fecha,
    tipoDia: r.tipoDia ?? autodetectarTipoDia(r.fecha.slice(0, 10)),
    horaInicio: r.horaInicio,
    horaFin: r.horaFin,
    extraDiurna: r.extraDiurna,
    extraNocturna: r.extraNocturna,
    domFestivaDiurna: r.domFestivaDiurna,
    domFestivaNocturna: r.domFestivaNocturna,
    totalHoras: r.totalHoras,
  }));
  const acc = registros.reduce(
    (a, r) => ({
      d: a.d + r.extraDiurna,
      n: a.n + r.extraNocturna,
      dd: a.dd + r.domFestivaDiurna,
      dn: a.dn + r.domFestivaNocturna,
      t: a.t + r.totalHoras,
    }),
    { d: 0, n: 0, dd: 0, dn: 0, t: 0 },
  );
  return {
    planillaId: planilla.id,
    empleadoId: planilla.empleadoId,
    empleadoNombre: perfil.nombre,
    empleadoCedula: perfil.cedula,
    empleadoCargo: perfil.cargo,
    empleadoDependencia: perfil.dependencia,
    supervisorId: planilla.supervisorId,
    supervisorNombre: planilla.supervisorNombre,
    firmaSupervisorUrl: planilla.firmaSupervisorUrl,
    firmaEmpleadoUrl: planilla.firmaEmpleadoUrl,
    estado: planilla.estado,
    revisadaAt: planilla.revisadaAt,
    mes: planilla.mes,
    anio: planilla.anio,
    totalExtraDiurna: acc.d,
    totalExtraNocturna: acc.n,
    totalDomDiurna: acc.dd,
    totalDomNocturna: acc.dn,
    totalHoras: acc.t,
    registros,
    observaciones: planilla.observaciones,
    correo: perfil.correo,
  };
}
