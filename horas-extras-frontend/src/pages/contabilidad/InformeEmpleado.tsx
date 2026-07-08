import { Link, useParams } from '@modern-js/runtime/router';
import { useInformeEmpleado } from '@/__generated__/contabilidad.hooks';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { COLOR_ESTADO, LABEL_ESTADO, nombreMes, formatHoras } from '@/shared/format';
import { printInforme } from '@/shared/informePrint';
import { exportInformeExcel } from '@/shared/informeExport';
import type { InformeGeneralItem, Planilla } from '@/shared/types';

export default function InformeEmpleado() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useInformeEmpleado(id);

  const items: InformeGeneralItem[] = (data?.planillas ?? []).map(planillaToItem);
  const nombreEmpleado = items[0]?.empleadoNombre ?? 'Empleado';

  const onImprimirTodo = () => {
    if (items.length === 0) return;
    printInforme({
      items,
      titulo: `Informe · ${nombreEmpleado}`,
      subtitulo: `Historial completo · ${items.length} periodo(s)`,
    });
  };

  const onImprimirPlanilla = (p: Planilla) => {
    const it = planillaToItem(p);
    printInforme({
      items: [it],
      titulo: `Informe · ${it.empleadoNombre ?? 'Empleado'}`,
      subtitulo: `${nombreMes(it.mes)} ${it.anio}`,
    });
  };

  const onExportExcel = () => {
    if (items.length === 0) return;
    const slug = (nombreEmpleado || 'empleado').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    exportInformeExcel(items, `informe-${slug}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informe por empleado"
        description={id}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={onExportExcel}
              disabled={items.length === 0}
            >
              Exportar Excel
            </Button>
            <Button
              variant="secondary"
              onClick={onImprimirTodo}
              disabled={items.length === 0}
            >
              Imprimir historial
            </Button>
            <Link to="/contabilidad" className="btn-ghost">
              Volver al informe general
            </Link>
          </>
        }
      />

      {isLoading && <SkeletonRows rows={4} />}
      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error?.message ?? 'Error al cargar el informe.'}
        </div>
      )}

      {data && data.planillas.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">Este empleado no tiene planillas registradas.</p>
        </div>
      )}

      {data && data.planillas.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2">Periodo</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2 text-right">Diurna</th>
                  <th className="px-3 py-2 text-right">Nocturna</th>
                  <th className="px-3 py-2 text-right">Dom-Diu</th>
                  <th className="px-3 py-2 text-right">Dom-Noc</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {data.planillas.map((p) => {
                  const t = totalDe(p);
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium">{nombreMes(p.mes)} {p.anio}</td>
                      <td className="px-3 py-3">
                        <Badge className={COLOR_ESTADO[p.estado]}>{LABEL_ESTADO[p.estado]}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatHoras(t.diurna)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatHoras(t.nocturna)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatHoras(t.domDiu)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatHoras(t.domNoc)}</td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">{formatHoras(t.total)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => onImprimirPlanilla(p)}>
                            Imprimir
                          </Button>
                          <Link to={`/contabilidad/trazabilidad/${p.id}`}>
                            <Button variant="secondary">Trazabilidad</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function planillaToItem(p: Planilla): InformeGeneralItem {
  const rs = p.registros ?? [];
  const totalExtraDiurna = rs.reduce((s, r) => s + r.extraDiurna, 0);
  const totalExtraNocturna = rs.reduce((s, r) => s + r.extraNocturna, 0);
  const totalDomDiurna = rs.reduce((s, r) => s + r.domFestivaDiurna, 0);
  const totalDomNocturna = rs.reduce((s, r) => s + r.domFestivaNocturna, 0);
  const totalHoras = rs.reduce((s, r) => s + r.totalHoras, 0);
  return {
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
    totalExtraDiurna,
    totalExtraNocturna,
    totalDomDiurna,
    totalDomNocturna,
    totalHoras,
    registros: rs.map((r) => ({
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
  };
}

function totalDe(p: Planilla) {
  const rs = p.registros ?? [];
  return {
    diurna: rs.reduce((s, r) => s + r.extraDiurna, 0),
    nocturna: rs.reduce((s, r) => s + r.extraNocturna, 0),
    domDiu: rs.reduce((s, r) => s + r.domFestivaDiurna, 0),
    domNoc: rs.reduce((s, r) => s + r.domFestivaNocturna, 0),
    total: rs.reduce((s, r) => s + r.totalHoras, 0),
  };
}
