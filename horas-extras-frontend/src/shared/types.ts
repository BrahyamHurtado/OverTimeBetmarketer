export type Rol = 'EMPLEADO' | 'SUPERVISOR' | 'CONTABILIDAD';

export type TipoDia = 'HABIL' | 'NO_HABIL' | 'DOMINICAL_FESTIVO';

export type EstadoPlanilla =
  | 'BORRADOR'
  | 'ENVIADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'PROCESADA';

export interface Desglose {
  extraDiurna: number;
  extraNocturna: number;
  domFestivaDiurna: number;
  domFestivaNocturna: number;
  totalHoras: number;
}

export interface RegistroInput {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoDia?: TipoDia;
}

export interface RegistroCalculado extends Desglose {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoDia: TipoDia;
}

export interface PlanillaInput {
  mes: number;
  anio: number;
  observaciones?: string;
  registros: RegistroInput[];
}

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}

export interface PerfilUsuario {
  id: string;
  nombre: string;
  cedula: string;
  correo: string;
  cargo: string | null;
  dependencia: string | null;
  supervisorId: string | null;
  rol: Rol;
}

export interface Planilla {
  id: string;
  empleadoId: string;
  supervisorId: string | null;
  mes: number;
  anio: number;
  estado: EstadoPlanilla;
  observaciones: string | null;
  empleadoNombre: string | null;
  empleadoCedula: string | null;
  empleadoCargo: string | null;
  empleadoDependencia: string | null;
  supervisorNombre: string | null;
  enviadaAt: string | null;
  revisadaAt: string | null;
  revisadaPor: string | null;
  firmaEmpleadoUrl: string | null;
  firmaSupervisorUrl: string | null;
  motivoRechazo: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  registros?: RegistroPersistido[];
  eventos?: EventoPlanilla[];
}

export interface RegistroPersistido {
  id: string;
  planillaId: string;
  fecha: string;
  tipoDia: TipoDia;
  horaInicio: string;
  horaFin: string;
  extraDiurna: number;
  extraNocturna: number;
  domFestivaDiurna: number;
  domFestivaNocturna: number;
  totalHoras: number;
}

export interface EventoPlanilla {
  id: string;
  planillaId: string;
  tipo: 'CREADA' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA' | 'EDITADA' | 'PROCESADA';
  actorId: string;
  detalle: string | null;
  createdAt: string;
}

export interface CalculoResponse {
  registros: RegistroCalculado[];
  totales: Desglose;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioSesion;
}

export interface RegistroAuthPayload {
  nombre: string;
  cedula: string;
  correo: string;
  password: string;
  cargo?: string;
  dependencia?: string;
  supervisorId?: string;
}

export interface RevisarPayload {
  aprobar: boolean;
  motivoRechazo?: string;
  firmaSupervisorUrl?: string;
}

export interface RevisarLotePayload {
  ids: string[];
  aprobar: boolean;
  motivoRechazo?: string;
  firmaSupervisorUrl?: string;
}

export interface RevisarLoteResponse {
  procesadas: number;
  omitidas: number;
  ids: string[];
}

export interface InformeGeneralItem {
  planillaId: string;
  empleadoId: string;
  empleadoNombre: string | null;
  empleadoCedula: string | null;
  empleadoCargo: string | null;
  empleadoDependencia: string | null;
  supervisorId: string | null;
  supervisorNombre: string | null;
  firmaSupervisorUrl: string | null;
  estado: EstadoPlanilla;
  revisadaAt: string | null;
  mes: number;
  anio: number;
  totalExtraDiurna: number;
  totalExtraNocturna: number;
  totalDomDiurna: number;
  totalDomNocturna: number;
  totalHoras: number;
  registros: Array<{
    id: string;
    fecha: string;
    tipoDia: TipoDia;
    horaInicio: string;
    horaFin: string;
    extraDiurna: number;
    extraNocturna: number;
    domFestivaDiurna: number;
    domFestivaNocturna: number;
    totalHoras: number;
  }>;
}

export interface InformeGeneralResponse {
  periodo: { mes?: number; anio: number };
  totalPlanillas: number;
  porEmpleado: InformeGeneralItem[];
}

export interface InformeEmpleadoResponse {
  empleadoId: string;
  planillas: Planilla[];
}
