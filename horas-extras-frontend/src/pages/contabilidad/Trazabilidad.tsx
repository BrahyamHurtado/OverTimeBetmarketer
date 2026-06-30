import { Link, useParams } from '@modern-js/runtime/router';
import { useTrazabilidad } from '@/__generated__/contabilidad.hooks';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { formatFecha } from '@/shared/format';
import type { EventoPlanilla } from '@/shared/types';

const COLOR_EVENTO: Record<EventoPlanilla['tipo'], string> = {
  CREADA: 'bg-slate-100 text-slate-700',
  EDITADA: 'bg-amber-100 text-amber-800',
  ENVIADA: 'bg-blue-100 text-blue-700',
  APROBADA: 'bg-emerald-100 text-emerald-700',
  RECHAZADA: 'bg-rose-100 text-rose-700',
  PROCESADA: 'bg-violet-100 text-violet-700',
};

export default function Trazabilidad() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useTrazabilidad(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trazabilidad"
        description={`Planilla ${id}`}
        actions={
          <Link to="/contabilidad" className="btn-ghost">
            Volver
          </Link>
        }
      />

      {isLoading && <SkeletonRows rows={4} />}
      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error?.message ?? 'Error al cargar la trazabilidad.'}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">Sin eventos registrados.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <ol className="relative border-l border-slate-200 pl-6">
          {data.map((ev) => (
            <li key={ev.id} className="mb-6 last:mb-0">
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-accent" />
              <div className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge className={COLOR_EVENTO[ev.tipo] ?? 'bg-slate-100 text-slate-700'}>{ev.tipo}</Badge>
                  <span className="text-xs text-slate-500">{formatFecha(ev.createdAt)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Actor: <span className="font-mono">{ev.actorId.slice(0, 8)}…</span>
                </p>
                {ev.detalle && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink-800">{ev.detalle}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
