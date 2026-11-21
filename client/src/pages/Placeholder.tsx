import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';

/** Layar sementara sampai fase terkait dikerjakan. */
export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="p-6 text-sm text-muted-foreground">
        {note ?? 'Layar ini sedang dibangun.'}
      </Card>
    </>
  );
}
