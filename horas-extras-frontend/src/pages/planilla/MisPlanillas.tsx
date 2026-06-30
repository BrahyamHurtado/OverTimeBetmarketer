import { Link } from '@modern-js/runtime/router';
import { useMisPlanillas } from '@/__generated__/planilla.hooks';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { COLOR_ESTADO, LABEL_ESTADO, nombreMes, formatFecha } from '@/shared/format';

export default function MisPlanillas() {
  const { data, isLoading, isError, error } = useMisPlanillas();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis planillas"
        description="Histórico de tus planillas mensuales."
        actions={
          <Link to="/empleado/planilla" className="btn-primary">
            + Nueva planilla
          </Link>
        }
      />

      {isLoading && <SkeletonRows rows={4} />}

      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error?.message ?? 'No pudimos cargar tus planillas.'}
        </div>
      )}

      {!isLoading && data && data.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">Aún no tienes planillas registradas.</p>
          <Link to="/empleado/planilla" className="btn-primary mt-4 inline-block">
            Crear mi primera planilla
          </Link>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-2">Periodo</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Enviada</th>
                  <th className="px-4 py-2">Revisada</th>
                  <th className="px-4 py-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/empleado/planilla/${p.id}`} className="font-medium text-accent hover:text-accent-hover">
                        {nombreMes(p.mes)} {p.anio}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={COLOR_ESTADO[p.estado]}>{LABEL_ESTADO[p.estado]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatFecha(p.enviadaAt)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatFecha(p.revisadaAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/empleado/planilla/${p.id}`}>
                        <Button variant="secondary">Abrir</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
