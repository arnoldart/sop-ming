import type { Report } from '@/lib/api';
import { STATUS_LABEL, formatDate } from '@/lib/format';
import { StatusPill } from '@/components/common/StatusPill';
import { FollowUpForm } from '@/components/reports/FollowUpForm';

export function ReportDetail({ report, canTriage }: { report: Report; canTriage: boolean }) {
  return (
    <section className="rounded-xl border border-[#ededed] bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-[#ededed] px-6 py-4">
        <h2 className="text-[15px] font-medium">Tindak lanjut</h2>
        <StatusPill status={report.status} />
      </header>

      <div className="px-6 py-5">
        <p className="text-sm">{report.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          {report.sop?.code ?? 'Umum'} · dilaporkan {formatDate(report.createdAt)} · pelapor{' '}
          {report.anonymous ? 'anonim' : (report.reporterName ?? '—')}
        </p>

        <div className="mt-5 border-t border-[#ededed] pt-4">
          <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
            Riwayat tindak lanjut
          </p>

          {report.followUps.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada tindak lanjut.</p>
          ) : (
            <ol className="mt-3">
              {report.followUps.map((followUp, index) => (
                <li key={followUp.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < report.followUps.length - 1 ? (
                    <span
                      aria-hidden
                      className="absolute top-2.5 bottom-0 left-[3px] w-px bg-[#ededed]"
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className="mt-[6px] size-[7px] shrink-0 rounded-full bg-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {STATUS_LABEL[followUp.toStatus] ?? followUp.toStatus}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{followUp.note}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {followUp.actorName} · {formatDate(followUp.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {canTriage ? (
          <div className="mt-5 border-t border-[#ededed] pt-4">
            <FollowUpForm report={report} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
