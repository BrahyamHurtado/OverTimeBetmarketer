import { describe, it, expect } from 'vitest';
import { calcularDesglose, sumarDesgloses } from '../src/calculo-horas';
import { autodetectarTipoDia } from '../src/festivos-colombia';

describe('calcularDesglose', () => {
  it('turno diurno completo', () => {
    const r = calcularDesglose('08:00', '10:00', 'HABIL');
    expect(r.extraDiurna).toBe(2);
    expect(r.extraNocturna).toBe(0);
  });

  it('turno nocturno que cruza medianoche', () => {
    const r = calcularDesglose('22:00', '02:00', 'HABIL');
    expect(r.extraNocturna).toBe(4);
    expect(r.extraDiurna).toBe(0);
  });

  it('turno mixto en la frontera de las 19:00', () => {
    const r = calcularDesglose('17:00', '21:00', 'HABIL');
    expect(r.extraDiurna).toBe(2);
    expect(r.extraNocturna).toBe(2);
  });

  it('enruta a buckets dominicales/festivos', () => {
    const r = calcularDesglose('09:00', '13:00', 'DOMINICAL_FESTIVO');
    expect(r.domFestivaDiurna).toBe(4);
    expect(r.extraDiurna).toBe(0);
  });

  it('rechaza horas inválidas', () => {
    expect(() => calcularDesglose('25:00', '26:00', 'HABIL')).toThrow();
  });
});

describe('sumarDesgloses', () => {
  it('suma subtotales', () => {
    const total = sumarDesgloses([
      calcularDesglose('08:00', '10:00', 'HABIL'),
      calcularDesglose('20:00', '22:00', 'HABIL'),
    ]);
    expect(total.extraDiurna).toBe(2);
    expect(total.extraNocturna).toBe(2);
    expect(total.totalHoras).toBe(4);
  });
});

describe('autodetectarTipoDia', () => {
  it('detecta festivo (1 de enero 2026)', () => {
    expect(autodetectarTipoDia('2026-01-01')).toBe('DOMINICAL_FESTIVO');
  });
  it('detecta sábado como no hábil', () => {
    expect(autodetectarTipoDia('2026-06-20')).toBe('NO_HABIL');
  });
  it('detecta día hábil', () => {
    expect(autodetectarTipoDia('2026-06-17')).toBe('HABIL');
  });
});
