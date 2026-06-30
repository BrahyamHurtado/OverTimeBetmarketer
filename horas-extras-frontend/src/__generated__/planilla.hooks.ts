import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { planillaApi } from '@/pages/planilla/planilla.api';
import type { CalculoResponse, Planilla, PlanillaInput } from '@/shared/types';
import type { ApiError } from '@/shared/apiClient';

export const planillaKeys = {
  all: ['planilla'] as const,
  list: () => [...planillaKeys.all, 'list'] as const,
  detail: (id: string) => [...planillaKeys.all, 'detail', id] as const,
};

export function useMisPlanillas(
  options?: Omit<UseQueryOptions<Planilla[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Planilla[], ApiError>({
    queryKey: planillaKeys.list(),
    queryFn: planillaApi.listar,
    ...options,
  });
}

export function usePlanilla(
  id: string | undefined,
  options?: Omit<UseQueryOptions<Planilla, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Planilla, ApiError>({
    queryKey: planillaKeys.detail(id ?? ''),
    queryFn: () => planillaApi.detalle(id!),
    enabled: !!id,
    ...options,
  });
}

export function useCalcularPreview() {
  return useMutation<CalculoResponse, ApiError, PlanillaInput>({
    mutationKey: [...planillaKeys.all, 'calcular'],
    mutationFn: planillaApi.calcular,
  });
}

export function useGuardarPlanilla() {
  const qc = useQueryClient();
  return useMutation<Planilla, ApiError, PlanillaInput>({
    mutationKey: [...planillaKeys.all, 'guardar'],
    mutationFn: planillaApi.guardar,
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: planillaKeys.list() });
      qc.setQueryData(planillaKeys.detail(p.id), p);
    },
  });
}

export function useEnviarPlanilla() {
  const qc = useQueryClient();
  return useMutation<Planilla, ApiError, string>({
    mutationKey: [...planillaKeys.all, 'enviar'],
    mutationFn: planillaApi.enviar,
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: planillaKeys.list() });
      qc.setQueryData(planillaKeys.detail(p.id), p);
    },
  });
}
