import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from '@modern-js/runtime/router';
import { useAuth } from '@/contexts/AuthContext';
import { usePerfil } from '@/__generated__/auth.hooks';
import {
  useEnviarPlanilla,
  useGuardarPlanilla,
  useMisPlanillas,
  usePlanilla,
} from '@/__generated__/planilla.hooks';
import { useToast } from '@/lib/toast';
import { PlanillaTable } from './PlanillaTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { calcularPreview } from '@/shared/calculo';
import { printInforme, type InformePrintItem } from '@/shared/informePrint';
import { autodetectarTipoDia } from '@/shared/festivos';
import {
  COLOR_ESTADO,
  LABEL_ESTADO,
  MESES,
  nombreMes,
} from '@/shared/format';
import type {
  EstadoPlanilla,
  PerfilUsuario,
  Planilla,
  RegistroInput,
} from '@/shared/types';

const ANIO_ACTUAL = new Date().getFullYear();
const MES_ACTUAL = new Date().getMonth() + 1;

const ANIOS = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - 2 + i);

const ESTADO_BLOQUEADO: EstadoPlanilla[] = ['APROBADA', 'PROCESADA'];

export default function MiPlanilla() {
  const { usuario } = useAuth();
  const { id: routeId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const perfilQuery = usePerfil(usuario?.id);
  const listaQuery = useMisPlanillas();
  const detalleQuery = usePlanilla(routeId);

  const guardar = useGuardarPlanilla();
  const enviar = useEnviarPlanilla();

  const [mes, setMes] = useState<number>(
    Number(searchParams.get('mes')) || MES_ACTUAL,
  );
  const [anio, setAnio] = useState<number>(
    Number(searchParams.get('anio')) || ANIO_ACTUAL,
  );
  const [observaciones, setObservaciones] = useState('');
  const [registros, setRegistros] = useState<RegistroInput[]>([
    { fecha: '', horaInicio: '', horaFin: '' },
  ]);
  const [planillaActual, setPlanillaActual] = useState<Planilla | null>(null);

  useEffect(() => {
    if (routeId && detalleQuery.data) {
      hidratar(detalleQuery.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, detalleQuery.data]);

  useEffect(() => {
    if (routeId || !listaQuery.data) return;
    const existente = listaQuery.data.find((p) => p.mes === mes && p.anio === anio);
    if (existente) {
      navigate(`/empleado/planilla/${existente.id}`, { replace: true });
    } else {
      setPlanillaActual(null);
      setObservaciones('');
      setRegistros([{ fecha: '', horaInicio: '', horaFin: '' }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listaQuery.data, mes, anio, routeId]);

  const onCambiarPeriodo = (nuevoMes: number, nuevoAnio: number) => {
    setMes(nuevoMes);
    setAnio(nuevoAnio);
    if (routeId) {
      navigate(`/empleado/planilla?mes=${nuevoMes}&anio=${nuevoAnio}`, { replace: true });
    }
  };

  function hidratar(p: Planilla) {
    setPlanillaActual(p);
    setMes(p.mes);
    setAnio(p.anio);
    setObservaciones(p.observaciones ?? '');
    setRegistros(
      (p.registros ?? []).map((r) => ({
        fecha: r.fecha?.slice(0, 10) ?? '',
        horaInicio: r.horaInicio,
        horaFin: r.horaFin,
        tipoDia: r.tipoDia,
      })),
    );
  }

  const estado = planillaActual?.estado;
  const bloqueada = estado ? ESTADO_BLOQUEADO.includes(estado) : false;

  const onGuardar = () => {
    if (registros.length === 0) {
      toast.error('Agrega al menos un registro');
      return;
    }
    const invalidos = registros.filter(
      (r) => !r.fecha || !/^\d{2}:\d{2}$/.test(r.horaInicio) || !/^\d{2}:\d{2}$/.test(r.horaFin),
    );
    if (invalidos.length > 0) {
      toast.error(`${invalidos.length} fila(s) con datos incompletos`);
      return;
    }
    guardar.mutate(
      { mes, anio, observaciones: observaciones || undefined, registros },
      {
        onSuccess: (p) => {
          setPlanillaActual(p);
          toast.success('Planilla guardada');
          if (!routeId) navigate(`/empleado/planilla/${p.id}`, { replace: true });
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const onEnviar = () => {
    if (!planillaActual) {
      toast.error('Primero guarda la planilla');
      return;
    }
    enviar.mutate(planillaActual.id, {
      onSuccess: (p) => {
        setPlanillaActual(p);
        toast.success('Enviada al supervisor');
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const onImprimir = () => {
    if (!perfilQuery.data) {
      toast.error('Espera a que cargue tu perfil');
      return;
    }
    if (registros.length === 0) {
      toast.error('Agrega al menos un registro para imprimir');
      return;
    }
    printInforme({
      items: [
        armarItemImpresion({
          perfil: perfilQuery.data,
          mes,
          anio,
          registros,
          observaciones,
          planilla: planillaActual,
        }),
      ],
      titulo: `Planilla · ${perfilQuery.data.nombre}`,
      subtitulo: `${nombreMes(mes)} ${anio}`,
    });
  };

  if (perfilQuery.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonRows rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi planilla"
        description={`Registra tus horas extras de ${nombreMes(mes)} ${anio}.`}
        actions={
          <>
            {estado && (
              <Badge className={COLOR_ESTADO[estado]}>{LABEL_ESTADO[estado]}</Badge>
            )}
            <Link to="/empleado" className="btn-ghost">
              Ver mis planillas
            </Link>
            {bloqueada && (
              <Button
                variant="secondary"
                onClick={() => {
                  const next = mes === 12 ? { mes: 1, anio: anio + 1 } : { mes: mes + 1, anio };
                  onCambiarPeriodo(next.mes, next.anio);
                }}
              >
                Nueva planilla
              </Button>
            )}
            <Button variant="secondary" onClick={onImprimir}>
              Imprimir
            </Button>
            <Button variant="secondary" onClick={onGuardar} loading={guardar.isPending} disabled={bloqueada}>
              Guardar
            </Button>
            <Button onClick={onEnviar} loading={enviar.isPending} disabled={bloqueada || !planillaActual}>
              Enviar a revisión
            </Button>
          </>
        }
      />

      {estado === 'RECHAZADA' && planillaActual?.motivoRechazo && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 print:hidden"
        >
          <p className="font-semibold">El supervisor rechazó esta planilla:</p>
          <p className="mt-1 whitespace-pre-wrap">{planillaActual.motivoRechazo}</p>
          <p className="mt-2 text-xs text-rose-700">Edita los registros y guarda para volver a enviarla.</p>
        </div>
      )}

      <section className="card p-4 print:hidden" data-print="hide">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField label="Nombre" value={perfilQuery.data?.nombre} />
          <InfoField label="Cédula" value={perfilQuery.data?.cedula} />
          <InfoField label="Cargo" value={perfilQuery.data?.cargo} />
          <InfoField label="Correo" value={perfilQuery.data?.correo} />
          <InfoField label="Dependencia" value={perfilQuery.data?.dependencia} />
          <InfoField label="Directivo / Supervisor" value={perfilQuery.data?.supervisorId ?? 'No asignado'} />
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1">
            <Select
              label="Mes"
              value={mes}
              onChange={(e) => onCambiarPeriodo(Number(e.target.value), anio)}
              hint={bloqueada ? 'Cambia el mes para crear otra' : undefined}
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </Select>
            <Select
              label="Año"
              value={anio}
              onChange={(e) => onCambiarPeriodo(mes, Number(e.target.value))}
            >
              {ANIOS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <PlanillaTable registros={registros} onChange={setRegistros} readOnly={bloqueada} />

      <section className="card p-4 print:hidden" data-print="hide">
        <Textarea
          label="Observaciones"
          placeholder="Notas o aclaraciones para el supervisor (opcional)"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          disabled={bloqueada}
        />
      </section>

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

function armarItemImpresion(params: {
  perfil: PerfilUsuario;
  mes: number;
  anio: number;
  registros: RegistroInput[];
  observaciones: string;
  planilla: Planilla | null;
}): InformePrintItem {
  const { perfil, mes, anio, registros, observaciones, planilla } = params;
  const calc = calcularPreview(registros);
  const registrosDetalle = calc.registros.map((r, idx) => ({
    id: `preview-${idx}`,
    fecha: r.fecha,
    tipoDia: r.tipoDia ?? (r.fecha ? autodetectarTipoDia(r.fecha) : 'HABIL'),
    horaInicio: r.horaInicio,
    horaFin: r.horaFin,
    extraDiurna: r.extraDiurna,
    extraNocturna: r.extraNocturna,
    domFestivaDiurna: r.domFestivaDiurna,
    domFestivaNocturna: r.domFestivaNocturna,
    totalHoras: r.totalHoras,
  }));
  return {
    planillaId: planilla?.id ?? '',
    empleadoId: perfil.id,
    empleadoNombre: perfil.nombre,
    empleadoCedula: perfil.cedula,
    empleadoCargo: perfil.cargo,
    empleadoDependencia: perfil.dependencia,
    supervisorId: planilla?.supervisorId ?? null,
    supervisorNombre: planilla?.supervisorNombre ?? null,
    firmaSupervisorUrl: planilla?.firmaSupervisorUrl ?? null,
    firmaEmpleadoUrl: planilla?.firmaEmpleadoUrl ?? null,
    estado: planilla?.estado ?? 'BORRADOR',
    revisadaAt: planilla?.revisadaAt ?? null,
    mes,
    anio,
    totalExtraDiurna: calc.totales.extraDiurna,
    totalExtraNocturna: calc.totales.extraNocturna,
    totalDomDiurna: calc.totales.domFestivaDiurna,
    totalDomNocturna: calc.totales.domFestivaNocturna,
    totalHoras: calc.totales.totalHoras,
    registros: registrosDetalle,
    observaciones,
    correo: perfil.correo,
  };
}
