import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginSchema } from '@sop/shared';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { Button, Field, Input } from '../components/ui';
import { IconLock } from '../components/Icons';

const DEMO = [
  ['hrd@ming.test', 'HRD'],
  ['pic.opr@ming.test', 'PIC SOP'],
  ['manager.opr@ming.test', 'Manager'],
  ['auditor@ming.test', 'Auditor'],
  ['karyawan1.opr@ming.test', 'Karyawan'],
];

export function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('pic.opr@ming.test');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Data tidak valid');
      return;
    }

    setSubmitting(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tidak dapat menghubungi server');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-primary text-[14px] font-medium text-on-primary">
            M
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-medium text-ink">MING SOP Center</p>
            <p className="text-[12px] text-ink-mute">Pengelolaan SOP perusahaan</p>
          </div>
        </div>

        <div className="card p-6">
          <h1 className="text-[22px]">Masuk</h1>
          <p className="mt-1 mb-5 text-[14px] text-ink-mute">
            Gunakan akun perusahaan untuk melihat SOP sesuai peran Anda.
          </p>

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.test"
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <p className="text-[13px] text-ink" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="mt-1 w-full">
              {submitting ? 'Memeriksa…' : 'Masuk'}
              <IconLock className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>

        <div className="mt-4 rounded-lg border border-hairline bg-canvas px-4 py-3">
          <p className="mb-1.5 text-[12px] font-medium text-ink">Akun demo</p>
          <p className="mb-2 text-[12px] text-ink-mute">
            Semua akun memakai password <span className="font-mono">password123</span>.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO.map(([mail, role]) => (
              <button
                key={mail}
                type="button"
                onClick={() => {
                  setEmail(mail);
                  setPassword('password123');
                }}
                className="pill pill-soft hover:border-hairline-strong"
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
