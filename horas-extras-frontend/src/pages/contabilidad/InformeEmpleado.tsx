import { Link, useParams } from '@modern-js/runtime/router';
import { useInformeEmpleado } from '@/__generated__/contabilidad.hooks';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { COLOR_ESTADO, LABEL_ESTADO, nombreMes, formatHoras } from '@/shared/format';
import type { Planilla } from '@/shared/types';

export default function InformeEmpleado() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useInformeEmpleado(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informe por empleado"
        description={id}
        actions={
          <Link to="/contabilidad" className="btn-ghost">
            Volver al informe general
          </Link>
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
                        <Link to={`/contabilidad/trazabilidad/${p.id}`}>
                          <Button variant="secondary">Trazabilidad</Button>
                        </Link>
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
