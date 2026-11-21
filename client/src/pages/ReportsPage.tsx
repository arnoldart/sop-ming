import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, type ReportsResponse } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { CreateReportDialog } from '@/components/reports/CreateReportDialog';
import { ReportDetail } from '@/components/reports/ReportDetail';
import { ReportList, ReportListSkeleton } from '@/components/reports/ReportList';
import { Button } from '@/components/ui/button';

export function ReportsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => api.get<ReportsResponse>('/reports'),
  });

  const items = query.data?.items ?? [];
  const canTriage = query.data?.canTriage ?? false;
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  return (
    <>
      <PageHeader
        title="Laporan pelanggaran"
        description="Dugaan penyimpangan SOP beserta tindak lanjutnya. Laporan anonim tidak menyimpan identitas pelapor."
        actions={
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Buat laporan
          </Button>
        }
      />

      {query.isPending ? (
        <ReportListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <div
          className={cn(
            'grid items-stretch gap-4',
            canTriage && 'lg:grid-cols-[minmax(0,1fr)_408px]',
          )}
        >
          <ReportList
            items={items}
            selectedId={canTriage ? (selected?.id ?? null) : null}
            onSelect={setSelectedId}
            interactive={canTriage}
          />
          {canTriage && selected ? <ReportDetail report={selected} canTriage /> : null}
        </div>
      )}

      <CreateReportDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
