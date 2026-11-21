import { FileWarning } from 'lucide-react';
import type { Report } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusPill } from '@/components/common/StatusPill';
import { Skeleton } from '@/components/ui/skeleton';

export function ReportList({
  items,
  selectedId,
  onSelect,
  interactive,
}: {
  items: Report[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Hanya Manager/HRD yang memilih baris untuk membuka panel tindak lanjut. */
  interactive: boolean;
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-[#ededed] bg-card">
      <header className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
        <h2 className="text-[15px] font-medium">Daftar laporan</h2>
        <span className="text-xs text-muted-foreground">{items.length} laporan</span>
      </header>

      <div className="flex-1">
        {items.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState
              icon={FileWarning}
              title="Belum ada laporan"
              description="Laporan yang Anda kirim akan muncul di sini."
            />
          </div>
        ) : (
          <ul>
            {items.map((report) => {
              const selected = interactive && report.id === selectedId;
              const className = cn(
                'block w-full border-t border-[#ededed] px-6 py-4 text-left',
                interactive ? 'cursor-pointer transition-colors hover:bg-secondary/60' : 'cursor-default',
                selected &&
                  'rounded-lg border-transparent bg-[#F0FDF7] shadow-[inset_0_0_0_1px_rgba(62,207,142,0.45)] hover:bg-[#F0FDF7]',
              );

              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm font-medium">{report.description}</p>
                    <StatusPill status={report.status} className="shrink-0" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {report.sop?.code ?? 'Umum'} · {formatDate(report.createdAt)} ·{' '}
                    {report.anonymous ? 'anonim' : (report.reporterName ?? 'pelapor')}
                  </p>
                </>
              );

              return (
                <li key={report.id}>
                  {interactive ? (
                    <button
                      type="button"
                      onClick={() => onSelect(report.id)}
                      aria-current={selected ? 'true' : undefined}
                      className={className}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className={className}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="border-t border-[#ededed] px-6 py-3 text-xs text-muted-foreground">
        Laporan anonim menyembunyikan pelapor dari semua tampilan, termasuk audit log.
      </footer>
    </section>
  );
}

export function ReportListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="rounded-xl border border-[#ededed] bg-card">
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="border-t border-[#ededed] px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3 w-48" />
        </div>
      ))}
    </section>
  );
}
