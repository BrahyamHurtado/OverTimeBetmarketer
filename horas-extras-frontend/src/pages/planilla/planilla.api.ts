import { apiClient } from '@/shared/apiClient';
import type { CalculoResponse, Planilla, PlanillaInput } from '@/shared/types';

export const planillaApi = {
  calcular: (body: PlanillaInput) =>
    apiClient.post<CalculoResponse>('/api/horas/planillas/calcular', body),

  guardar: (body: PlanillaInput) => apiClient.post<Planilla>('/api/horas/planillas', body),

  enviar: (id: string) => apiClient.post<Planilla>(`/api/horas/planillas/${id}/enviar`),

  listar: () => apiClient.get<Planilla[]>('/api/horas/planillas'),

  detalle: (id: string) => apiClient.get<Planilla>(`/api/horas/planillas/${id}`),
};

export type PlanillaApi = typeof planillaApi;
