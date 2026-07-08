import { apiClient } from '@/shared/apiClient';
import type {
  LoginResponse,
  PerfilUsuario,
  RegistroAuthPayload,
  Rol,
} from '@/shared/types';

export const authApi = {
  registro: (body: RegistroAuthPayload) =>
    apiClient.post<{ id: string; correo: string; rol: Rol }>(
      '/api/auth/registro',
      body,
      { auth: false },
    ),

  login: (body: { identificador: string; password: string }) =>
    apiClient.post<LoginResponse>('/api/auth/login', body, { auth: false }),

  perfil: (id: string) => apiClient.get<PerfilUsuario>(`/api/auth/perfil/${id}`),

  usuarios: (params?: { rol?: Rol; ids?: string[] }) =>
    apiClient.get<PerfilUsuario[]>('/api/auth/usuarios', {
      query: {
        rol: params?.rol,
        ids: params?.ids?.join(','),
      },
    }),

  actualizarUsuario: (
    id: string,
    body: { supervisorId?: string | null; rol?: Rol },
  ) => apiClient.patch<PerfilUsuario>(`/api/auth/usuarios/${id}`, body),
};

export type AuthApi = typeof authApi;
