import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reportSchema } from '@sop/shared';
import { z } from 'zod';
import { api, errorMessage, fieldErrors, type SopListResponse } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const formSchema = reportSchema.extend({
  description: z.string().trim().min(20, 'Deskripsi minimal 20 karakter'),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

const NO_SOP = 'none';

export function CreateReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const sopsQuery = useQuery({
    queryKey: queryKeys.sops({ status: 'PUBLISHED', limit: 50 }),
    queryFn: () => api.get<SopListResponse>('/sops?status=PUBLISHED&limit=50'),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: { sopId: null, description: '', anonymous: false },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const sopId = watch('sopId');

  const mutation = useMutation({
    mutationFn: (values: FormOutput) => api.post('/reports', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast.success('Laporan terkirim');
      onOpenChange(false);
    },
    onError: (error) => {
      const fields = fieldErrors(error);
      const entries = Object.entries(fields);
      for (const [field, message] of entries) {
        setError(field as keyof FormInput, { message });
      }
      if (entries.length === 0) toast.error(errorMessage(error));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Buat laporan</DialogTitle>
          <DialogDescription>
            Laporkan dugaan penyimpangan SOP. Manager dan HRD akan menindaklanjuti laporan Anda.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="report-sop">SOP terkait (opsional)</Label>
            <Select
              value={sopId ?? NO_SOP}
              onValueChange={(value) => setValue('sopId', value === NO_SOP ? null : value)}
            >
              <SelectTrigger id="report-sop" className="w-full">
                <SelectValue placeholder="Tidak terkait SOP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SOP}>Tidak terkait SOP</SelectItem>
                {(sopsQuery.data?.items ?? []).map((sop) => (
                  <SelectItem key={sop.id} value={sop.id}>
                    {sop.code} — {sop.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-description">Deskripsi</Label>
            <Textarea
              id="report-description"
              className="min-h-[96px]"
              placeholder="Jelaskan kejadian, waktu, dan lokasi bila ada…"
              aria-invalid={Boolean(errors.description)}
              {...register('description')}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Minimal 20 karakter.</p>
            )}
          </div>

          <Controller
            control={control}
            name="anonymous"
            render={({ field }) => (
              <div className="flex items-start justify-between gap-3 rounded-md border border-[#ededed] px-3 py-2.5">
                <div className="space-y-0.5">
                  <Label htmlFor="report-anonymous" className="text-sm">
                    Kirim sebagai anonim
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Identitas Anda tidak disimpan, termasuk di audit log.
                  </p>
                </div>
                <Switch
                  id="report-anonymous"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Mengirim…' : 'Kirim laporan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
