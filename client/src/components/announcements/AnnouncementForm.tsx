import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { announcementSchema } from '@sop/shared';
import { z } from 'zod';
import { api, errorMessage, fieldErrors, type UsersResponse } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

/** Skema bersama dipakai apa adanya; hanya pesan validasinya yang dibuat berbahasa Indonesia. */
const formSchema = announcementSchema.extend({
  title: z.string().trim().min(5, 'Judul minimal 5 karakter').max(200, 'Judul maksimal 200 karakter'),
  body: z.string().trim().min(10, 'Isi minimal 10 karakter'),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

const ALL_DEPARTMENTS = 'all';

export function AnnouncementForm() {
  const queryClient = useQueryClient();

  const departmentsQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.get<UsersResponse>('/users'),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', body: '', sopId: null, targetDepartmentId: null },
  });

  const targetDepartmentId = watch('targetDepartmentId');

  const mutation = useMutation({
    mutationFn: (values: FormOutput) => api.post('/announcements', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.announcements });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast.success('Pengumuman diterbitkan');
      reset();
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
    <section className="rounded-xl border border-[#ededed] bg-card">
      <header className="px-6 pt-5 pb-3">
        <h2 className="text-[15px] font-medium">Tulis pengumuman</h2>
      </header>

      <form
        className="space-y-3 px-6 pb-6"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label htmlFor="announcement-title" className="sr-only">
              Judul pengumuman
            </Label>
            <Input
              id="announcement-title"
              placeholder="Judul pengumuman…"
              aria-invalid={Boolean(errors.title)}
              {...register('title')}
            />
            {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
          </div>

          <Select
            value={targetDepartmentId ?? ALL_DEPARTMENTS}
            onValueChange={(value) =>
              setValue('targetDepartmentId', value === ALL_DEPARTMENTS ? null : value)
            }
          >
            <SelectTrigger className="w-full sm:w-[194px]" aria-label="Sasaran departemen">
              <SelectValue placeholder="Semua departemen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEPARTMENTS}>Semua departemen</SelectItem>
              {(departmentsQuery.data?.departments ?? []).map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Menerbitkan…' : 'Terbitkan'}
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="announcement-body" className="sr-only">
            Isi pengumuman
          </Label>
          <Textarea
            id="announcement-body"
            className="min-h-[74px]"
            placeholder="Isi pengumuman, misalnya perubahan langkah kerja atau tenggat konfirmasi…"
            aria-invalid={Boolean(errors.body)}
            {...register('body')}
          />
          {errors.body ? <p className="text-xs text-destructive">{errors.body.message}</p> : null}
        </div>
      </form>
    </section>
  );
}
