import { useMemo, useState } from 'react';
import {
  useActualizarUsuario,
  useUsuarios,
} from '@/__generated__/auth.hooks';
import { useToast } from '@/lib/toast';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';

export default function AsignarSupervisor() {
  const toast = useToast();
  const empleadosQuery = useUsuarios({ rol: 'EMPLEADO' });
  const supervisoresQuery = useUsuarios({ rol: 'SUPERVISOR' });
  const actualizar = useActualizarUsuario();
  const [busqueda, setBusqueda] = useState('');

  const supervisoresPorId = useMemo(() => {
    const m = new Map<string, string>();
    supervisoresQuery.data?.forEach((s) => m.set(s.id, s.nombre));
    return m;
  }, [supervisoresQuery.data]);

  const empleados = useMemo(() => {
    const list = empleadosQuery.data ?? [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.nombre.toLowerCase().includes(q) ||
        e.cedula.toLowerCase().includes(q) ||
        e.correo.toLowerCase().includes(q),
    );
  }, [empleadosQuery.data, busqueda]);

  const onChange = (empleadoId: string, supervisorId: string) => {
    actualizar.mutate(
      { id: empleadoId, supervisorId: supervisorId || null },
      {
        onSuccess: () => toast.success('Supervisor asignado'),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asignar supervisores"
        description="Define el supervisor directo de cada empleado. Las planillas nuevas se enrutarán a su bandeja."
      />

      <section className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
        <Input
          label="Buscar empleado"
          placeholder="Nombre, cédula o correo"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="sm:col-span-2"
        />
        <div className="flex items-end">
          <Badge className="bg-surface-high text-slate-500">
            {supervisoresQuery.data?.length ?? 0} supervisor(es) disponibles
          </Badge>
        </div>
      </section>

      {(empleadosQuery.isLoading || supervisoresQuery.isLoading) && <SkeletonRows rows={5} />}

      {empleadosQuery.data && supervisoresQuery.data && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-high text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Empleado</th>
                  <th className="px-3 py-2">Cédula</th>
                  <th className="px-3 py-2">Cargo · Dependencia</th>
                  <th className="px-3 py-2">Supervisor actual</th>
                  <th className="px-3 py-2 w-72">Asignar</th>
                </tr>
              </thead>
              <tbody>
                {empleados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                      No hay empleados con esos criterios.
                    </td>
                  </tr>
                )}
                {empleados.map((e) => {
                  const supName = e.supervisorId ? supervisoresPorId.get(e.supervisorId) : null;
                  return (
                    <tr key={e.id} className="border-b border-outline-variant/40 last:border-0 hover:bg-surface-high">
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink-900">{e.nombre}</div>
                        <div className="text-xs text-slate-500">{e.correo}</div>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{e.cedula}</td>
                      <td className="px-3 py-2 text-xs">
                        <div>{e.cargo ?? '—'}</div>
                        <div className="text-slate-500">{e.dependencia ?? '—'}</div>
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {supName ? (
                          <Badge className="bg-primary-container text-primary">{supName}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={e.supervisorId ?? ''}
                          onChange={(ev) => onChange(e.id, ev.target.value)}
                          disabled={actualizar.isPending}
                        >
                          <option value="">— Sin supervisor —</option>
                          {supervisoresQuery.data!.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nombre} {s.cedula ? `(CC ${s.cedula})` : ''}
                            </option>
                          ))}
                        </Select>
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
