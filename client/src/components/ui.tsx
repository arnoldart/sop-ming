import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { STATUS_LABEL } from '../lib/format';
import { IconAlert, IconCheck } from './Icons';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }) {
  return <button className={`btn btn-${variant} ${className}`} {...props} />;
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[13px] text-ink-mute">{hint}</p>}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-[13px] text-ink" role="alert">
          <IconAlert className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...props} />;
}

/** Status pill: emerald hanya untuk status final yang positif, sisanya monokrom. */
export function StatusPill({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;

  if (status === 'PUBLISHED' || status === 'RESOLVED') {
    return (
      <span className="pill pill-primary">
        <IconCheck className="h-3 w-3" />
        {label}
      </span>
    );
  }
  if (status === 'APPROVED') {
    return <span className="pill border-transparent bg-ink text-canvas">{label}</span>;
  }
  if (status === 'IN_REVIEW' || status === 'INVESTIGATING' || status === 'TRIAGED') {
    return <span className="pill border-hairline-strong text-ink">{label}</span>;
  }
  if (status === 'SUPERSEDED' || status === 'ARCHIVED' || status === 'CLOSED') {
    return <span className="pill pill-soft text-ink-mute-2">{label}</span>;
  }
  return <span className="pill pill-soft">{label}</span>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[14px] text-ink-mute">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Memuat' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-6 py-10 text-[14px] text-ink-mute" role="status">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-hairline-strong border-t-ink" />
      {label}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-md border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink"
      role="alert"
    >
      <IconAlert className="mt-0.5 h-4 w-4 text-ink-mute" />
      <span>{message}</span>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1>{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[15px] text-ink-mute">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline-cool" aria-hidden="true">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
      <h2 className="text-[15px] font-medium text-ink">{children}</h2>
      {action}
    </div>
  );
}
