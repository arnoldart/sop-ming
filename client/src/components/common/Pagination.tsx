import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Paginasi ringkas mengikuti frame desain: teks "Menampilkan n dari m" di kiri,
 * grup tombol berbingkai di kanan. Dipakai Daftar SOP dan Audit Log.
 */
export function Pagination({
  page,
  limit,
  total,
  noun = 'entri',
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  noun?: string;
  onPageChange: (page: number) => void;
}) {
  const lastPage = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const shown = Math.max(0, to - from + 1);

  return (
    <div className="flex items-center justify-between gap-3 px-1 text-[13px] text-muted-foreground">
      <span>
        Menampilkan {shown} dari {total} {noun}
      </span>

      <div className="flex items-center overflow-hidden rounded-lg border border-[#ededed] bg-background">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
          className="grid size-8 place-items-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span
          aria-current="page"
          className={cn(
            'grid h-8 min-w-9 place-items-center border-x border-[#ededed] px-2 text-foreground tabular-nums',
          )}
        >
          {page}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          aria-label="Halaman berikutnya"
          className="grid size-8 place-items-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
