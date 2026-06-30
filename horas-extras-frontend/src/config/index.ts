const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export const config = {
  API_URL,
  AUTH_BASE: `${API_URL}/api/auth`,
  HORAS_BASE: `${API_URL}/api/horas`,
  REPORTES_BASE: `${API_URL}/api/reportes`,
  TOKEN_STORAGE_KEY: 'he.token',
  USER_STORAGE_KEY: 'he.user',
} as const;

export type AppConfig = typeof config;
