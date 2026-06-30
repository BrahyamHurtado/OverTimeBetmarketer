import type { Desglose, RegistroInput, TipoDia, RegistroCalculado } from './types';
import { autodetectarTipoDia } from './festivos';

const BANDA_DIURNA = { inicioMin: 6 * 60, finMin: 19 * 60 };
const MIN_DIA = 1440;

function aMinutos(hhmm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) throw new Error(`Hora inválida "${hhmm}". Use HH:mm.`);
  const h = +m[1];
  const min = +m[2];
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error(`Hora inválida "${hhmm}".`);
  return h * 60 + min;
}

function solape(a1: number, a2: number, b1: number, b2: number) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcularDesglose(
  horaInicio: string,
  horaFin: string,
  tipoDia: TipoDia,
): Desglose {
  let ini = aMinutos(horaInicio);
  let fin = aMinutos(horaFin);
  if (fin <= ini) fin += MIN_DIA;

  let diurnoMin = 0;
  for (let d = 0; d <= 2; d++) {
    diurnoMin += solape(
      ini,
      fin,
      d * MIN_DIA + BANDA_DIURNA.inicioMin,
      d * MIN_DIA + BANDA_DIURNA.finMin,
    );
  }
  const totalMin = fin - ini;
  const nocturnoMin = totalMin - diurnoMin;

  const diurnoH = round2(diurnoMin / 60);
  const nocturnoH = round2(nocturnoMin / 60);
  const totalH = round2(totalMin / 60);

  if (tipoDia === 'DOMINICAL_FESTIVO') {
    return {
      extraDiurna: 0,
      extraNocturna: 0,
      domFestivaDiurna: diurnoH,
      domFestivaNocturna: nocturnoH,
      totalHoras: totalH,
    };
  }
  return {
    extraDiurna: diurnoH,
    extraNocturna: nocturnoH,
    domFestivaDiurna: 0,
    domFestivaNocturna: 0,
    totalHoras: totalH,
  };
}

export function sumarDesgloses(items: Desglose[]): Desglose {
  return items.reduce<Desglose>(
    (acc, x) => ({
      extraDiurna: round2(acc.extraDiurna + x.extraDiurna),
      extraNocturna: round2(acc.extraNocturna + x.extraNocturna),
      domFestivaDiurna: round2(acc.domFestivaDiurna + x.domFestivaDiurna),
      domFestivaNocturna: round2(acc.domFestivaNocturna + x.domFestivaNocturna),
      totalHoras: round2(acc.totalHoras + x.totalHoras),
    }),
    {
      extraDiurna: 0,
      extraNocturna: 0,
      domFestivaDiurna: 0,
      domFestivaNocturna: 0,
      totalHoras: 0,
    },
  );
}

const DESGLOSE_VACIO: Desglose = {
  extraDiurna: 0,
  extraNocturna: 0,
  domFestivaDiurna: 0,
  domFestivaNocturna: 0,
  totalHoras: 0,
};

export function calcularPreview(registros: RegistroInput[]): {
  registros: RegistroCalculado[];
  totales: Desglose;
} {
  const out: RegistroCalculado[] = registros.map((r) => {
    const tipoDia = r.tipoDia ?? (r.fecha ? autodetectarTipoDia(r.fecha) : 'HABIL');
    if (!r.fecha || !/^\d{2}:\d{2}$/.test(r.horaInicio) || !/^\d{2}:\d{2}$/.test(r.horaFin)) {
      return {
        fecha: r.fecha ?? '',
        horaInicio: r.horaInicio ?? '',
        horaFin: r.horaFin ?? '',
        tipoDia,
        ...DESGLOSE_VACIO,
      };
    }
    try {
      const d = calcularDesglose(r.horaInicio, r.horaFin, tipoDia);
      return {
        fecha: r.fecha,
        horaInicio: r.horaInicio,
        horaFin: r.horaFin,
        tipoDia,
        ...d,
      };
    } catch {
      return {
        fecha: r.fecha,
        horaInicio: r.horaInicio,
        horaFin: r.horaFin,
        tipoDia,
        ...DESGLOSE_VACIO,
      };
    }
  });
  const totales = sumarDesgloses(out);
  return { registros: out, totales };
}
