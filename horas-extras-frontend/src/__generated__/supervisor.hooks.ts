import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { supervisorApi } from '@/pages/supervisor/supervisor.api';
import { planillaKeys } from './planilla.hooks';
import type {
  Planilla,
  RevisarLotePayload,
  RevisarLoteResponse,
  RevisarPayload,
} from '@/shared/types';
import type { ApiError } from '@/shared/apiClient';

export const supervisorKeys = {
  all: ['supervisor'] as const,
  pendientes: () => [...supervisorKeys.all, 'pendientes'] as const,
};

export function usePendientes(
  options?: Omit<UseQueryOptions<Planilla[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Planilla[], ApiError>({
    queryKey: supervisorKeys.pendientes(),
    queryFn: supervisorApi.pendientes,
    ...options,
  });
}

export function useRevisarPlanilla() {
  const qc = useQueryClient();
  return useMutation<Planilla, ApiError, { id: string; payload: RevisarPayload }>({
    mutationKey: [...supervisorKeys.all, 'revisar'],
    mutationFn: ({ id, payload }) => supervisorApi.revisar(id, payload),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: supervisorKeys.pendientes() });
      qc.invalidateQueries({ queryKey: planillaKeys.detail(p.id) });
    },
  });
}

export function useRevisarLote() {
  const qc = useQueryClient();
  return useMutation<RevisarLoteResponse, ApiError, RevisarLotePayload>({
    mutationKey: [...supervisorKeys.all, 'revisar-lote'],
    mutationFn: (payload) => supervisorApi.revisarLote(payload),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: supervisorKeys.pendientes() });
      for (const id of r.ids) {
        qc.invalidateQueries({ queryKey: planillaKeys.detail(id) });
      }
    },
  });
}
