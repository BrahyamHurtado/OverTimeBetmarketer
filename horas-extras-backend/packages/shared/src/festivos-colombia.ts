import { TipoDia } from './types';


function pascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function addDias(fecha: Date, dias: number): Date {
  const d = new Date(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

function lunesSiguiente(fecha: Date): Date {
  const dow = fecha.getUTCDay();
  if (dow === 1) return fecha;
  const delta = dow === 0 ? 1 : 8 - dow;
  return addDias(fecha, delta);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

const cacheFestivos = new Map<number, Set<string>>();

export function festivosColombia(anio: number): Set<string> {
  if (cacheFestivos.has(anio)) return cacheFestivos.get(anio)!;

  const fijos = [
    [1, 1],
    [5, 1],
    [7, 20], 
    [8, 7],
    [12, 8],
    [12, 25],
  ];

  const trasladables = [
    [1, 6], 
    [3, 19],
    [6, 29],
    [8, 15],
    [10, 12],
    [11, 1],
    [11, 11],
  ];

  const set = new Set<string>();
  for (const [m, d] of fijos) set.add(iso(new Date(Date.UTC(anio, m - 1, d))));
  for (const [m, d] of trasladables)
    set.add(iso(lunesSiguiente(new Date(Date.UTC(anio, m - 1, d)))));

  const dPascua = pascua(anio);
  set.add(iso(addDias(dPascua, -3))); 
  set.add(iso(addDias(dPascua, -2)));
  set.add(iso(lunesSiguiente(addDias(dPascua, 39))));
  set.add(iso(lunesSiguiente(addDias(dPascua, 60))));
  set.add(iso(lunesSiguiente(addDias(dPascua, 68))));

  cacheFestivos.set(anio, set);
  return set;
}

export function autodetectarTipoDia(fechaISO: string): TipoDia {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  const dow = d.getUTCDay();
  if (dow === 0 || festivosColombia(d.getUTCFullYear()).has(fechaISO)) {
    return 'DOMINICAL_FESTIVO';
  }
  if (dow === 6) return 'NO_HABIL';
  return 'HABIL';
}
