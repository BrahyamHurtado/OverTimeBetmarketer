import { Navigate } from '@modern-js/runtime/router';
import { useAuth } from '@/contexts/AuthContext';
import { homeForRole } from './RoleGuard';

export default function IndexPage() {
  const { isAuthenticated, usuario } = useAuth();
  if (!isAuthenticated || !usuario) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(usuario.rol)} replace />;
}
