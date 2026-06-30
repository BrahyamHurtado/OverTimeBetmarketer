import { apiClient } from '@/shared/apiClient';
import type { Planilla, RevisarPayload } from '@/shared/types';

export const supervisorApi = {
  pendientes: () => apiClient.get<Planilla[]>('/api/horas/planillas/pendientes'),

  revisar: (id: string, body: RevisarPayload) =>
    apiClient.post<Planilla>(`/api/horas/planillas/${id}/revisar`, body),
};

export type SupervisorApi = typeof supervisorApi;
