import { Link } from '@modern-js/runtime/router';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface p-8 text-center shadow-card">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Error 404</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">Página no encontrada</h1>
        <p className="mt-2 text-sm text-slate-600">La ruta que intentas abrir no existe.</p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-secondary-container px-4 py-2 text-sm font-medium text-white hover:bg-secondary-hover">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
