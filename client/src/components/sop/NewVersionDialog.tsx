import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { newVersionSchema } from '@sop/shared';
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

type NewVersionValues = z.infer<typeof newVersionSchema>;

export function NewVersionDialog({
  sopId,
  open,
  onOpenChange,
}: {
  sopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const refresh = useSopRefresh(sopId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<NewVersionValues>({
    resolver: zodResolver(newVersionSchema),
    defaultValues: { changeSummary: '' },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: NewVersionValues) => api.post(`/sops/${sopId}/versions`, values),
    onSuccess: () => {
      refresh();
      toast.success('Draft versi baru dibuat');
      onOpenChange(false);
      navigate(`/sop/${sopId}/edit`);
    },
    onError: (error) => {
      const fields = fieldErrors(error);
      if (fields.changeSummary) {
        setError('changeSummary', { message: fields.changeSummary });
        return;
      }
      toast.error(errorMessage(error));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Buat versi baru</DialogTitle>
          <DialogDescription>
            Isi versi terbit disalin ke draft baru. Versi lama tetap berlaku sampai versi ini
            diterbitkan.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="change-summary">Ringkasan perubahan</Label>
            <Textarea
              id="change-summary"
              rows={3}
              placeholder="Contoh: menambah langkah verifikasi akhir sebelum serah terima."
              aria-invalid={Boolean(errors.changeSummary)}
              {...register('changeSummary')}
            />
            {errors.changeSummary ? (
              <p className="text-xs text-destructive">{errors.changeSummary.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Minimal 10 karakter.</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Membuat…' : 'Buat draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
