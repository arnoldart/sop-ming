import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import type { Role } from '@sop/shared';
import { ROLE_LABEL } from '@sop/shared';
import { api, type UsersResponse } from '@/lib/api';
import { formatDate, initials } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 7;
const HEAD =
  'h-10 px-4 text-[12px] font-medium tracking-[0.04em] text-muted-foreground uppercase';

/** Urutan tampil mengikuti frame desain: pemilik kebijakan dan penyetuju lebih dulu. */
const ROLE_ORDER: Role[] = ['HRD', 'MANAGER', 'PIC_SOP', 'KARYAWAN', 'AUDITOR', 'MANAJEMEN'];

/**
 * Direktori akun read-only. Backend tidak menyediakan endpoint mutasi pengguna,
 * jadi layar ini sengaja tanpa tombol tambah/ubah/hapus.
 */
export function UsersPage() {
  const [params, setParams] = useSearchParams();

  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.get<UsersResponse>('/users'),
  });

  // Server mengurutkan per enum; di layar, peran penentu kebijakan tampil lebih dulu.
  const users = [...(usersQuery.data?.users ?? [])].sort(
    (a, b) =>
      ROLE_ORDER.indexOf(a.role as Role) - ROLE_ORDER.indexOf(b.role as Role) ||
      a.name.localeCompare(b.name),
  );
  const total = users.length;
  const departmentCount = usersQuery.data?.departments.length ?? 0;

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number(params.get('page'));
  const page = Math.min(Number.isInteger(requested) && requested > 0 ? requested : 1, lastPage);
  const visible = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const countRole = (role: Role) => users.filter((user) => user.role === role).length;

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Daftar akun beserta perannya. Halaman ini hanya-baca; perubahan peran dilakukan lewat admin."
      />

      <div className="space-y-4">
        {usersQuery.isPending ? (
          <UsersSkeleton />
        ) : usersQuery.isError ? (
          <ErrorState
            error={usersQuery.error}
            onRetry={() => void usersQuery.refetch()}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total akun"
                value={total}
                hint={`tersebar di ${departmentCount} departemen`}
              />
              <StatCard
                label="PIC SOP"
                value={countRole('PIC_SOP')}
                hint="penulis dan pengusul SOP"
              />
              <StatCard
                label="Manager"
                value={countRole('MANAGER')}
                hint="penyetuju tahap pertama"
              />
              <StatCard
                label="Auditor"
                value={countRole('AUDITOR')}
                hint="akses baca tanpa tulis"
              />
            </div>

            <section className="overflow-hidden rounded-xl border border-[#ededed] bg-card">
              <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
                <h2 className="text-[15px] font-medium">Daftar pengguna</h2>
                <span className="text-xs text-muted-foreground">
                  {total} akun · {departmentCount} departemen
                </span>
              </header>

              {total === 0 ? (
                <div className="px-4 pb-4">
                  <EmptyState
                    icon={Users}
                    title="Belum ada pengguna"
                    description="Akun yang terdaftar akan muncul di sini."
                  />
                </div>
              ) : (
                <>
                  <UserTable items={visible} />
                  <div className="border-t border-[#ededed] px-4 py-3">
                    <Pagination
                      page={page}
                      limit={PAGE_SIZE}
                      total={total}
                      noun="akun"
                      onPageChange={(next) =>
                        setParams(
                          (prev) => {
                            const updated = new URLSearchParams(prev);
                            if (next <= 1) updated.delete('page');
                            else updated.set('page', String(next));
                            return updated;
                          },
                          { replace: true },
                        )
                      }
                    />
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

function UserTable({ items }: { items: UsersResponse['users'] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={HEAD}>Nama</TableHead>
          <TableHead className={cn(HEAD, 'w-[130px]')}>Peran</TableHead>
          <TableHead className={cn(HEAD, 'w-[200px]')}>Departemen</TableHead>
          <TableHead className={cn(HEAD, 'w-[120px]')}>Status</TableHead>
          <TableHead className={cn(HEAD, 'w-[150px]')}>Dibuat</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((user) => (
          <TableRow key={user.id} className="h-14">
            <TableCell className="px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-medium"
                  aria-hidden
                >
                  {initials(user.name)}
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-medium">{user.name}</span>
                  <span className="block text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4 py-2.5">
              <Badge
                variant="outline"
                className="rounded-full px-2.5 text-xs font-normal text-muted-foreground"
              >
                {ROLE_LABEL[user.role as Role] ?? user.role}
              </Badge>
            </TableCell>
            <TableCell className="px-4 py-2.5 text-sm">
              {user.department ?? <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell className="px-4 py-2.5">
              <span
                className={cn(
                  'flex items-center gap-2 text-sm',
                  user.isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    user.isActive ? 'bg-[#3ECF8E]' : 'bg-[#B2B2B2]',
                  )}
                  aria-hidden
                />
                {user.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </TableCell>
            <TableCell className="px-4 py-2.5 text-[13px] text-muted-foreground tabular-nums">
              {formatDate(user.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function UsersSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#ededed] bg-card">
        <div className="flex h-[57px] items-center justify-between border-b px-4">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-28" />
        </div>
        <div className="flex h-10 items-center gap-6 border-b px-4">
          {[180, 90, 150, 80, 100].map((width, index) => (
            <Skeleton key={index} className="h-2.5" style={{ width }} />
          ))}
        </div>
        {Array.from({ length: PAGE_SIZE }).map((_, index) => (
          <div key={index} className="flex h-14 items-center gap-6 border-b px-4 last:border-b-0">
            <div className="flex w-[180px] items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-36" />
              </div>
            </div>
            <Skeleton className="h-5 w-[70px] rounded-full" />
            <Skeleton className="h-3 w-[120px]" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </>
  );
}
