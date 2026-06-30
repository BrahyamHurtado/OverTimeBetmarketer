import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@modern-js/runtime/router';
import { useRegistroMutation } from '@/__generated__/auth.hooks';
import { useToast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface FormState {
  nombre: string;
  cedula: string;
  correo: string;
  password: string;
  confirmPassword: string;
  cargo: string;
  dependencia: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const INITIAL: FormState = {
  nombre: '',
  cedula: '',
  correo: '',
  password: '',
  confirmPassword: '',
  cargo: '',
  dependencia: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CEDULA_RE = /^\d{5,15}$/;
const trimOrUndef = (s: string) => {
  const t = s.trim();
  return t ? t : undefined;
};

function validate(f: FormState): Errors {
  const errors: Errors = {};
  if (!f.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
  else if (f.nombre.trim().length < 3) errors.nombre = 'Mínimo 3 caracteres';

  if (!f.cedula.trim()) errors.cedula = 'La cédula es obligatoria';
  else if (!CEDULA_RE.test(f.cedula.trim())) errors.cedula = 'Solo dígitos (5–15)';

  if (!f.correo.trim()) errors.correo = 'El correo es obligatorio';
  else if (!EMAIL_RE.test(f.correo.trim())) errors.correo = 'Correo no válido';

  if (!f.password) errors.password = 'La contraseña es obligatoria';
  else if (f.password.length < 8) errors.password = 'Mínimo 8 caracteres';
  else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password))
    errors.password = 'Debe combinar letras y números';

  if (!f.confirmPassword) errors.confirmPassword = 'Confirma tu contraseña';
  else if (f.password && f.confirmPassword !== f.password)
    errors.confirmPassword = 'Las contraseñas no coinciden';

  return errors;
}

type StrengthScore = 0 | 1 | 2 | 3 | 4;

function passwordStrength(pwd: string): { score: StrengthScore; label: string } {
  let n = 0;
  if (pwd.length >= 8) n++;
  if (pwd.length >= 12) n++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) n++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) n++;
  const score = Math.min(4, n) as StrengthScore;
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'] as const;
  return { score, label: labels[score] };
}

export default function Registro() {
  const navigate = useNavigate();
  const toast = useToast();
  const mutation = useRegistroMutation();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validate(form), [form]);
  const strength = useMemo(() => passwordStrength(form.password), [form.password]);
  const showError = (k: keyof FormState) => (touched[k] || submitted) && errors[k];

  const update = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const onBlur = (k: keyof FormState) => () => setTouched((t) => ({ ...t, [k]: true }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      toast.error('Revisa los campos marcados');
      return;
    }
    mutation.mutate(
      {
        nombre: form.nombre.trim(),
        cedula: form.cedula.trim(),
        correo: form.correo.trim().toLowerCase(),
        password: form.password,
        cargo: trimOrUndef(form.cargo),
        dependencia: trimOrUndef(form.dependencia),
      },
      {
        onSuccess: () => {
          toast.success('Cuenta creada. Inicia sesión.');
          navigate('/login', { replace: true });
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const strengthColors = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-500'];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="card w-full max-w-lg p-8">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Horas Extras</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900">Crear cuenta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tu cuenta se crea como <strong className="text-ink-900">EMPLEADO</strong>. Un administrador puede cambiar el rol después.
          </p>
        </header>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          <Input
            label="Nombre completo *"
            value={form.nombre}
            onChange={update('nombre')}
            onBlur={onBlur('nombre')}
            error={showError('nombre')}
            autoComplete="name"
            className="sm:col-span-2"
          />
          <Input
            label="Cédula *"
            value={form.cedula}
            onChange={update('cedula')}
            onBlur={onBlur('cedula')}
            error={showError('cedula')}
            inputMode="numeric"
            autoComplete="off"
          />
          <Input
            label="Correo *"
            type="email"
            value={form.correo}
            onChange={update('correo')}
            onBlur={onBlur('correo')}
            error={showError('correo')}
            autoComplete="email"
            placeholder="nombre@empresa.com"
          />
          <div className="sm:col-span-2">
            <Input
              label="Contraseña *"
              type="password"
              value={form.password}
              onChange={update('password')}
              onBlur={onBlur('password')}
              error={showError('password')}
              autoComplete="new-password"
              hint={!showError('password') ? 'Mínimo 8 caracteres, con letras y números' : undefined}
            />
            {form.password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-1.5 flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full ${i < strength.score ? strengthColors[strength.score] : 'bg-outline-variant'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500">{strength.label}</span>
              </div>
            )}
            <Input
            label="Confirmar contraseña *"
            type="password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            onBlur={onBlur('confirmPassword')}
            error={showError('confirmPassword')}
            autoComplete="new-password"
            className="sm:col-span-2"
          />
          </div>
          <Input label="Cargo" value={form.cargo} onChange={update('cargo')} />
          <Input label="Dependencia" value={form.dependencia} onChange={update('dependencia')} />

          <p className="text-xs text-slate-500 sm:col-span-2">
            Tu supervisor / jefe inmediato lo asigna el administrador después de crear tu cuenta.
          </p>

          <Button type="submit" loading={mutation.isPending} className="sm:col-span-2">
            Crear cuenta
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-secondary">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
