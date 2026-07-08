import { Fragment, useMemo, useState } from 'react';
import { Link } from '@modern-js/runtime/router';
import {
  useInformeGeneral,
  useProcesarPlanillas,
  useRechazarPlanillas,
} from '@/__generated__/contabilidad.hooks';
import { useToast } from '@/lib/toast';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { SkeletonRows } from '@/components/ui/Skeleton';
import {
  COLOR_ESTADO,
  COLOR_TIPO_DIA,
  LABEL_ESTADO,
  LABEL_TIPO_DIA,
  MESES,
  formatFechaCorta,
  formatHoras,
  nombreMes,
} from '@/shared/format';
import { Badge } from '@/components/ui/Badge';
import { exportInformeExcel } from '@/shared/informeExport';
import { printInforme } from '@/shared/informePrint';
import type { InformeGeneralItem } from '@/shared/types';

const ANIO_ACTUAL = new Date().getFullYear();
const MES_ACTUAL = new Date().getMonth() + 1;
const ANIOS = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - 2 + i);

export default function InformeGeneral() {
  const toast = useToast();
  const [mes, setMes] = useState<number | undefined>(MES_ACTUAL);
  const [anio, setAnio] = useState<number>(ANIO_ACTUAL);
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [expandida, setExpandida] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, error } = useInformeGeneral(mes, anio);
  const procesar = useProcesarPlanillas();
  const rechazar = useRechazarPlanillas();
  const [modalRechazoAbierto, setModalRechazoAbierto] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const items = useMemo(() => {
    if (!data) return [] as InformeGeneralItem[];
    const q = busqueda.trim().toLowerCase();
    if (!q) return data.porEmpleado;
    return data.porEmpleado.filter(
      (it) =>
        (it.empleadoNombre ?? '').toLowerCase().includes(q) ||
        (it.empleadoCedula ?? '').toLowerCase().includes(q) ||
        it.empleadoId.toLowerCase().includes(q),
    );
  }, [data, busqueda]);

  const totales = useMemo(() => {
    return items.reduce(
      (acc, it) => ({
        diurna: acc.diurna + it.totalExtraDiurna,
        nocturna: acc.nocturna + it.totalExtraNocturna,
        domDiu: acc.domDiu + it.totalDomDiurna,
        domNoc: acc.domNoc + it.totalDomNocturna,
        total: acc.total + it.totalHoras,
      }),
      { diurna: 0, nocturna: 0, domDiu: 0, domNoc: 0, total: 0 },
    );
  }, [items]);

  const toggle = (id: string) => {
    const next = new Set(seleccion);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSeleccion(next);
  };
  const toggleExpand = (id: string) => {
    const next = new Set(expandida);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandida(next);
  };

  const toggleAll = () => {
    if (seleccion.size === items.length) setSeleccion(new Set());
    else setSeleccion(new Set(items.map((it) => it.planillaId)));
  };

  const onProcesar = () => {
    if (seleccion.size === 0) {
      toast.error('Selecciona al menos una planilla');
      return;
    }
    procesar.mutate(Array.from(seleccion), {
      onSuccess: (r) => {
        toast.success(`${r.procesadas} planilla(s) marcadas como procesadas`);
        setSeleccion(new Set());
      },
      onError: (e) => toast.error(e.message),
    });
  };
  const periodoTexto = mes ? `${nombreMes(mes)} ${anio}` : `Año ${anio}`;

  const seleccionados = useMemo(
    () => items.filter((it) => seleccion.has(it.planillaId)),
    [items, seleccion],
  );

  const rechazablesSeleccionadas = useMemo(
    () => seleccionados.filter((it) => it.estado === 'APROBADA'),
    [seleccionados],
  );

  const abrirModalRechazo = () => {
    if (rechazablesSeleccionadas.length === 0) {
      toast.error('Selecciona al menos una planilla en estado APROBADA');
      return;
    }
    setMotivoRechazo('');
    setModalRechazoAbierto(true);
  };

  const cerrarModalRechazo = () => {
    setModalRechazoAbierto(false);
    setMotivoRechazo('');
  };

  const confirmarRechazo = () => {
    const texto = motivoRechazo.trim();
    if (texto.length < 3) {
      toast.error('Escribe un motivo (mínimo 3 caracteres)');
      return;
    }
    rechazar.mutate(
      {
        ids: rechazablesSeleccionadas.map((it) => it.planillaId),
        motivoRechazo: texto,
      },
      {
        onSuccess: (r) => {
          toast.success(
            `${r.rechazadas} planilla(s) devuelta(s) al empleado` +
              (r.omitidas > 0 ? ` · ${r.omitidas} omitida(s)` : ''),
          );
          setSeleccion(new Set());
          cerrarModalRechazo();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const onExportExcel = () => {
    if (items.length === 0) return;
    const nombre = `informe-horas-${anio}${mes ? `-${String(mes).padStart(2, '0')}` : ''}.xlsx`;
    exportInformeExcel(items, nombre);
  };

  const onImprimirTodos = () => {
    if (items.length === 0) return;
    printInforme({
      items,
      titulo: 'Informe de horas extras',
      subtitulo: `${periodoTexto} · ${items.length} empleado(s)`,
    });
  };

  const onImprimirSeleccionados = () => {
    if (seleccionados.length === 0) {
      toast.error('Selecciona al menos un empleado para imprimir');
      return;
    }
    printInforme({
      items: seleccionados,
      titulo: seleccionados.length === 1
        ? `Informe · ${seleccionados[0].empleadoNombre ?? 'Empleado'}`
        : 'Informe de horas extras (selección)',
      subtitulo: `${periodoTexto} · ${seleccionados.length} empleado(s) seleccionado(s)`,
    });
  };

  const onImprimirIndividual = (it: InformeGeneralItem) => {
    printInforme({
      items: [it],
      titulo: `Informe · ${it.empleadoNombre ?? 'Empleado'}`,
      subtitulo: `${nombreMes(it.mes)} ${it.anio}`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informe general"
        description="Planillas aprobadas/procesadas en el periodo seleccionado."
        actions={
          <>
            <Button variant="secondary" onClick={onExportExcel} disabled={items.length === 0}>
              Exportar Excel
            </Button>
            <Button variant="secondary" onClick={onImprimirTodos} disabled={items.length === 0}>
              Imprimir todos
            </Button>
            <Button
              variant="secondary"
              onClick={onImprimirSeleccionados}
              disabled={seleccion.size === 0}
            >
              Imprimir selección ({seleccion.size})
            </Button>
            <Button
              variant="danger"
              onClick={abrirModalRechazo}
              disabled={rechazablesSeleccionadas.length === 0}
            >
              Rechazar ({rechazablesSeleccionadas.length})
            </Button>
            <Button onClick={onProcesar} loading={procesar.isPending} disabled={seleccion.size === 0}>
              Marcar como procesadas ({seleccion.size})
            </Button>
          </>
        }
      />

      <section className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
        <Select label="Mes" value={mes ?? ''} onChange={(e) => setMes(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Todos</option>
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </Select>
        <Select label="Año" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {ANIOS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Input
          label="Buscar"
          placeholder="Nombre, cédula o ID"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="sm:col-span-2"
        />
      </section>

      {isLoading && <SkeletonRows rows={5} />}
      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error?.message ?? 'Error al cargar el informe.'}
        </div>
      )}

      {data && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-high px-4 py-2 text-xs text-slate-500">
            <span>
              {items.length} planilla(s) {mes ? `· ${nombreMes(mes)} ${anio}` : `· año ${anio}`}
            </span>
            <span>{data.totalPlanillas} en el periodo</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-high text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 w-8" />
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todo"
                      checked={items.length > 0 && seleccion.size === items.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-3 py-2">Empleado</th>
                  <th className="px-3 py-2">Periodo</th>
                  <th className="px-3 py-2">Supervisor / Firma</th>
                  <th className="px-3 py-2 text-right">Diurna</th>
                  <th className="px-3 py-2 text-right">Nocturna</th>
                  <th className="px-3 py-2 text-right">Dom-Diu</th>
                  <th className="px-3 py-2 text-right">Dom-Noc</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-sm text-slate-500">
                      No hay resultados para los filtros aplicados.
                    </td>
                  </tr>
                )}
                {items.map((it) => {
                  const open = expandida.has(it.planillaId);
                  return (
                    <Fragment key={it.planillaId}>
                      <tr
                        className={`border-b border-outline-variant/40 last:border-0 hover:bg-surface-high ${open ? 'bg-surface-high/50' : ''}`}
                      >
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => toggleExpand(it.planillaId)}
                            aria-label={open ? 'Cerrar detalle' : 'Ver detalle'}
                            className="rounded p-1 text-slate-400 hover:bg-surface-highest hover:text-ink-900"
                          >
                            <Chevron open={open} />
                          </button>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="checkbox"
                            checked={seleccion.has(it.planillaId)}
                            onChange={() => toggle(it.planillaId)}
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-ink-900">{it.empleadoNombre ?? '—'}</div>
                          <div className="text-xs text-slate-500">
                            {it.empleadoCedula ? `CC ${it.empleadoCedula}` : null}
                            {it.empleadoCargo ? ` · ${it.empleadoCargo}` : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div>{nombreMes(it.mes)} {it.anio}</div>
                          <div className="text-xs">
                            <Badge className={COLOR_ESTADO[it.estado]}>{LABEL_ESTADO[it.estado]}</Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-sm text-ink-900">{it.supervisorNombre ?? '—'}</div>
                          {it.firmaSupervisorUrl ? (
                            <a
                              href={it.firmaSupervisorUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block rounded border border-outline-variant bg-surface-lowest p-0.5"
                              title="Ver firma en tamaño completo"
                            >
                              <img
                                src={it.firmaSupervisorUrl}
                                alt={`Firma de ${it.supervisorNombre ?? 'supervisor'}`}
                                className="h-8 w-auto max-w-[120px] object-contain"
                              />
                            </a>
                          ) : (
                            <div className="mt-1 text-xs text-slate-400">Sin firma</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums align-top">{formatHoras(it.totalExtraDiurna)}</td>
                        <td className="px-3 py-2 text-right tabular-nums align-top">{formatHoras(it.totalExtraNocturna)}</td>
                        <td className="px-3 py-2 text-right tabular-nums align-top">{formatHoras(it.totalDomDiurna)}</td>
                        <td className="px-3 py-2 text-right tabular-nums align-top">{formatHoras(it.totalDomNocturna)}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums align-top text-primary">{formatHoras(it.totalHoras)}</td>
                        <td className="px-3 py-2 text-right text-xs align-top">
                          <button
                            type="button"
                            onClick={() => onImprimirIndividual(it)}
                            className="text-primary hover:text-secondary"
                          >
                            Imprimir
                          </button>
                          <span className="mx-2 text-slate-400">·</span>
                          <Link className="text-primary hover:text-secondary" to={`/contabilidad/empleado/${it.empleadoId}`}>
                            Detalle
                          </Link>
                          <span className="mx-2 text-slate-400">·</span>
                          <Link className="text-primary hover:text-secondary" to={`/contabilidad/trazabilidad/${it.planillaId}`}>
                            Trazabilidad
                          </Link>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-surface-low">
                          <td colSpan={11} className="px-6 py-4">
                            <DetalleRegistros item={it} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-outline-variant bg-surface-high text-sm font-medium">
                    <td className="px-3 py-3" colSpan={5}>Totales filtrados</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totales.diurna)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totales.nocturna)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totales.domDiu)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totales.domNoc)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-primary">{formatHoras(totales.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalRechazoAbierto}
        onClose={cerrarModalRechazo}
        title={`Devolver ${rechazablesSeleccionadas.length} planilla(s) al empleado`}
        footer={
          <>
            <Button variant="secondary" onClick={cerrarModalRechazo}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarRechazo} loading={rechazar.isPending}>
              Rechazar y devolver
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-700">
          El empleado recibirá el motivo, corregirá los registros y volverá a enviarla.
          <strong> El supervisor tendrá que aprobar y firmar de nuevo</strong> (se limpia su firma actual).
        </p>
        <Textarea
          label="Motivo del rechazo *"
          value={motivoRechazo}
          onChange={(e) => setMotivoRechazo(e.target.value)}
          placeholder="Indica qué debe corregir el empleado"
          required
          rows={4}
        />
        {rechazablesSeleccionadas.length > 0 && (
          <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium">
              Ver planillas afectadas ({rechazablesSeleccionadas.length})
            </summary>
            <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
              {rechazablesSeleccionadas.map((it) => (
                <li key={it.planillaId} className="flex justify-between gap-4">
                  <span>{it.empleadoNombre ?? it.empleadoId}</span>
                  <span className="tabular-nums">{nombreMes(it.mes)} {it.anio}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {seleccionados.length !== rechazablesSeleccionadas.length && (
          <p className="mt-3 text-xs text-amber-700">
            Se ignorarán {seleccionados.length - rechazablesSeleccionadas.length} planilla(s)
            que ya no están en estado APROBADA.
          </p>
        )}
      </Modal>
    </div>
  );
}

function DetalleRegistros({ item }: { item: InformeGeneralItem }) {
  if (item.registros.length === 0) {
    return <p className="text-sm text-slate-500">Esta planilla no tiene registros.</p>;
  }
  return (
    <div className="rounded-lg border border-outline-variant bg-surface">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Detalle hora por hora · {item.empleadoNombre ?? item.empleadoId}
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-outline-variant/60 bg-surface-high text-left text-slate-500">
            <th className="px-3 py-1.5">Fecha</th>
            <th className="px-3 py-1.5">Tipo</th>
            <th className="px-3 py-1.5">Inicio</th>
            <th className="px-3 py-1.5">Fin</th>
            <th className="px-3 py-1.5 text-right">Diurna</th>
            <th className="px-3 py-1.5 text-right">Nocturna</th>
            <th className="px-3 py-1.5 text-right">Dom-Diu</th>
            <th className="px-3 py-1.5 text-right">Dom-Noc</th>
            <th className="px-3 py-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {item.registros.map((r) => (
            <tr key={r.id} className="border-b border-outline-variant/30 last:border-0">
              <td className="px-3 py-1.5">{formatFechaCorta(r.fecha)}</td>
              <td className="px-3 py-1.5">
                <Badge className={COLOR_TIPO_DIA[r.tipoDia]}>{LABEL_TIPO_DIA[r.tipoDia]}</Badge>
              </td>
              <td className="px-3 py-1.5 tabular-nums">{r.horaInicio}</td>
              <td className="px-3 py-1.5 tabular-nums">{r.horaFin}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatHoras(r.extraDiurna)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatHoras(r.extraNocturna)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatHoras(r.domFestivaDiurna)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatHoras(r.domFestivaNocturna)}</td>
              <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatHoras(r.totalHoras)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

