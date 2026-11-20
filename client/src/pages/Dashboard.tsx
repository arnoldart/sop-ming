import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ROLE_LABEL } from '@sop/shared';
import { api, type DashboardSummary } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, relativeTime } from '../lib/format';
import { Card, EmptyState, ErrorNote, PageHeader, Progress, SectionTitle, Spinner, StatusPill } from '../components/ui';
import { IconChevronRight, IconClock, IconMegaphone } from '../components/Icons';

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-[13px] text-ink-mute">{label}</p>
      <p className="mt-2 text-[30px] leading-none font-medium tracking-[-0.72px] text-ink">{value}</p>
      {hint && <p className="mt-2 text-[12px] text-ink-mute-2">{hint}</p>}
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  });

  if (!user) return null;
  if (isLoading) return <Spinner label="Memuat ringkasan" />;
  if (error) return <ErrorNote message={(error as Error).message} />;
  if (!data) return null;

  const { cards } = data;

  return (
    <>
      <PageHeader
        title={`Selamat datang, ${user.name.split(' ')[0]}`}
        description={`Ringkasan pekerjaan SOP untuk peran ${ROLE_LABEL[user.role]}${
          user.departmentName ? ` di ${user.departmentName}` : ''
        }.`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="SOP terbit" value={cards.published} hint="Berlaku saat ini" />
        <Stat
          label="Menunggu tindakan"
          value={cards.pendingForMe}
          hint={cards.pendingForMe > 0 ? 'Perlu keputusan Anda' : 'Tidak ada antrean'}
        />
        <Stat
          label="Perlu konfirmasi"
          value={cards.awaitingMyAcknowledgement}
          hint="SOP yang belum Anda baca"
        />
        <Stat
          label="Kepatuhan konfirmasi"
          value={`${cards.compliancePercent}%`}
          hint={`${cards.openReports} laporan terbuka`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <SectionTitle
            action={
              <Link to="/sops" className="flex items-center gap-1 text-[13px] text-ink-mute hover:text-ink">
                Semua SOP
                <IconChevronRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            Menunggu tindakan Anda
          </SectionTitle>

          {data.pendingActions.length === 0 ? (
            <EmptyState
              title="Tidak ada pekerjaan tertunda"
              description="Antrean persetujuan dan draft Anda sedang kosong."
            />
          ) : (
            <ul className="divide-y divide-hairline-cool">
              {data.pendingActions.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/sops/${item.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-canvas-soft"
                  >
                    <IconClock className="h-4 w-4 text-ink-mute-2" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
                      <p className="mt-0.5 text-[12px] text-ink-mute">
                        {item.code} · {item.department} · v{item.versionNo ?? 1}
                      </p>
                    </div>
                    <StatusPill status={item.status} />
                    <IconChevronRight className="h-4 w-4 text-ink-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>Kepatuhan terendah</SectionTitle>
          {data.lowestCompliance.length === 0 ? (
            <EmptyState title="Belum ada SOP wajib konfirmasi" />
          ) : (
            <ul className="divide-y divide-hairline-cool">
              {data.lowestCompliance.map((row) => (
                <li key={row.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/sops/${row.id}`} className="block truncate text-[14px] font-medium text-ink hover:underline">
                        {row.title}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-ink-mute">
                        {row.code} · {row.department}
                      </p>
                    </div>
                    <span className="text-[13px] font-medium tabular-nums text-ink">{row.percent}%</span>
                  </div>
                  <div className="mt-2">
                    <Progress value={row.percent} />
                  </div>
                  <p className="mt-1.5 text-[12px] text-ink-mute-2">
                    {row.acknowledged} dari {row.target} karyawan sudah konfirmasi
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.awaitingAcknowledgement.length > 0 && (
        <Card className="mt-4">
          <SectionTitle>Perlu konfirmasi Anda</SectionTitle>
          <ul className="divide-y divide-hairline-cool">
            {data.awaitingAcknowledgement.map((item) => (
              <li key={item.id}>
                <Link to={`/sops/${item.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-canvas-soft">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[12px] text-ink-mute">{item.code}</p>
                  </div>
                  <span className="pill">Wajib konfirmasi</span>
                  <IconChevronRight className="h-4 w-4 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-4">
        <SectionTitle
          action={
            <Link to="/announcements" className="text-[13px] text-ink-mute hover:text-ink">
              Lihat semua
            </Link>
          }
        >
          Pengumuman terbaru
        </SectionTitle>
        {data.announcements.length === 0 ? (
          <EmptyState title="Belum ada pengumuman" description="HRD belum menerbitkan sosialisasi." />
        ) : (
          <ul className="divide-y divide-hairline-cool">
            {data.announcements.map((a) => (
              <li key={a.id} className="flex gap-3 px-5 py-4">
                <IconMegaphone className="mt-0.5 h-4 w-4 text-ink-mute-2" />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-mute">{a.body}</p>
                  <p className="mt-1 text-[12px] text-ink-mute-2">
                    {a.authorName} · {formatDate(a.createdAt)} · {relativeTime(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
