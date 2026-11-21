import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { REPORT_STATUSES, type ReportStatus } from '@sop/shared';
import { api, errorMessage, fieldErrors, type Report } from '@/lib/api';
import { STATUS_LABEL } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function FollowUpForm({ report }: { report: Report }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Setelah status laporan berubah di server, form mengikuti status baru.
  useEffect(() => {
    setStatus(report.status);
    setNote('');
    setError(null);
  }, [report.id, report.status]);

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/reports/${report.id}/follow-ups`, { status, note: note.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast.success('Tindak lanjut tersimpan');
      setNote('');
    },
    onError: (mutationError) => {
      const fields = fieldErrors(mutationError);
      const message = fields.note ?? fields.status;
      if (message) {
        setError(message);
        return;
      }
      toast.error(errorMessage(mutationError));
    },
  });

  function submit() {
    if (note.trim().length < 5) {
      setError('Catatan minimal 5 karakter');
      return;
    }
    setError(null);
    mutation.mutate();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="followup-status" className="text-[13px] text-muted-foreground">
          Ubah status
        </Label>
        <Select value={status} onValueChange={(value) => setStatus(value as ReportStatus)}>
          <SelectTrigger id="followup-status" className="w-[192px]" aria-label="Status baru">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_STATUSES.map((value) => (
              <SelectItem key={value} value={value} disabled={value === report.status}>
                {STATUS_LABEL[value] ?? value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="followup-note" className="sr-only">
          Catatan tindak lanjut
        </Label>
        <Textarea
          id="followup-note"
          className="min-h-[86px]"
          placeholder="Catatan tindak lanjut (wajib)…"
          value={note}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setNote(event.target.value);
            if (error) setError(null);
          }}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <Button type="button" className="w-full" onClick={submit} disabled={mutation.isPending}>
        {mutation.isPending ? 'Menyimpan…' : 'Simpan tindak lanjut'}
      </Button>

      <p className="text-xs leading-5 text-muted-foreground">
        Catatan tersimpan sebagai riwayat baru, tidak menimpa catatan sebelumnya.
      </p>
    </div>
  );
}
