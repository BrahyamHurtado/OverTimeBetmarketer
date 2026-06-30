import { apiClient } from '@/shared/apiClient';
import type {
  EventoPlanilla,
  InformeEmpleadoResponse,
  InformeGeneralResponse,
} from '@/shared/types';

export const contabilidadApi = {
  general: (mes: number | undefined, anio: number) =>
    apiClient.get<InformeGeneralResponse>('/api/reportes/general', {
      query: { mes, anio },
    }),

  empleado: (empleadoId: string) =>
    apiClient.get<InformeEmpleadoResponse>(`/api/reportes/empleado/${empleadoId}`),

  trazabilidad: (planillaId: string) =>
    apiClient.get<EventoPlanilla[]>(`/api/reportes/trazabilidad/${planillaId}`),

  procesar: (ids: string[]) =>
    apiClient.post<{ procesadas: number }>('/api/reportes/procesar', { ids }),
};

export type ContabilidadApi = typeof contabilidadApi;
