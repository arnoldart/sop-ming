import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';

/**
 * Placeholder fase 0. Ringkasan pekerjaan tertunda dan kepatuhan
 * diisi pada fase berikutnya dari docs/PLAN-FRONTEND.md.
 */
export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan pekerjaan tertunda dan tingkat kepatuhan konfirmasi."
      />
      <Card className="p-6 text-sm text-muted-foreground">
        Ringkasan dashboard akan tersedia pada fase berikutnya.
      </Card>
    </>
  );
}
