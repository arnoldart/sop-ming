import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { rejectSchema } from '@sop/shared';
import type { z } from 'zod';
import { api, errorMessage, fieldErrors } from '@/lib/api';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type RejectValues = z.infer<typeof rejectSchema>;

export function RejectDialog({
  sopId,
  open,
  onOpenChange,
}: {
  sopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const refresh = useSopRefresh(sopId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RejectValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { note: '' },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: RejectValues) => api.post(`/sops/${sopId}/reject`, values),
    onSuccess: () => {
      refresh();
      toast.success('SOP ditolak dan dikembalikan ke draft');
      onOpenChange(false);
    },
    onError: (error) => {
      const fields = fieldErrors(error);
      if (fields.note) {
        setError('note', { message: fields.note });
        return;
      }
      toast.error(errorMessage(error));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Tolak SOP</DialogTitle>
          <DialogDescription>
            SOP kembali ke draft milik PIC. Tuliskan alasan agar PIC tahu apa yang harus diperbaiki.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">Alasan penolakan</Label>
            <Textarea
              id="reject-note"
              rows={4}
              placeholder="Contoh: langkah verifikasi belum mencakup shift malam."
              aria-invalid={Boolean(errors.note)}
              {...register('note')}
            />
            {errors.note ? (
              <p className="text-xs text-destructive">{errors.note.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Minimal 10 karakter.</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menolak…' : 'Tolak SOP'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
