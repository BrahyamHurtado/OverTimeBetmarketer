import type { InformeGeneralItem } from './types';
import {
  LABEL_ESTADO,
  LABEL_TIPO_DIA,
  formatFechaCorta,
  formatHoras,
  nombreMes,
} from './format';

export type InformePrintItem = InformeGeneralItem & {
  observaciones?: string | null;
  firmaEmpleadoUrl?: string | null;
  correo?: string | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 24px;
    font-size: 12px;
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #0f172a; page-break-after: avoid; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
  .header .meta { text-align: right; font-size: 11px; color: #475569; }
  .subtitle { color: #475569; font-size: 12px; margin: 0; }
  .empleado-card { page-break-inside: avoid; break-inside: avoid; margin-bottom: 24px; }
  .empleado-info { background: #f1f5f9; padding: 10px 12px; border-left: 4px solid #0f172a; margin-bottom: 8px; }
  .empleado-info .nombre { font-weight: 600; font-size: 14px; }
  .empleado-info .datos { color: #475569; font-size: 11px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
  th { background: #e2e8f0; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td { background: #f1f5f9; font-weight: 600; }
  .totales-fila td { background: #0f172a; color: #fff; font-weight: 600; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .badge-habil { background: #e2e8f0; color: #334155; }
  .badge-no-habil { background: #fef3c7; color: #92400e; }
  .badge-festivo { background: #fee2e2; color: #991b1b; }
  .resumen-global { margin-bottom: 20px; }
  .observaciones { margin-top: 12px; page-break-inside: avoid; }
  .observaciones .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; margin: 0 0 4px; }
  .observaciones .contenido { border: 1px solid #cbd5e1; padding: 8px 10px; min-height: 32px; white-space: pre-wrap; margin: 0; font-size: 11px; }
  .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; page-break-inside: avoid; }
  .firma { text-align: center; }
  .firma img { max-height: 60px; max-width: 200px; object-fit: contain; display: block; margin: 0 auto 4px; }
  .firma-espacio { height: 60px; }
  .firma-linea { border-top: 1px solid #0f172a; margin: 0; }
  .firma-label { font-size: 10px; margin: 4px 0 0; color: #0f172a; }
  .firma-sub { font-size: 9px; color: #64748b; margin: 2px 0 0; }
  @media print {
    body { padding: 12px; }
    .empleado-card { page-break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
  }
`;

function badgeTipoDia(tipo: 'HABIL' | 'NO_HABIL' | 'DOMINICAL_FESTIVO'): string {
  const cls =
    tipo === 'HABIL' ? 'badge-habil' :
    tipo === 'NO_HABIL' ? 'badge-no-habil' :
    'badge-festivo';
  return `<span class="badge ${cls}">${LABEL_TIPO_DIA[tipo]}</span>`;
}

function renderEmpleadoTabla(item: InformePrintItem): string {
  const filas = item.registros.length === 0
    ? `<tr><td colspan="9" style="text-align:center; color:#64748b; padding: 12px;">Sin registros en el periodo</td></tr>`
    : item.registros.map((r) => `
      <tr>
        <td>${formatFechaCorta(r.fecha)}</td>
        <td>${badgeTipoDia(r.tipoDia)}</td>
        <td class="num">${r.horaInicio}</td>
        <td class="num">${r.horaFin}</td>
        <td class="num">${formatHoras(r.extraDiurna)}</td>
        <td class="num">${formatHoras(r.extraNocturna)}</td>
        <td class="num">${formatHoras(r.domFestivaDiurna)}</td>
        <td class="num">${formatHoras(r.domFestivaNocturna)}</td>
        <td class="num"><strong>${formatHoras(r.totalHoras)}</strong></td>
      </tr>
    `).join('');

  const datosLinea = [
    item.empleadoCedula ? `CC ${item.empleadoCedula}` : null,
    item.empleadoCargo,
    item.empleadoDependencia,
  ].filter((v): v is string => Boolean(v)).map(escapeHtml).join(' · ');

  return `
    <div class="empleado-card">
      <div class="empleado-info">
        <div class="nombre">${escapeHtml(item.empleadoNombre ?? 'Sin nombre')}</div>
        <div class="datos">${datosLinea || '—'}</div>
        <div class="datos">
          Periodo: <strong>${nombreMes(item.mes)} ${item.anio}</strong>
          · Estado: <strong>${LABEL_ESTADO[item.estado]}</strong>
          ${item.supervisorNombre ? `· Supervisor: <strong>${escapeHtml(item.supervisorNombre)}</strong>` : ''}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo día</th>
            <th class="num">Inicio</th>
            <th class="num">Fin</th>
            <th class="num">Extra Diurna</th>
            <th class="num">Extra Nocturna</th>
            <th class="num">Dom/Fest Diu</th>
            <th class="num">Dom/Fest Noc</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
        <tfoot>
          <tr>
            <td colspan="4">Totales del periodo</td>
            <td class="num">${formatHoras(item.totalExtraDiurna)}</td>
            <td class="num">${formatHoras(item.totalExtraNocturna)}</td>
            <td class="num">${formatHoras(item.totalDomDiurna)}</td>
            <td class="num">${formatHoras(item.totalDomNocturna)}</td>
            <td class="num"><strong>${formatHoras(item.totalHoras)}</strong></td>
          </tr>
        </tfoot>
      </table>
      ${item.observaciones ? `
        <div class="observaciones">
          <p class="label">Observaciones</p>
          <p class="contenido">${escapeHtml(item.observaciones)}</p>
        </div>
      ` : ''}
      <div class="firmas">
        <div class="firma">
          ${item.firmaEmpleadoUrl ? `<img src="${escapeHtml(item.firmaEmpleadoUrl)}" alt="Firma del empleado" />` : '<div class="firma-espacio"></div>'}
          <div class="firma-linea"></div>
          <p class="firma-label">Firma del servidor</p>
          <p class="firma-sub">${escapeHtml(item.empleadoNombre ?? '')}</p>
        </div>
        <div class="firma">
          ${item.firmaSupervisorUrl ? `<img src="${escapeHtml(item.firmaSupervisorUrl)}" alt="Firma del supervisor" />` : '<div class="firma-espacio"></div>'}
          <div class="firma-linea"></div>
          <p class="firma-label">Firma del jefe inmediato</p>
          <p class="firma-sub">${escapeHtml(item.supervisorNombre ?? '')}</p>
        </div>
      </div>
    </div>
  `;
}

function renderResumenGlobal(items: InformeGeneralItem[]): string {
  if (items.length <= 1) return '';
  let tDiu = 0, tNoc = 0, tDomDiu = 0, tDomNoc = 0, tTotal = 0;
  const filas = items.map((it) => {
    tDiu += it.totalExtraDiurna;
    tNoc += it.totalExtraNocturna;
    tDomDiu += it.totalDomDiurna;
    tDomNoc += it.totalDomNocturna;
    tTotal += it.totalHoras;
    return `
      <tr>
        <td>${escapeHtml(it.empleadoNombre ?? '—')}</td>
        <td>${escapeHtml(it.empleadoCedula ?? '—')}</td>
        <td>${nombreMes(it.mes)} ${it.anio}</td>
        <td class="num">${formatHoras(it.totalExtraDiurna)}</td>
        <td class="num">${formatHoras(it.totalExtraNocturna)}</td>
        <td class="num">${formatHoras(it.totalDomDiurna)}</td>
        <td class="num">${formatHoras(it.totalDomNocturna)}</td>
        <td class="num"><strong>${formatHoras(it.totalHoras)}</strong></td>
      </tr>
    `;
  }).join('');

  return `
    <section class="resumen-global">
      <h2>Resumen general</h2>
      <table>
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Cédula</th>
            <th>Periodo</th>
            <th class="num">Extra Diurna</th>
            <th class="num">Extra Nocturna</th>
            <th class="num">Dom/Fest Diu</th>
            <th class="num">Dom/Fest Noc</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
        <tfoot>
          <tr class="totales-fila">
            <td colspan="3">TOTALES</td>
            <td class="num">${formatHoras(tDiu)}</td>
            <td class="num">${formatHoras(tNoc)}</td>
            <td class="num">${formatHoras(tDomDiu)}</td>
            <td class="num">${formatHoras(tDomNoc)}</td>
            <td class="num">${formatHoras(tTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  `;
}

export function printInforme(params: {
  items: InformePrintItem[];
  titulo: string;
  subtitulo?: string;
}) {
  const { items, titulo, subtitulo } = params;
  if (items.length === 0) return;

  const fechaImpresion = new Date().toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(titulo)}</title>
        <style>${PRINT_STYLES}</style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${escapeHtml(titulo)}</h1>
            ${subtitulo ? `<p class="subtitle">${escapeHtml(subtitulo)}</p>` : ''}
          </div>
          <div class="meta">
            <div>Generado: ${escapeHtml(fechaImpresion)}</div>
            <div>Empleados: ${items.length}</div>
          </div>
        </div>
        ${renderResumenGlobal(items)}
        <h2>Detalle por empleado</h2>
        ${items.map(renderEmpleadoTabla).join('')}
        <script>
          window.addEventListener('load', () => {
            setTimeout(() => { window.print(); }, 250);
          });
        </script>
      </body>
    </html>
  `;

  const w = window.open('', '_blank', 'width=1024,height=768');
  if (!w) {
    alert('No se pudo abrir la ventana de impresión. Verifica que el navegador permita ventanas emergentes.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
