import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { createSopSchema } from '@sop/shared';
import { ApiError, api, errorMessage, fieldErrors, type SopDetail } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { queryKeys } from '@/lib/queryKeys';
import { useSopRefresh } from '@/lib/sopMutations';
import { Markdown } from '@/components/Markdown';
import { ErrorState } from '@/components/common/ErrorState';
import { NewVersionDialog } from '@/components/sop/NewVersionDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type EditorInput = z.input<typeof createSopSchema>;
type EditorOutput = z.output<typeof createSopSchema>;

const EMPTY_VALUES: EditorInput = {
  code: '',
  title: '',
  summary: '',
  content: '',
  requiresAcknowledgement: false,
  reviewPeriodMonths: 12,
};

function FormRow({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `space-y-1.5 ${className}` : 'space-y-1.5'}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_404px]">
      <div className="rounded-xl border border-[#ededed] p-5">
        <Skeleton className="h-4 w-28" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="mt-5 h-9 w-full" />
        <Skeleton className="mt-5 h-16 w-full" />
        <Skeleton className="mt-5 h-40 w-full" />
      </div>
      <div className="rounded-xl border border-[#ededed] p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-5 h-5 w-2/3" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-11/12" />
      </div>
    </div>
  );
}

function GateCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-[#ededed] bg-card px-6 py-10 text-center">
      <Lock className="mx-auto size-5 text-muted-foreground" aria-hidden />
      <h1 className="mt-3 text-lg font-medium">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 flex justify-center">{action}</div>
    </div>
  );
}

