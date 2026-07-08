import { useMemo, useState } from 'react';
import { Link } from '@modern-js/runtime/router';
import {
  usePendientes,
  useRevisarLote,
} from '@/__generated__/supervisor.hooks';
import { useToast } from '@/lib/toast';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { FirmaCanvas } from '@/components/FirmaCanvas';
import {
  COLOR_ESTADO,
  LABEL_ESTADO,
  formatFecha,
  formatHoras,
  nombreMes,
} from '@/shared/format';
import type { Planilla } from '@/shared/types';

type Decision = 'aprobar' | 'rechazar';

export default function Bandeja() {
  const toast = useToast();
  const { data, isLoading, isError, error } = usePendientes();
  const revisarLote = useRevisarLote();

  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [decision, setDecision] = useState<Decision | null>(null);
  const [motivo, setMotivo] = useState('');
  const [firma, setFirma] = useState<string | null>(null);

  const pendientes = data ?? [];

  const todosMarcados =
    pendientes.length > 0 && seleccion.size === pendientes.length;

  const seleccionadas = useMemo(
    () => pendientes.filter((p) => seleccion.has(p.id)),
    [pendientes, seleccion],
  );

  const totalesBandeja = useMemo(
    () =>
      pendientes.reduce(
        (acc, p) => {
          const t = totalesPlanilla(p);
          return {
            diurna: acc.diurna + t.diurna,
            nocturna: acc.nocturna + t.nocturna,
            domDiu: acc.domDiu + t.domDiu,
            domNoc: acc.domNoc + t.domNoc,
            total: acc.total + t.total,
          };
        },
        { diurna: 0, nocturna: 0, domDiu: 0, domNoc: 0, total: 0 },
      ),
    [pendientes],
  );

  const toggleUno = (id: string) => {
    const next = new Set(seleccion);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSeleccion(next);
  };

  const toggleTodo = () => {
    if (todosMarcados) setSeleccion(new Set());
    else setSeleccion(new Set(pendientes.map((p) => p.id)));
  };

  const abrirModal = (d: Decision) => {
    if (seleccion.size === 0) {
      toast.error('Selecciona al menos una planilla');
      return;
    }
    setDecision(d);
    setMotivo('');
    setFirma(null);
  };

  const cerrarModal = () => {
    setDecision(null);
    setMotivo('');
    setFirma(null);
  };

  const onConfirmar = () => {
    if (!decision) return;
    if (decision === 'rechazar' && !motivo.trim()) {
      toast.error('Indica el motivo del rechazo');
      return;
    }
    if (decision === 'aprobar' && !firma) {
      toast.error('Debes firmar antes de aprobar');
      return;
    }
    revisarLote.mutate(
      {
        ids: Array.from(seleccion),
        aprobar: decision === 'aprobar',
        motivoRechazo: decision === 'rechazar' ? motivo : undefined,
        firmaSupervisorUrl: firma ?? undefined,
      },
      {
        onSuccess: (r) => {
          const verbo = decision === 'aprobar' ? 'aprobada' : 'rechazada';
          toast.success(
            `${r.procesadas} planilla(s) ${verbo}(s)` +
              (r.omitidas > 0 ? ` · ${r.omitidas} omitida(s)` : ''),
          );
          setSeleccion(new Set());
          cerrarModal();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bandeja de revisión"
        description="Planillas enviadas por tu equipo, en orden de antigüedad."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => abrirModal('rechazar')}
              disabled={seleccion.size === 0}
            >
              Rechazar selección ({seleccion.size})
            </Button>
            <Button
              onClick={() => abrirModal('aprobar')}
              disabled={seleccion.size === 0}
            >
              Aprobar y firmar ({seleccion.size})
            </Button>
          </>
        }
      />

      {isLoading && <SkeletonRows rows={4} />}

      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error?.message ?? 'Error al cargar pendientes.'}
        </div>
      )}

      {!isLoading && pendientes.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">No tienes planillas pendientes. ¡Buen trabajo!</p>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-high px-4 py-2 text-xs text-slate-500">
            <span>{pendientes.length} planilla(s) pendiente(s)</span>
            <span>{seleccion.size} seleccionada(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todas"
                      checked={todosMarcados}
                      onChange={toggleTodo}
                    />
                  </th>
                  <th className="px-3 py-2">Empleado</th>
                  <th className="px-3 py-2">Periodo</th>
                  <th className="px-3 py-2 text-right">Diurna</th>
                  <th className="px-3 py-2 text-right">Nocturna</th>
                  <th className="px-3 py-2 text-right">Dom-Diu</th>
                  <th className="px-3 py-2 text-right">Dom-Noc</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Enviada</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {pendientes.map((p) => {
                  const marcada = seleccion.has(p.id);
                  const t = totalesPlanilla(p);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${marcada ? 'bg-primary/5' : ''}`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar planilla de ${p.empleadoNombre ?? p.empleadoId}`}
                          checked={marcada}
                          onChange={() => toggleUno(p.id)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-ink-800">
                          {p.empleadoNombre ?? (
                            <span className="font-mono text-xs text-slate-500">
                              {p.empleadoId.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                        {p.empleadoCedula && (
                          <div className="text-xs text-slate-500">CC {p.empleadoCedula}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {nombreMes(p.mes)} {p.anio}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatHoras(t.diurna)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatHoras(t.nocturna)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatHoras(t.domDiu)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatHoras(t.domNoc)}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-primary">
                        {formatHoras(t.total)}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {formatFecha(p.enviadaAt)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={COLOR_ESTADO[p.estado]}>{LABEL_ESTADO[p.estado]}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link to={`/supervisor/${p.id}`}>
                          <Button variant="secondary">Revisar</Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 text-sm font-medium">
                  <td className="px-3 py-3" colSpan={3}>Totales bandeja</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totalesBandeja.diurna)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totalesBandeja.nocturna)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totalesBandeja.domDiu)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totalesBandeja.domNoc)}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-primary">
                    {formatHoras(totalesBandeja.total)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={decision !== null}
        onClose={cerrarModal}
        title={
          decision === 'aprobar'
            ? `Aprobar y firmar ${seleccion.size} planilla(s)`
            : `Rechazar ${seleccion.size} planilla(s)`
        }
        footer={
          <>
            <Button variant="secondary" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button
              variant={decision === 'rechazar' ? 'danger' : 'primary'}
              onClick={onConfirmar}
              loading={revisarLote.isPending}
            >
              Confirmar
            </Button>
          </>
        }
      >
        {decision === 'aprobar' && (
          <p className="mb-3 text-sm text-slate-700">
            Se aplicará la misma firma a las {seleccion.size} planilla(s) seleccionada(s).
            La aprobación queda registrada con fecha y hora.
          </p>
        )}
        {decision === 'rechazar' && (
          <Textarea
            label="Motivo del rechazo *"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Este motivo se enviará a todos los empleados seleccionados"
            required
          />
        )}

        {seleccionadas.length > 0 && (
          <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium">
              Ver empleados afectados ({seleccionadas.length})
            </summary>
            <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
              {seleccionadas.map((p) => (
                <li key={p.id} className="flex justify-between gap-4">
                  <span>{p.empleadoNombre ?? p.empleadoId}</span>
                  <span className="tabular-nums">{nombreMes(p.mes)} {p.anio}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-ink-800">
            Firma {decision === 'aprobar' ? '*' : '(opcional)'}
          </p>
          <FirmaCanvas onChange={setFirma} />
        </div>
      </Modal>
    </div>
  );
}

function totalesPlanilla(p: Planilla) {
  const rs = p.registros ?? [];
  return {
    diurna: rs.reduce((s, r) => s + r.extraDiurna, 0),
    nocturna: rs.reduce((s, r) => s + r.extraNocturna, 0),
    domDiu: rs.reduce((s, r) => s + r.domFestivaDiurna, 0),
    domNoc: rs.reduce((s, r) => s + r.domFestivaNocturna, 0),
    total: rs.reduce((s, r) => s + r.totalHoras, 0),
  };
}
