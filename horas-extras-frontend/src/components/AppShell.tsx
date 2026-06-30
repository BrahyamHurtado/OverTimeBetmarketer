import { Link, NavLink, useNavigate } from '@modern-js/runtime/router';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/Button';
import type { Rol } from '@/shared/types';
import logo from '@/shared/assets/Logo-betmarketer.png';

const NAV_BY_ROL: Record<Rol, { to: string; label: string; exact?: boolean }[]> = {
  EMPLEADO: [
    { to: '/empleado', label: 'Mis planillas', exact: true },
    { to: '/empleado/planilla', label: 'Nueva planilla' },
  ],
  SUPERVISOR: [
    { to: '/supervisor', label: 'Bandeja', exact: true },
    { to: '/supervisor/equipo', label: 'Mi equipo' },
  ],
  CONTABILIDAD: [
    { to: '/contabilidad', label: 'Informes', exact: true },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  if (!usuario) return null;
  const nav = NAV_BY_ROL[usuario.rol] ?? [];

  return (
    <div className="min-h-full">
      <header
        className="sticky top-0 z-30 border-b border-outline-variant/60 bg-surface/85 backdrop-blur print:hidden"
        data-print="hide"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 bg-white rounded-sm" aria-label="Inicio">
            <img src={logo} alt="Betmarketer" className="h-9 w-auto" />
          </Link>
          <nav className="hidden flex-1 items-center gap-1 sm:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.exact}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary-container text-primary shadow-sm'
                      : 'text-ink-800 hover:bg-surface-high hover:text-ink-900'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-medium text-ink-800">{usuario.nombre}</p>
              <p className="text-slate-500">{rolLabel(usuario.rol)}</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              Salir
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-outline-variant/50 px-4 py-2 sm:hidden">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.exact}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive ? 'bg-accent-soft text-accent' : 'text-ink-700 hover:bg-slate-100'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function rolLabel(rol: Rol) {
  return rol === 'EMPLEADO' ? 'Empleado' : rol === 'SUPERVISOR' ? 'Supervisor' : 'Contabilidad';
}
