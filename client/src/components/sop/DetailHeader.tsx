import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { SopDetail } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { StatusPill } from '@/components/common/StatusPill';
import { Badge } from '@/components/ui/badge';

/** Status yang ditampilkan: versi terbit lebih menentukan daripada status alur kerja. */
export function sopDisplayStatus(sop: SopDetail) {
  return sop.currentVersion?.status === 'PUBLISHED' ? 'PUBLISHED' : sop.status;
}

export function DetailHeader({ sop, actions }: { sop: SopDetail; actions?: ReactNode }) {
  const version = sop.currentVersion ?? sop.draftVersion;
  const meta = [
    sop.department.name,
    version ? `v${version.versionNo}` : null,
    version?.effectiveDate ? `Berlaku ${formatDate(version.effectiveDate)}` : null,
    `PIC ${sop.owner.name}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <header>
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/sop" className="hover:text-foreground">
          Perpustakaan SOP
        </Link>
        <span aria-hidden>/</span>
        <span>{sop.code}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1>{sop.title}</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">{meta}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill status={sopDisplayStatus(sop)} />
            {sop.requiresAcknowledgement ? (
              <Badge variant="outline" className="rounded-full px-2.5 text-xs font-normal">
                Wajib konfirmasi
              </Badge>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
