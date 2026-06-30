import { Link } from '@modern-js/runtime/router';
import { usePendientes } from '@/__generated__/supervisor.hooks';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { COLOR_ESTADO, LABEL_ESTADO, nombreMes, formatFecha } from '@/shared/format';

export default function Bandeja() {
  const { data, isLoading, isError, error } = usePendientes();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bandeja de revisión"
        description="Planillas enviadas por tu equipo, en orden de antigüedad."
      />

      {isLoading && <SkeletonRows rows={4} />}

      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error?.message ?? 'Error al cargar pendientes.'}
        </div>
      )}

      {!isLoading && data && data.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">No tienes planillas pendientes. ¡Buen trabajo!</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-2">Empleado</th>
                  <th className="px-4 py-2">Periodo</th>
                  <th className="px-4 py-2">Enviada</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink-800">
                        {p.empleadoNombre ?? <span className="font-mono text-xs text-slate-500">{p.empleadoId.slice(0, 8)}…</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{nombreMes(p.mes)} {p.anio}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatFecha(p.enviadaAt)}</td>
                    <td className="px-4 py-3">
                      <Badge className={COLOR_ESTADO[p.estado]}>{LABEL_ESTADO[p.estado]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/supervisor/${p.id}`}>
                        <Button>Revisar</Button>
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
