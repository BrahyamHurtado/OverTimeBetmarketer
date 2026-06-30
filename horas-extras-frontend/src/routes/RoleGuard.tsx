import { Navigate, useLocation } from '@modern-js/runtime/router';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Rol } from '@/shared/types';

interface RoleGuardProps {
  roles?: Rol[];
  children: ReactNode;
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { isAuthenticated, usuario } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && roles.length > 0 && !roles.includes(usuario.rol)) {
    return <Navigate to={homeForRole(usuario.rol)} replace />;
  }
  return <>{children}</>;
}

export function homeForRole(rol: Rol): string {
  switch (rol) {
    case 'EMPLEADO':
      return '/empleado';
    case 'SUPERVISOR':
      return '/supervisor';
    case 'CONTABILIDAD':
      return '/contabilidad';
  }
}
