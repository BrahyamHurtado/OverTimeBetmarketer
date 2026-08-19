import { useMemo } from 'react';
import { calcularPreview } from '@/shared/calculo';
import { autodetectarTipoDia } from '@/shared/festivos';
import {
  COLOR_TIPO_DIA,
  LABEL_TIPO_DIA,
  formatHoras,
  formatFechaCorta,
} from '@/shared/format';
import type { RegistroInput, TipoDia } from '@/shared/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DateField } from '@/components/ui/DateField';
import { TimeField } from '@/components/ui/TimeField';

interface PlanillaTableProps {
  registros: RegistroInput[];
  onChange: (registros: RegistroInput[]) => void;
  readOnly?: boolean;
}

const TIPOS_DIA: TipoDia[] = ['HABIL', 'NO_HABIL', 'DOMINICAL_FESTIVO'];

const FILA_VACIA: RegistroInput = {
  fecha: '',
  horaInicio: '',
  horaFin: '',
};

export function PlanillaTable({ registros, onChange, readOnly = false }: PlanillaTableProps) {
  const { registros: calculados, totales } = useMemo(
    () => calcularPreview(registros),
    [registros],
  );

  const update = (idx: number, partial: Partial<RegistroInput>) => {
    const next = [...registros];
    const merged = { ...next[idx], ...partial };
    if (partial.fecha !== undefined && next[idx].tipoDia === undefined) {
      merged.tipoDia = undefined;
    }
    next[idx] = merged;
    onChange(next);
  };

  const setTipoDia = (idx: number, tipo: TipoDia | undefined) => {
    const next = [...registros];
    next[idx] = { ...next[idx], tipoDia: tipo };
    onChange(next);
  };

  const addRow = () => onChange([...registros, { ...FILA_VACIA }]);
  const removeRow = (idx: number) => onChange(registros.filter((_, i) => i !== idx));

  return (
    <div className="card overflow-hidden" data-print="page">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Tipo de día</th>
              <th className="px-3 py-2">Inicio</th>
              <th className="px-3 py-2">Fin</th>
              <th className="px-3 py-2 text-right" title="Horas extras diurnas (06:00-19:00)">Diurna</th>
              <th className="px-3 py-2 text-right" title="Horas extras nocturnas (19:00-06:00)">Nocturna</th>
              <th className="px-3 py-2 text-right" title="Dominical/Festivo diurna">Dom-Diu</th>
              <th className="px-3 py-2 text-right" title="Dominical/Festivo nocturna">Dom-Noc</th>
              <th className="px-3 py-2 text-right">Total</th>
              {!readOnly && <th className="px-3 py-2 print:hidden" />}
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-sm text-slate-500">
                  No hay registros. Agrega una fila para comenzar.
                </td>
              </tr>
            )}
            {registros.map((r, idx) => {
              const calc = calculados[idx];
              const tipoEfectivo: TipoDia =
                r.tipoDia ?? (r.fecha ? autodetectarTipoDia(r.fecha) : 'HABIL');
              return (
                <tr key={idx} className="border-b border-slate-100 align-middle last:border-0">
                  <td className="px-3 py-2 text-xs text-slate-500">{idx + 1}</td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-sm">{formatFechaCorta(r.fecha)}</span>
                    ) : (
                      <DateField
                        value={r.fecha}
                        onChange={(v) => update(idx, { fecha: v })}
                        className="min-w-[11rem]"
                        ariaLabel={`Fecha de la fila ${idx + 1}`}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <Badge className={COLOR_TIPO_DIA[tipoEfectivo]}>{LABEL_TIPO_DIA[tipoEfectivo]}</Badge>
                    ) : (
                      <select
                        className="input-base min-w-[8rem] py-1.5"
                        value={r.tipoDia ?? 'AUTO'}
                        onChange={(e) =>
                          setTipoDia(idx, e.target.value === 'AUTO' ? undefined : (e.target.value as TipoDia))
                        }
                      >
                        <option value="AUTO">Auto ({LABEL_TIPO_DIA[tipoEfectivo]})</option>
                        {TIPOS_DIA.map((t) => (
                          <option key={t} value={t}>
                            {LABEL_TIPO_DIA[t]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-sm tabular-nums">{r.horaInicio || '—'}</span>
                    ) : (
                     <TimeField
                        value={r.horaInicio}
                        onChange={(v) => update(idx,{horaInicio:v})}
                        className="w-[9rem]"
                        ariaLabel={'Hora de inicio de la fila ' + (idx + 1)}
                        />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-sm tabular-nums">{r.horaFin || '—'}</span>
                    ) : (
                      <TimeField
                        value={r.horaFin}
                        onChange={(v) => update(idx,{horaFin:v})}
                        className="w-[9rem]"
                        ariaLabel={'Hora de inicio de la fila ' + (idx + 1)}
                        />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatHoras(calc.extraDiurna)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatHoras(calc.extraNocturna)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatHoras(calc.domFestivaDiurna)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatHoras(calc.domFestivaNocturna)}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatHoras(calc.totalHoras)}</td>
                  {!readOnly && (
                    <td className="px-3 py-2 text-right print:hidden">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        aria-label={`Quitar fila ${idx + 1}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 text-sm font-medium text-ink-900">
              <td className="px-3 py-3" colSpan={5}>
                Totales
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totales.extraDiurna)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totales.extraNocturna)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totales.domFestivaDiurna)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totales.domFestivaNocturna)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatHoras(totales.totalHoras)}</td>
              {!readOnly && <td className="px-3 py-3 print:hidden" />}
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between border-t border-outline-variant bg-surface-high px-4 py-3 print:hidden">
          <p className="text-xs text-slate-500">
            El tipo de día se autodetecta con festivos de Colombia. Puedes sobrescribirlo por fila.
          </p>
          <Button variant="secondary" onClick={addRow}>
            + Agregar fila
          </Button>
        </div>
      )}
    </div>
  );
}
