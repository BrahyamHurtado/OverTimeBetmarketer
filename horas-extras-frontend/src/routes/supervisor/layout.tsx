import { Outlet } from '@modern-js/runtime/router';
import { RoleGuard } from '../RoleGuard';
import { AppShell } from '@/components/AppShell';

export default function SupervisorLayout() {
  return (
    <RoleGuard roles={['SUPERVISOR']}>
      <AppShell>
        <Outlet />
      </AppShell>
    </RoleGuard>
  );
}
