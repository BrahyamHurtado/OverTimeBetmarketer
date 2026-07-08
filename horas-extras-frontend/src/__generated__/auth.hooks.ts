import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { authApi } from '@/pages/auth/auth.api';
import type {
  LoginResponse,
  PerfilUsuario,
  RegistroAuthPayload,
  Rol,
} from '@/shared/types';
import type { ApiError } from '@/shared/apiClient';

export const authKeys = {
  all: ['auth'] as const,
  perfil: (id: string) => [...authKeys.all, 'perfil', id] as const,
  usuarios: (params?: { rol?: Rol; ids?: string[] }) =>
    [...authKeys.all, 'usuarios', params?.rol ?? null, (params?.ids ?? []).slice().sort().join(',')] as const,
};

export function useRegistroMutation() {
  return useMutation<{ id: string; correo: string; rol: Rol }, ApiError, RegistroAuthPayload>({
    mutationKey: [...authKeys.all, 'registro'],
    mutationFn: authApi.registro,
  });
}

export function useLoginMutation() {
  return useMutation<LoginResponse, ApiError, { identificador: string; password: string }>({
    mutationKey: [...authKeys.all, 'login'],
    mutationFn: authApi.login,
  });
}

export function usePerfil(
  id: string | undefined,
  options?: Omit<UseQueryOptions<PerfilUsuario, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PerfilUsuario, ApiError>({
    queryKey: authKeys.perfil(id ?? ''),
    queryFn: () => authApi.perfil(id!),
    enabled: !!id,
    ...options,
  });
}

export function useUsuarios(params?: { rol?: Rol; ids?: string[] }) {
  return useQuery<PerfilUsuario[], ApiError>({
    queryKey: authKeys.usuarios(params),
    queryFn: () => authApi.usuarios(params),
  });
}

export function useActualizarUsuario() {
  const qc = useQueryClient();
  return useMutation<
    PerfilUsuario,
    ApiError,
    { id: string; supervisorId?: string | null; rol?: Rol }
  >({
    mutationKey: [...authKeys.all, 'actualizar'],
    mutationFn: ({ id, ...body }) => authApi.actualizarUsuario(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...authKeys.all, 'usuarios'] }),
  });
}
