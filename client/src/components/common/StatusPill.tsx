import { Badge } from '@/components/ui/badge';
import { STATUS_LABEL } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Pil status. Hijau lembut hanya untuk keadaan "selesai/terbit" — bukan CTA,
 * sehingga tidak bersaing dengan tombol utama (lihat docs/DESIGN.md).
 */
const TONE: Record<string, string> = {
  PUBLISHED: 'border-transparent bg-[#D8F8E9] text-foreground',
  APPROVED: 'border-transparent bg-[#D8F8E9] text-foreground',
  RESOLVED: 'border-transparent bg-[#D8F8E9] text-foreground',
  IN_REVIEW: 'border-border bg-secondary text-foreground',
  TRIAGED: 'border-border bg-secondary text-foreground',
  INVESTIGATING: 'border-border bg-secondary text-foreground',
  DRAFT: 'border-border bg-background text-muted-foreground',
  OPEN: 'border-border bg-background text-muted-foreground',
  SUPERSEDED: 'border-transparent bg-transparent text-muted-foreground',
  ARCHIVED: 'border-transparent bg-transparent text-muted-foreground',
  CLOSED: 'border-transparent bg-transparent text-muted-foreground',
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 text-xs font-normal',
        TONE[status] ?? 'border-border bg-background text-muted-foreground',
        className,
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
