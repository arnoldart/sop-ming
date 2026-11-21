import { MessageSquare } from 'lucide-react';
import { ROLE_LABEL, type Role } from '@sop/shared';
import type { SopDetail } from '@/lib/api';
import { ACTION_LABEL, formatDateTime } from '@/lib/format';
import { EmptyState } from '@/components/common/EmptyState';

type Approval = SopDetail['approvals'][number];

export function ApprovalTimeline({ approvals }: { approvals: Approval[] }) {
  return (
    <section className="rounded-xl border border-[#ededed] bg-card">
      <header className="px-6 pt-5 pb-2">
        <h2 className="text-[15px] font-medium">Riwayat persetujuan</h2>
      </header>

      {approvals.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState
            icon={MessageSquare}
            title="Belum ada riwayat persetujuan"
            description="Setiap pengajuan, persetujuan, dan penerbitan akan tercatat di sini."
          />
        </div>
      ) : (
        <ol className="px-6 pt-2 pb-6">
          {approvals.map((approval, index) => (
            <li key={approval.id} className="relative flex gap-4 pb-6 last:pb-0">
              {index < approvals.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute top-3 bottom-0 left-[3px] w-px bg-[#ededed]"
                />
              ) : null}
              <span aria-hidden className="mt-[7px] size-[7px] shrink-0 rounded-full bg-primary" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {ACTION_LABEL[approval.action] ?? approval.action}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {formatDateTime(approval.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {approval.actorName} · {ROLE_LABEL[approval.actorRole as Role] ?? approval.actorRole}
                </p>
                {approval.note ? (
                  <p className="mt-2 inline-block rounded-md bg-secondary px-3 py-2 text-[13px] text-foreground">
                    Catatan: {approval.note}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
