import { AlertTriangle, RotateCw } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Terjadi kesalahan saat memuat data.';

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="size-4 text-destructive" aria-hidden />
        Gagal memuat
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="size-3.5" aria-hidden />
          Coba lagi
        </Button>
      ) : null}
    </div>
  );
}
