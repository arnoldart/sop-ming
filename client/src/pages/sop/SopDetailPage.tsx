import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileQuestion } from 'lucide-react';
import { ApiError, api, type SopDetail } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ErrorState } from '@/components/common/ErrorState';
import { ActionBar } from '@/components/sop/ActionBar';
import { DetailHeader } from '@/components/sop/DetailHeader';
import { DetailTabs, isDetailTab } from '@/components/sop/DetailTabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-3 w-72" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="rounded-xl border border-[#ededed] p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-5 h-4 w-40" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-11/12" />
        <Skeleton className="mt-6 h-4 w-32" />
        <Skeleton className="mt-3 h-3 w-10/12" />
      </div>
    </div>
  );
}

function SopNotFound() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-[#ededed] bg-card px-6 py-12 text-center">
      <FileQuestion className="mx-auto size-6 text-muted-foreground" aria-hidden />
      <h1 className="mt-3 text-lg font-medium">SOP tidak ditemukan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        SOP ini tidak ada, atau Anda tidak memiliki akses untuk melihatnya.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link to="/sop">Kembali ke daftar SOP</Link>
      </Button>
    </div>
  );
}

export function SopDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab = isDetailTab(tabParam) ? tabParam : 'isi';

  const query = useQuery({
    queryKey: queryKeys.sop(id),
    queryFn: () => api.get<SopDetail>(`/sops/${id}`),
    enabled: Boolean(id),
  });

  function changeTab(next: typeof tab) {
    setParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (next === 'isi') updated.delete('tab');
        else updated.set('tab', next);
        return updated;
      },
      { replace: true },
    );
  }

  if (query.isPending) return <DetailSkeleton />;

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) return <SopNotFound />;
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <DetailHeader sop={query.data} actions={<ActionBar sop={query.data} />} />
      <DetailTabs sop={query.data} tab={tab} onTabChange={changeTab} />
    </div>
  );
}
