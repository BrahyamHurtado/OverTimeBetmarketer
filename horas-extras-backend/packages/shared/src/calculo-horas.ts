import { BANDA_DIURNA, DesgloseHoras, TipoDia } from './types';

const MIN_DIA = 1440;

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error(`Hora inválida: "${hhmm}". Use formato 24h HH:mm.`);
  }
  return h * 60 + m;
}

function solape(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcularDesglose(
  horaInicio: string,
  horaFin: string,
  tipoDia: TipoDia,
): DesgloseHoras {
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

export function sumarDesgloses(items: DesgloseHoras[]): DesgloseHoras {
  return items.reduce<DesgloseHoras>(
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
