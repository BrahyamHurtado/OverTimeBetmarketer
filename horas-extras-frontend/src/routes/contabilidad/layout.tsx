import { Outlet } from '@modern-js/runtime/router';
import { RoleGuard } from '../RoleGuard';
import { AppShell } from '@/components/AppShell';

export default function ContabilidadLayout() {
  return (
    <RoleGuard roles={['CONTABILIDAD']}>
      <AppShell>
        <Outlet />
      </AppShell>
    </RoleGuard>
  );
}
