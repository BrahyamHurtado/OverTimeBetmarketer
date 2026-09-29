import { Outlet } from '@modern-js/runtime/router';
import { RoleGuard } from '../RoleGuard';
import { AppShell } from '@/components/AppShell';

export default function EmpleadoLayout() {
  return (
    <RoleGuard roles={['EMPLEADO', 'SUPERVISOR', 'CONTABILIDAD']}>
      <AppShell>
        <Outlet />
      </AppShell>
    </RoleGuard>
  );
}
