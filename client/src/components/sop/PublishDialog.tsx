import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { useSopRefresh } from '@/lib/sopMutations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Tanggal lokal dalam bentuk yyyy-mm-dd, aman untuk input[type=date]. */
function todayInput() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function PublishDialog({
  sopId,
  open,
  onOpenChange,
}: {
  sopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const refresh = useSopRefresh(sopId);
  const [effectiveDate, setEffectiveDate] = useState(todayInput);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEffectiveDate(todayInput());
      setError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => api.post(`/sops/${sopId}/publish`, { effectiveDate }),
    onSuccess: () => {
      refresh();
      toast.success('SOP diterbitkan');
      onOpenChange(false);
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Terbitkan SOP</DialogTitle>
          <DialogDescription>
            Versi terbit sebelumnya otomatis berstatus digantikan. Konfirmasi karyawan dihitung ulang
            untuk versi ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="effective-date">Tanggal berlaku</Label>
          <Input
            id="effective-date"
            type="date"
            value={effectiveDate}
            onChange={(event) => setEffectiveDate(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Tanggal tinjauan ulang berikutnya dihitung dari tanggal ini.
          </p>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending || !effectiveDate}
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
          >
            {mutation.isPending ? 'Menerbitkan…' : 'Terbitkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
