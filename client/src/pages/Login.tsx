import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginSchema } from '@sop/shared';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { email: 'hrd@ming.test', role: 'HRD' },
  { email: 'pic.opr@ming.test', role: 'PIC SOP' },
  { email: 'manager.opr@ming.test', role: 'Manager' },
  { email: 'karyawan1.opr@ming.test', role: 'Karyawan' },
  { email: 'auditor@ming.test', role: 'Auditor' },
  { email: 'manajemen@ming.test', role: 'Manajemen' },
];

/** Hanya terima path internal; jangan pernah kembali ke /login (loop). */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  if (value.startsWith('/login')) return '/';
  return value;
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (user) {
    return <Navigate to={safeNext(params.get('next'))} replace />;
  }

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      await login(values.email, values.password);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Tidak dapat masuk. Coba lagi sebentar lagi.',
      );
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            M
          </span>
          <span className="text-sm font-medium">
            MING <span className="font-normal text-muted-foreground">SOP Center</span>
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-xl">Masuk</h1>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            Gunakan akun perusahaan Anda untuk mengakses SOP.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@ming.test"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              ) : null}
            </div>

            {formError ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {formError}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Memproses…' : 'Masuk'}
            </Button>
          </form>
        </div>

        <div className="mt-5 rounded-xl border border-border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Akun demo — password <span className="font-mono">password123</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => {
                  setValue('email', account.email, { shouldValidate: true });
                  setValue('password', 'password123', { shouldValidate: true });
                }}
              >
                {account.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
