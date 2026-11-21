import { History } from 'lucide-react';
import { ROLE_LABEL, type Role } from '@sop/shared';
import type { SopVersion } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusPill } from '@/components/common/StatusPill';

/** Versi berikutnya yang punya tanggal berlaku, dipakai sebagai akhir masa berlaku. */
function endDateOf(versions: SopVersion[], index: number) {
  return versions
    .slice(0, index)
    .reverse()
    .find((version) => version.effectiveDate)?.effectiveDate;
}

export function VersionHistory({ versions }: { versions: SopVersion[] }) {
  return (
    <section className="rounded-xl border border-[#ededed] bg-card">
      <header className="px-6 pt-5 pb-2">
        <h2 className="text-[15px] font-medium">Riwayat versi</h2>
      </header>

      {versions.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState icon={History} title="Belum ada versi" />
        </div>
      ) : (
        <ul>
          {versions.map((version, index) => {
            const end = endDateOf(versions, index);
            const period = version.effectiveDate
              ? end
                ? `Berlaku ${formatDate(version.effectiveDate)} – ${formatDate(end)}`
                : `Berlaku ${formatDate(version.effectiveDate)}`
              : 'Belum berlaku';

            return (
              <li
                key={version.id}
                className="flex items-start justify-between gap-4 border-t border-[#ededed] px-6 py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">v{version.versionNo}</span>
                    <StatusPill status={version.status} />
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {version.changeSummary || 'Tanpa ringkasan perubahan.'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {version.authorName ?? '—'}
                    {version.authorRole
                      ? ` · ${ROLE_LABEL[version.authorRole as Role] ?? version.authorRole}`
                      : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] text-muted-foreground">{period}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
