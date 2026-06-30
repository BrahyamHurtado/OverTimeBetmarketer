import type { EstadoPlanilla, TipoDia } from './types';

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const nombreMes = (mes: number) => MESES[mes - 1] ?? '';

export const formatHoras = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : '—';

export const formatFecha = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

export const formatFechaCorta = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const onlyDate = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const [y, m, d] = onlyDate.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

export const LABEL_TIPO_DIA: Record<TipoDia, string> = {
  HABIL: 'Hábil',
  NO_HABIL: 'No hábil',
  DOMINICAL_FESTIVO: 'Dom/Festivo',
};

export const COLOR_TIPO_DIA: Record<TipoDia, string> = {
  HABIL: 'bg-slate-100 text-slate-700',
  NO_HABIL: 'bg-amber-100 text-amber-800',
  DOMINICAL_FESTIVO: 'bg-rose-100 text-rose-800',
};

export const LABEL_ESTADO: Record<EstadoPlanilla, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  PROCESADA: 'Procesada',
};

export const COLOR_ESTADO: Record<EstadoPlanilla, string> = {
  BORRADOR: 'bg-slate-100 text-slate-700',
  ENVIADA: 'bg-blue-100 text-blue-700',
  APROBADA: 'bg-emerald-100 text-emerald-700',
  RECHAZADA: 'bg-rose-100 text-rose-700',
  PROCESADA: 'bg-violet-100 text-violet-700',
};
