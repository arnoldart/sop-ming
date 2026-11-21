import { Megaphone } from 'lucide-react';
import type { Announcement } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

export function AnnouncementList({
  items,
  departments,
  ownDepartment,
  canManage,
  onDelete,
}: {
  items: Announcement[];
  departments: { id: string; name: string }[];
  ownDepartment?: { id: string; name: string };
  canManage: boolean;
  onDelete: (announcement: Announcement) => void;
}) {
  const departmentNames = new Map(departments.map((item) => [item.id, item.name]));

  return (
    <section className="rounded-xl border border-[#ededed] bg-card">
      <header className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
        <h2 className="text-[15px] font-medium">Pengumuman terbit</h2>
        <span className="text-xs text-muted-foreground">{items.length} pengumuman</span>
      </header>

      {items.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState
            icon={Megaphone}
            title="Belum ada pengumuman"
            description="Pengumuman dari HRD akan muncul di sini."
          />
        </div>
      ) : (
        <ul>
          {items.map((announcement) => {
            const scope = announcement.targetDepartmentId
              ? (departmentNames.get(announcement.targetDepartmentId) ??
                (ownDepartment?.id === announcement.targetDepartmentId
                  ? ownDepartment.name
                  : 'Departemen Anda'))
              : 'Semua departemen';

            return (
              <li
                key={announcement.id}
                className="flex items-start gap-3 border-t border-[#ededed] px-6 py-4"
              >
                <Megaphone className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{announcement.title}</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                    {announcement.body}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {announcement.sop ? (
                      <span className="rounded-full border border-border px-2 py-0.5">
                        {announcement.sop.code}
                      </span>
                    ) : null}
                    <span>
                      {scope} · {announcement.authorName} · {formatDate(announcement.createdAt)}
                    </span>
                  </div>
                </div>

                {canManage ? (
                  <button
                    type="button"
                    onClick={() => onDelete(announcement)}
                    className="shrink-0 text-[13px] text-muted-foreground transition-colors hover:text-destructive"
                  >
                    Hapus
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <footer className="border-t border-[#ededed] px-6 py-3 text-xs text-muted-foreground">
        Pengumuman tidak mewajibkan persetujuan. Setiap penerbitan dan penghapusan tercatat di audit
        log.
      </footer>
    </section>
  );
}

export function AnnouncementListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="rounded-xl border border-[#ededed] bg-card">
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 border-t border-[#ededed] px-6 py-4">
          <Skeleton className="mt-1 size-4 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-4 w-56 rounded-full" />
          </div>
        </div>
      ))}
    </section>
  );
}
