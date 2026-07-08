import { apiClient } from '@/shared/apiClient';
import type { Planilla, RevisarLotePayload, RevisarLoteResponse, RevisarPayload } from '@/shared/types';

export const supervisorApi = {
  pendientes: () => apiClient.get<Planilla[]>('/api/horas/planillas/pendientes'),

  revisar: (id: string, body: RevisarPayload) =>
    apiClient.post<Planilla>(`/api/horas/planillas/${id}/revisar`, body),

  revisarLote: (body: RevisarLotePayload) =>
    apiClient.post<RevisarLoteResponse>('/api/horas/planillas/revisar-lote', body),
};

export type SupervisorApi = typeof supervisorApi;
