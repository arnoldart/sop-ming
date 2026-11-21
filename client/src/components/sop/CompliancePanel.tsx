import type { SopDetail } from '@/lib/api';
import { formatDateTime, percent } from '@/lib/format';
import { Progress } from '@/components/ui/progress';

export function CompliancePanel({ sop }: { sop: SopDetail }) {
  const compliance = sop.compliance;
  const acknowledgedNote = sop.acknowledgedByMe ? (
    <p className="mt-3 text-[13px] text-muted-foreground">
      Anda sudah mengonfirmasi versi ini
      {sop.acknowledgedAt ? ` pada ${formatDateTime(sop.acknowledgedAt)}` : ''}.
    </p>
  ) : null;

  if (!compliance) {
    return (
      <section className="rounded-xl border border-[#ededed] bg-card px-6 py-5">
        <h2 className="text-[15px] font-medium">Konfirmasi baca</h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Rekap konfirmasi hanya tersedia untuk PIC SOP, Manager, dan HRD. Anda tetap dapat melihat
          status konfirmasi Anda sendiri di bawah ini.
        </p>
        {acknowledgedNote ?? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            Anda belum mengonfirmasi versi ini.
          </p>
        )}
      </section>
    );
  }

  const value = percent(compliance.acknowledged, compliance.total);

  return (
    <section className="rounded-xl border border-[#ededed] bg-card px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[15px] font-medium">Konfirmasi baca</h2>
        <span className="text-[22px] leading-none font-medium tracking-[-0.4px] tabular-nums">
          {value}%
        </span>
      </div>

      <p className="mt-3 text-sm">
        {compliance.acknowledged} dari {compliance.total} karyawan sudah konfirmasi versi ini.
      </p>

      <Progress value={value} className="mt-3 h-1.5 bg-[#ededed]" />

      {compliance.pending.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">Semua karyawan sudah konfirmasi.</p>
      ) : (
        <div className="mt-5">
          <p className="text-[13px] text-muted-foreground">Belum konfirmasi</p>
          <ul className="mt-1.5 space-y-0.5 text-sm">
            {compliance.pending.map((person) => (
              <li key={person.email}>{person.name}</li>
            ))}
          </ul>
        </div>
      )}

      {acknowledgedNote}
    </section>
  );
}
