import { calcularPreview } from '@/shared/calculo';
import { autodetectarTipoDia } from '@/shared/festivos';
import {
  LABEL_ESTADO,
  LABEL_TIPO_DIA,
  formatHoras,
  formatFechaCorta,
  nombreMes,
} from '@/shared/format';
import type {
  Desglose,
  EstadoPlanilla,
  PerfilUsuario,
  RegistroInput,
  TipoDia,
} from '@/shared/types';

interface PlanillaImprimibleProps {
  perfil: PerfilUsuario;
  mes: number;
  anio: number;
  registros: RegistroInput[];
  observaciones?: string;
  estado?: EstadoPlanilla;
  firmaSupervisorUrl?: string | null;
  totales?: Desglose;
}

export function PlanillaImprimible({
  perfil,
  mes,
  anio,
  registros,
  observaciones,
  estado,
  firmaSupervisorUrl,
  totales,
}: PlanillaImprimibleProps) {
  const { registros: calc, totales: totalesCalculados } = calcularPreview(registros);
  const tot = totales ?? totalesCalculados;

  return (
    <article
      data-print="page"
      className="mx-auto max-w-[210mm] bg-white p-8 text-[12px] text-black"
    >
      {/* Encabezado */}
      <header className="border-b border-black pb-3">
        <p className="text-center text-[10px] font-semibold uppercase tracking-wide">
          Planilla de horas extras diurnas, nocturnas, dominicales y festivos
        </p>
        <p className="mt-1 text-center text-[10px] uppercase">
          {nombreMes(mes)} — {anio}
        </p>
      </header>

      {/* Datos del servidor */}
      <section className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
        <Field label="Nombre del servidor" value={perfil.nombre} />
        <Field label="Cédula" value={perfil.cedula} />
        <Field label="Cargo" value={perfil.cargo ?? '—'} />
        <Field label="Correo electrónico" value={perfil.correo} />
        <Field label="Dependencia" value={perfil.dependencia ?? '—'} />
        <Field label="Directivo / Jefe inmediato" value={perfil.supervisorId ?? '—'} />
        {estado && <Field label="Estado" value={LABEL_ESTADO[estado]} />}
      </section>

      {/* Tabla principal */}
      <table className="mt-4 w-full border-collapse border border-black text-[10px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-1 py-1">#</th>
            <th className="border border-black px-1 py-1">Fecha</th>
            <th className="border border-black px-1 py-1">Hábil / No hábil / D-F</th>
            <th className="border border-black px-1 py-1">Inicio</th>
            <th className="border border-black px-1 py-1">Fin</th>
            <th className="border border-black px-1 py-1">Ext. Diurna</th>
            <th className="border border-black px-1 py-1">Ext. Nocturna</th>
            <th className="border border-black px-1 py-1">D-F Diurna</th>
            <th className="border border-black px-1 py-1">D-F Nocturna</th>
            <th className="border border-black px-1 py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {calc.map((r, idx) => {
            const tipo: TipoDia =
              r.tipoDia ?? (r.fecha ? autodetectarTipoDia(r.fecha) : 'HABIL');
            return (
              <tr key={idx}>
                <td className="border border-black px-1 py-1 text-center">{idx + 1}</td>
                <td className="border border-black px-1 py-1">{formatFechaCorta(r.fecha)}</td>
                <td className="border border-black px-1 py-1 text-center">{LABEL_TIPO_DIA[tipo]}</td>
                <td className="border border-black px-1 py-1 text-center tabular-nums">{r.horaInicio || '—'}</td>
                <td className="border border-black px-1 py-1 text-center tabular-nums">{r.horaFin || '—'}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{formatHoras(r.extraDiurna)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{formatHoras(r.extraNocturna)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{formatHoras(r.domFestivaDiurna)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{formatHoras(r.domFestivaNocturna)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{formatHoras(r.totalHoras)}</td>
              </tr>
            );
          })}
          {/* Rellenamos hasta 12 filas mínimo para mantener el layout del formato */}
          {Array.from({ length: Math.max(0, 12 - calc.length) }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border border-black px-1 py-2">&nbsp;</td>
              <td className="border border-black" />
              <td className="border border-black" />
              <td className="border border-black" />
              <td className="border border-black" />
              <td className="border border-black" />
              <td className="border border-black" />
              <td className="border border-black" />
              <td className="border border-black" />
              <td className="border border-black" />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-semibold">
            <td className="border border-black px-1 py-1 text-right" colSpan={5}>Subtotales / Total</td>
            <td className="border border-black px-1 py-1 text-right tabular-nums">{formatHoras(tot.extraDiurna)}</td>
            <td className="border border-black px-1 py-1 text-right tabular-nums">{formatHoras(tot.extraNocturna)}</td>
            <td className="border border-black px-1 py-1 text-right tabular-nums">{formatHoras(tot.domFestivaDiurna)}</td>
            <td className="border border-black px-1 py-1 text-right tabular-nums">{formatHoras(tot.domFestivaNocturna)}</td>
            <td className="border border-black px-1 py-1 text-right tabular-nums">{formatHoras(tot.totalHoras)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-2 text-[9px] italic text-gray-600">
        Nota: las horas se registran en formato 24h (militar). Diurna 06:00–19:00, nocturna 19:00–06:00.
      </p>

      {/* Observaciones */}
      <section className="mt-4">
        <p className="text-[11px] font-semibold">Observaciones</p>
        <div className="mt-1 min-h-[40px] border border-black px-2 py-1 text-[11px] whitespace-pre-wrap">
          {observaciones || ' '}
        </div>
      </section>

      {/* Firmas */}
      <section className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <div className="h-[60px] border-b border-black" />
          <p className="mt-1 text-center text-[10px]">Firma del servidor</p>
          <p className="text-center text-[9px] text-gray-600">{perfil.nombre}</p>
        </div>
        <div>
          <div className="flex h-[60px] items-end justify-center border-b border-black">
            {firmaSupervisorUrl && (
              <img
                src={firmaSupervisorUrl}
                alt="Firma del supervisor"
                className="max-h-[58px] object-contain"
              />
            )}
          </div>
          <p className="mt-1 text-center text-[10px]">Firma del jefe inmediato</p>
          {estado === 'APROBADA' && <p className="text-center text-[9px] text-gray-600">Aprobada</p>}
        </div>
      </section>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 border-b border-dotted border-gray-400 pb-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">{label}:</span>
      <span className="text-[11px]">{value}</span>
    </div>
  );
}
