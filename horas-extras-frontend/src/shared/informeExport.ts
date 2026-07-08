import * as XLSX from 'xlsx';
import type { InformeGeneralItem } from './types';
import {
  LABEL_ESTADO,
  LABEL_TIPO_DIA,
  formatFechaCorta,
  nombreMes,
} from './format';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function autoWidth(rows: (string | number | null | undefined)[][]) {
  if (rows.length === 0) return [] as { wch: number }[];
  const widths: number[] = new Array(rows[0].length).fill(10);
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = String(cell ?? '').length + 2;
      if (len > widths[i]) widths[i] = len;
    });
  }
  return widths.map((w) => ({ wch: Math.min(w, 40) }));
}

export function exportInformeExcel(
  items: InformeGeneralItem[],
  filename: string,
) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen (todos juntos)
  const resumenHeader = [
    'Empleado',
    'Cédula',
    'Cargo',
    'Dependencia',
    'Periodo',
    'Estado',
    'Supervisor',
    'H. Extra Diurna',
    'H. Extra Nocturna',
    'H. Dom/Fest Diurna',
    'H. Dom/Fest Nocturna',
    'Total Horas',
  ];
  const resumenRows: (string | number)[][] = [resumenHeader];
  let totDiu = 0, totNoc = 0, totDomDiu = 0, totDomNoc = 0, totTotal = 0;
  for (const it of items) {
    resumenRows.push([
      it.empleadoNombre ?? '',
      it.empleadoCedula ?? '',
      it.empleadoCargo ?? '',
      it.empleadoDependencia ?? '',
      `${nombreMes(it.mes)} ${it.anio}`,
      LABEL_ESTADO[it.estado],
      it.supervisorNombre ?? '',
      round2(it.totalExtraDiurna),
      round2(it.totalExtraNocturna),
      round2(it.totalDomDiurna),
      round2(it.totalDomNocturna),
      round2(it.totalHoras),
    ]);
    totDiu += it.totalExtraDiurna;
    totNoc += it.totalExtraNocturna;
    totDomDiu += it.totalDomDiurna;
    totDomNoc += it.totalDomNocturna;
    totTotal += it.totalHoras;
  }
  resumenRows.push([
    'TOTALES', '', '', '', '', '', '',
    round2(totDiu), round2(totNoc), round2(totDomDiu), round2(totDomNoc), round2(totTotal),
  ]);
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = autoWidth(resumenRows);
  wsResumen['!freeze'] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // Hoja 2: Detalle por usuario (hora por hora)
  const detalleHeader = [
    'Empleado',
    'Cédula',
    'Cargo',
    'Periodo',
    'Fecha',
    'Tipo de día',
    'Hora inicio',
    'Hora fin',
    'H. Extra Diurna',
    'H. Extra Nocturna',
    'H. Dom/Fest Diurna',
    'H. Dom/Fest Nocturna',
    'Total horas',
  ];
  const detalleRows: (string | number)[][] = [detalleHeader];
  for (const it of items) {
    if (it.registros.length === 0) {
      detalleRows.push([
        it.empleadoNombre ?? '',
        it.empleadoCedula ?? '',
        it.empleadoCargo ?? '',
        `${nombreMes(it.mes)} ${it.anio}`,
        '',
        'Sin registros',
        '', '', 0, 0, 0, 0, 0,
      ]);
      continue;
    }
    for (const r of it.registros) {
      detalleRows.push([
        it.empleadoNombre ?? '',
        it.empleadoCedula ?? '',
        it.empleadoCargo ?? '',
        `${nombreMes(it.mes)} ${it.anio}`,
        formatFechaCorta(r.fecha),
        LABEL_TIPO_DIA[r.tipoDia],
        r.horaInicio,
        r.horaFin,
        round2(r.extraDiurna),
        round2(r.extraNocturna),
        round2(r.domFestivaDiurna),
        round2(r.domFestivaNocturna),
        round2(r.totalHoras),
      ]);
    }
  }
  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleRows);
  wsDetalle['!cols'] = autoWidth(detalleRows);
  wsDetalle['!freeze'] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle por usuario');

  XLSX.writeFile(wb, filename);
}
