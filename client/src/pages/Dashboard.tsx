import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Clock, FileText, Megaphone } from 'lucide-react';
import { ROLE_LABEL } from '@sop/shared';
import { api, type DashboardSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, relativeTime } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusPill } from '@/components/common/StatusPill';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('overflow-hidden rounded-xl border border-[#ededed] bg-card', className)}
    >
      <header className="flex h-12 items-center justify-between gap-3 border-b border-[#ededed] px-5">
        <h2 className="text-[15px] font-medium">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
    >
      {children}
      <ChevronRight className="size-3.5" aria-hidden />
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[#ededed] p-5 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-14 w-full" />
          <Skeleton className="mt-2 h-14 w-full" />
        </div>
        <div className="rounded-xl border border-[#ededed] p-5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

function DashboardBody({ data }: { data: DashboardSummary }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="SOP terbit" value={data.cards.published} hint="Berlaku saat ini" />
        <StatCard
          label="Menunggu tindakan"
          value={data.cards.pendingForMe}
          hint="Perlu keputusan Anda"
        />
        <StatCard
          label="Perlu konfirmasi"
          value={data.cards.awaitingMyAcknowledgement}
          hint="SOP yang belum Anda baca"
        />
        <StatCard
          label="Kepatuhan konfirmasi"
          value={data.cards.compliancePercent}
          suffix="%"
          hint={`${data.cards.openReports} laporan terbuka`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Menunggu tindakan Anda"
          action={<SectionLink to="/sop">Semua SOP</SectionLink>}
          className="lg:col-span-2"
        >
          {data.pendingActions.map((item) => (
            <Link
              key={item.id}
              to={`/sop/${item.id}`}
              className="flex items-center gap-3 border-b border-[#ededed] px-5 py-3.5 last:border-b-0 hover:bg-secondary/60"
            >
              {item.status === 'DRAFT' ? (
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.code} · {item.department} · v{item.versionNo ?? '—'}
                </span>
              </span>
              <StatusPill status={item.status} />
            </Link>
          ))}

          <div className="px-5 py-4">
            <p className="text-sm font-medium">Belum ada pekerjaan lain</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Antrean persetujuan dan draft Anda sedang kosong. SOP yang perlu keputusan akan muncul
              di sini.
            </p>
          </div>
        </Section>

        <Section
          title="Kepatuhan terendah"
          action={null}
          className="flex flex-col"
        >
          {data.lowestCompliance.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              Belum ada SOP yang wajib dikonfirmasi.
            </p>
          ) : (
            data.lowestCompliance.map((item) => (
              <div key={item.id} className="border-b border-[#ededed] px-5 py-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    to={`/sop/${item.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {item.title}
                  </Link>
                  <span className="text-sm tabular-nums">{item.percent}%</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.code} · {item.department}
                </p>
                <Progress value={item.percent} className="mt-2 h-1" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {item.acknowledged} dari {item.target} karyawan sudah konfirmasi
                </p>
              </div>
            ))
          )}
          <div className="mt-auto border-t border-[#ededed] px-5 py-3">
            <SectionLink to="/sop?requiresAck=true">Lihat laporan kepatuhan lengkap</SectionLink>
          </div>
        </Section>
      </div>

      <Section
        title="Pengumuman terbaru"
        action={<SectionLink to="/pengumuman">Lihat semua</SectionLink>}
      >
        {data.announcements.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Belum ada pengumuman.</p>
        ) : (
          data.announcements.map((item) => (
            <article
              key={item.id}
              className="flex gap-3 border-b border-[#ededed] px-5 py-3.5 last:border-b-0"
            >
              <Megaphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.authorName} · {formatDate(item.createdAt)} · {relativeTime(item.createdAt)}
                </p>
              </div>
            </article>
          ))
        )}
      </Section>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  });

  if (!user) return null;

  const firstName = user.name.split(' ')[0];
  const subtitle = `Ringkasan pekerjaan SOP untuk peran ${ROLE_LABEL[user.role]}${
    user.departmentName ? ` di ${user.departmentName}` : ''
  }.`;

  return (
    <>
      <div className="mb-6">
        <h1>Selamat datang, {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {query.isPending ? (
        <DashboardSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <DashboardBody data={query.data} />
      )}
    </>
  );
}
