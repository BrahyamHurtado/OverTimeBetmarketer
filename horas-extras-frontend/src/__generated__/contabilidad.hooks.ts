
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { contabilidadApi } from '@/pages/contabilidad/contabilidad.api';
import type {
  EventoPlanilla,
  InformeEmpleadoResponse,
  InformeGeneralResponse,
} from '@/shared/types';
import type { ApiError } from '@/shared/apiClient';

export const contabilidadKeys = {
  all: ['contabilidad'] as const,
  general: (mes: number | undefined, anio: number) =>
    [...contabilidadKeys.all, 'general', mes ?? null, anio] as const,
  empleado: (id: string) => [...contabilidadKeys.all, 'empleado', id] as const,
  trazabilidad: (id: string) => [...contabilidadKeys.all, 'trazabilidad', id] as const,
};

export function useInformeGeneral(
  mes: number | undefined,
  anio: number,
  options?: Omit<UseQueryOptions<InformeGeneralResponse, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<InformeGeneralResponse, ApiError>({
    queryKey: contabilidadKeys.general(mes, anio),
    queryFn: () => contabilidadApi.general(mes, anio),
    ...options,
  });
}

export function useInformeEmpleado(
  id: string | undefined,
  options?: Omit<UseQueryOptions<InformeEmpleadoResponse, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<InformeEmpleadoResponse, ApiError>({
    queryKey: contabilidadKeys.empleado(id ?? ''),
    queryFn: () => contabilidadApi.empleado(id!),
    enabled: !!id,
    ...options,
  });
}

export function useTrazabilidad(
  id: string | undefined,
  options?: Omit<UseQueryOptions<EventoPlanilla[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<EventoPlanilla[], ApiError>({
    queryKey: contabilidadKeys.trazabilidad(id ?? ''),
    queryFn: () => contabilidadApi.trazabilidad(id!),
    enabled: !!id,
    ...options,
  });
}

export function useProcesarPlanillas() {
  const qc = useQueryClient();
  return useMutation<{ procesadas: number }, ApiError, string[]>({
    mutationKey: [...contabilidadKeys.all, 'procesar'],
    mutationFn: contabilidadApi.procesar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contabilidadKeys.all });
    },
  });
}

export function useRechazarPlanillas() {
  const qc = useQueryClient();
  return useMutation<
    { rechazadas: number; omitidas: number; ids: string[] },
    ApiError,
    { ids: string[]; motivoRechazo: string }
  >({
    mutationKey: [...contabilidadKeys.all, 'rechazar'],
    mutationFn: contabilidadApi.rechazar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contabilidadKeys.all });
    },
  });
}
