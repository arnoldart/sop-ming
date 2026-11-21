import { Skeleton } from '@/components/ui/skeleton';

export function StatCard({
  label,
  value,
  hint,
  suffix,
}: {
  label: string;
  value: number | string;
  hint?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-[#ededed] bg-card px-4 py-3.5">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-[32px] leading-none font-medium tracking-[-0.6px] tabular-nums">
        {value}
        {suffix ? <span className="text-2xl">{suffix}</span> : null}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#ededed] bg-card px-4 py-3.5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-8 w-14" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}
