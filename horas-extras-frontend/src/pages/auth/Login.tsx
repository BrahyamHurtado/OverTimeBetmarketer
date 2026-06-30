import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@modern-js/runtime/router';
import { useLoginMutation } from '@/__generated__/auth.hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { homeForRole } from '@/routes/RoleGuard';
import logo from '@/shared/assets/Logo-betmarketer.png';

export default function Login() {
  const { login, isAuthenticated, usuario } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const mutation = useLoginMutation();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated && usuario) navigate(homeForRole(usuario.rol), { replace: true });
  }, [isAuthenticated, usuario, navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo || !password) {
      toast.error('Ingresa correo y contraseña');
      return;
    }
    mutation.mutate(
      { correo, password },
      {
        onSuccess: (data) => {
          login(data.token, data.usuario);
          toast.success(`Bienvenido, ${data.usuario.nombre}`);
          navigate(homeForRole(data.usuario.rol), { replace: true });
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-100 px-4 py-10">
      <div className="card w-full max-w-md p-8">
        <img src={logo} alt="" className='bg-white h-auto w-auto mb-5 rounded-sm'/>
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-accent">Horas Extras</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-slate-600">
            Accede con tus credenciales corporativas.
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            placeholder="nombre@empresa.com"
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Button type="submit" loading={mutation.isPending} className="mt-2">
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-accent hover:text-accent-hover">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
