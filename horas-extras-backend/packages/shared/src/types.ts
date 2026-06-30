
export type Rol = 'EMPLEADO' | 'SUPERVISOR' | 'CONTABILIDAD';

export type TipoDia = 'HABIL' | 'NO_HABIL' | 'DOMINICAL_FESTIVO';

export type EstadoPlanilla =
  | 'BORRADOR'
  | 'ENVIADA' 
  | 'APROBADA'
  | 'RECHAZADA'
  | 'PROCESADA';

export interface DesgloseHoras {
  extraDiurna: number;
  extraNocturna: number;
  domFestivaDiurna: number;
  domFestivaNocturna: number;
  totalHoras: number;
}

export interface RegistroHorasInput {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoDia?: TipoDia;
}


export interface PlanillaInput {
  mes: number;
  anio: number;
  observaciones?: string;
  registros: RegistroHorasInput[];
}


export const BANDA_DIURNA = { inicioMin: 6 * 60, finMin: 19 * 60 }; 
