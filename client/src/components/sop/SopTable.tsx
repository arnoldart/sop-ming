import { Link } from 'react-router-dom';
import type { SopListItem } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { StatusPill } from '@/components/common/StatusPill';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const HEAD =
  'h-10 px-4 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase';

/** Kolom "Status" memakai isPublished agar SOP yang versi terbitnya masih hidup tetap terbaca Terbit. */
function displayStatus(item: SopListItem) {
  return item.isPublished ? 'PUBLISHED' : item.status;
}

export function SopTable({ items }: { items: SopListItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#ededed] bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={HEAD}>Judul SOP</TableHead>
            <TableHead className={HEAD}>Departemen</TableHead>
            <TableHead className={HEAD}>Status</TableHead>
            <TableHead className={HEAD}>Versi</TableHead>
            <TableHead className={HEAD}>Konfirmasi</TableHead>
            <TableHead className={HEAD}>Diperbarui</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="h-14">
              <TableCell className="px-4 py-2.5">
                <Link to={`/sop/${item.id}`} className="group block">
                  <span className="block text-sm font-medium group-hover:underline">
                    {item.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.code} · {item.ownerName}
                  </span>
                </Link>
              </TableCell>
              <TableCell className="px-4 py-2.5 text-sm">{item.department.name}</TableCell>
              <TableCell className="px-4 py-2.5">
                <StatusPill status={displayStatus(item)} />
              </TableCell>
              <TableCell className="px-4 py-2.5 text-sm tabular-nums">
                {item.versionNo ? `v${item.versionNo}` : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="px-4 py-2.5">
                {item.isPublished && item.requiresAcknowledgement ? (
                  <span className="flex items-center gap-2 text-sm">
                    <span className="tabular-nums">{item.acknowledgementCount}</span>
                    {item.acknowledgedByMe ? null : (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        Belum konfirmasi
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-sm text-muted-foreground">
                {formatDate(item.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function SopTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#ededed] bg-card">
      <div className="flex h-10 items-center gap-6 border-b px-4">
        {[180, 120, 90, 50, 90, 80].map((width, index) => (
          <Skeleton key={index} className="h-2.5" style={{ width }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-14 items-center gap-6 border-b px-4 last:border-b-0">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