function NeedsNewVersion({ sop }: { sop: SopDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <GateCard
        title="SOP ini sudah terbit"
        description="Buat versi baru dulu untuk menyunting isi SOP. Versi yang berlaku tetap hidup selama draft disiapkan."
        action={<Button onClick={() => setOpen(true)}>Buat versi baru</Button>}
      />
      <NewVersionDialog sopId={sop.id} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function SopEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const refresh = useSopRefresh(id);
  const [saving, setSaving] = useState<'save' | 'submit' | null>(null);

  const sopQuery = useQuery({
    queryKey: queryKeys.sop(id ?? 'baru'),
    queryFn: () => api.get<SopDetail>(`/sops/${id}`),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    watch,
    formState: { errors },
  } = useForm<EditorInput, unknown, EditorOutput>({
    resolver: zodResolver(createSopSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    const sop = sopQuery.data;
    if (!sop) return;
    reset({
      code: sop.code,
      title: sop.title,
      summary: sop.summary,
      content: sop.draftVersion?.content ?? sop.currentVersion?.content ?? '',
      requiresAcknowledgement: sop.requiresAcknowledgement,
      reviewPeriodMonths: sop.reviewPeriodMonths,
    });
  }, [sopQuery.data, reset]);

  const previewTitle = watch('title');
  const previewContent = watch('content');

  async function persist(values: EditorOutput, intent: 'save' | 'submit') {
    setSaving(intent);
    try {
      let sopId = id;
      if (isEdit && sopId) {
        await api.patch(`/sops/${sopId}`, {
          title: values.title,
          summary: values.summary,
          content: values.content,
          requiresAcknowledgement: values.requiresAcknowledgement,
          reviewPeriodMonths: values.reviewPeriodMonths,
        });
      } else {
        const created = await api.post<{ id: string }>('/sops', values);
        sopId = created.id;
      }

      if (intent === 'submit' && sopId) {
        await api.post(`/sops/${sopId}/submit`);
      }

      refresh();
      toast.success(intent === 'submit' ? 'SOP diajukan untuk review' : 'Draft tersimpan');
      if (sopId) navigate(`/sop/${sopId}`, { replace: true });
    } catch (error) {
      const fields = fieldErrors(error);
      const entries = Object.entries(fields);
      for (const [field, message] of entries) {
        setError(field as keyof EditorInput, { message });
      }
      if (entries.length > 0) return;

      // Kode duplikat tidak dikirim sebagai detail 422, jadi dipetakan ke field kode.
      if (error instanceof ApiError && error.status === 409 && !isEdit) {
        setError('code', { message: error.message });
        return;
      }
      toast.error(errorMessage(error));
    } finally {
      setSaving(null);
    }
  }

  const save = handleSubmit((values) => persist(values, 'save'));
  const saveAndSubmit = handleSubmit((values) => persist(values, 'submit'));

  if (isEdit) {
    if (sopQuery.isPending) return <EditorSkeleton />;
    if (sopQuery.isError) {
      if (sopQuery.error instanceof ApiError && sopQuery.error.status === 404) {
        return (
          <GateCard
            title="SOP tidak ditemukan"
            description="SOP ini tidak ada, atau Anda tidak memiliki akses untuk menyuntingnya."
            action={
              <Button asChild variant="outline">
                <Link to="/sop">Kembali ke daftar SOP</Link>
              </Button>
            }
          />
        );
      }
      return <ErrorState error={sopQuery.error} onRetry={() => void sopQuery.refetch()} />;
    }
    if (sopQuery.data.owner.id !== user?.id) {
      return (
        <GateCard
          title="Bukan SOP Anda"
          description="Hanya PIC pemilik SOP yang dapat menyunting isi dokumen ini."
          action={
            <Button asChild variant="outline">
              <Link to={`/sop/${sopQuery.data.id}`}>Lihat detail SOP</Link>
            </Button>
          }
        />
      );
    }
    if (sopQuery.data.status !== 'DRAFT') return <NeedsNewVersion sop={sopQuery.data} />;
  }

  return (
    <div className="space-y-5">
      <header>
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/sop" className="hover:text-foreground">
            Perpustakaan SOP
          </Link>
          <span aria-hidden>/</span>
          <span>{sopQuery.data?.code ?? 'SOP baru'}</span>
          <span aria-hidden>/</span>
          <span>{isEdit ? 'Sunting' : 'Baru'}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1>{isEdit ? 'Sunting SOP' : 'SOP baru'}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Perubahan tersimpan sebagai draft. SOP lama tetap berlaku sampai versi baru diterbitkan.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5 text-xs font-normal">
            {isEdit ? 'Status draft' : 'Draft baru'}
          </Badge>
        </div>
      </header>

      <form
        onSubmit={(event) => event.preventDefault()}
        noValidate
        className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_404px]"
      >
        <section className="rounded-xl border border-[#ededed] bg-card">
          <header className="border-b border-[#ededed] px-5 py-4">
            <h2 className="text-[15px] font-medium">Detail SOP</h2>
          </header>

          <div className="space-y-5 px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow label="Kode SOP" htmlFor="code" error={errors.code?.message} hint="Format: SOP-XXX-001">
                <Input
                  id="code"
                  placeholder="SOP-OPR-004"
                  disabled={isEdit}
                  className="uppercase disabled:bg-secondary disabled:opacity-100"
                  aria-invalid={Boolean(errors.code)}
                  {...register('code')}
                />
              </FormRow>

              <FormRow label="Departemen">
                <Input value={user?.departmentName ?? '—'} readOnly disabled />
              </FormRow>
            </div>

            <FormRow label="Judul SOP" htmlFor="title" error={errors.title?.message}>
              <Input
                id="title"
                placeholder="Prosedur …"
                aria-invalid={Boolean(errors.title)}
                {...register('title')}
              />
            </FormRow>

            <FormRow
              label="Ringkasan"
              htmlFor="summary"
              error={errors.summary?.message}
              hint="Satu atau dua kalimat, tampil di daftar SOP."
            >
              <Textarea id="summary" rows={2} className="min-h-[64px]" {...register('summary')} />
            </FormRow>

            <Controller
              control={control}
              name="requiresAcknowledgement"
              render={({ field }) => (
                <label htmlFor="requires-ack" className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id="requires-ack"
                    checked={field.value ?? false}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  Wajib konfirmasi baca oleh karyawan departemen
                </label>
              )}
            />

            <FormRow
              label="Tinjau ulang setiap (bulan)"
              htmlFor="reviewPeriodMonths"
              error={errors.reviewPeriodMonths?.message}
            >
              <Input
                id="reviewPeriodMonths"
                type="number"
                min={1}
                max={60}
                className="w-24"
                aria-invalid={Boolean(errors.reviewPeriodMonths)}
                {...register('reviewPeriodMonths', { valueAsNumber: true })}
              />
            </FormRow>

            <FormRow
              label="Isi SOP (Markdown)"
              htmlFor="content"
              error={errors.content?.message}
              hint="Gunakan # untuk judul bagian dan 1. untuk langkah berurut."
            >
              <Textarea
                id="content"
                className="min-h-[150px] font-mono text-[13px] leading-6"
                aria-invalid={Boolean(errors.content)}
                {...register('content')}
              />
            </FormRow>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <section className="rounded-xl border border-[#ededed] bg-card">
            <header className="flex items-center justify-between border-b border-[#ededed] px-5 py-4">
              <h2 className="text-[15px] font-medium">Pratinjau</h2>
              <span className="text-xs text-muted-foreground">Markdown</span>
            </header>

            <div className="px-5 py-5">
              {previewContent?.trim() ? (
                <Markdown text={previewContent} />
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p className="text-[17px] font-medium text-foreground">
                    {previewTitle?.trim() || 'Judul SOP'}
                  </p>
                  <p className="mt-2">Isi SOP akan tampil di sini saat Anda menulis.</p>
                </div>
              )}

              <p className="mt-5 border-t border-[#ededed] pt-4 text-xs text-muted-foreground">
                Pratinjau mengikuti format markdown. Tidak ada HTML mentah yang dirender.
              </p>
            </div>

            <footer className="flex flex-wrap justify-end gap-2 border-t border-[#ededed] px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEdit && id ? `/sop/${id}` : '/sop')}
              >
                Batal
              </Button>
              <Button type="button" variant="outline" onClick={save} disabled={saving !== null}>
                {saving === 'save' ? 'Menyimpan…' : 'Simpan'}
              </Button>
              <Button type="button" onClick={saveAndSubmit} disabled={saving !== null}>
                {saving === 'submit' ? 'Mengajukan…' : 'Ajukan review'}
              </Button>
            </footer>
          </section>
        </aside>
      </form>
    </div>
  );
}
