import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SopDetail } from '@/lib/api';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSopRefresh } from '@/lib/sopMutations';
import { NewVersionDialog } from '@/components/sop/NewVersionDialog';
import { PublishDialog } from '@/components/sop/PublishDialog';
import { RejectDialog } from '@/components/sop/RejectDialog';
import { Button } from '@/components/ui/button';

/** Peran yang boleh mengonfirmasi, sejalan dengan izin `sop:ack` di policy.ts. */
const ACK_ROLES = ['KARYAWAN', 'PIC_SOP', 'MANAGER', 'HRD'];

export function ActionBar({ sop }: { sop: SopDetail }) {
  const { user } = useAuth();
  const refresh = useSopRefresh(sop.id);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);

  const transition = useMutation({
    mutationFn: (action: 'SUBMIT' | 'APPROVE') =>
      api.post(`/sops/${sop.id}/${action.toLowerCase()}`),
    onSuccess: (_result, action) => {
      refresh();
      toast.success(action === 'SUBMIT' ? 'SOP diajukan untuk review' : 'SOP disetujui');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const acknowledge = useMutation({
    mutationFn: () => api.post<{ alreadyAcknowledged: boolean }>(`/sops/${sop.id}/acknowledge`),
    onSuccess: (result) => {
      refresh();
      toast.success(
        result.alreadyAcknowledged ? 'Anda sudah mengonfirmasi versi ini' : 'Konfirmasi baca tersimpan',
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const isOwner = user?.id === sop.owner.id;
  const canAcknowledge = user
    ? sop.requiresAcknowledgement &&
      sop.currentVersion?.status === 'PUBLISHED' &&
      ACK_ROLES.includes(user.role) &&
      user.departmentId === sop.department.id
    : false;

  const hasPrimaryTransition = sop.allowedActions.some((action) =>
    ['SUBMIT', 'APPROVE', 'PUBLISH'].includes(action),
  );
  const showNewVersion = isOwner && sop.status === 'PUBLISHED';
  // Satu layar hanya boleh punya satu tombol hijau.
  const acknowledgeIsPrimary = !hasPrimaryTransition && !showNewVersion;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isOwner && sop.status === 'DRAFT' ? (
        <Button asChild variant="outline">
          <Link to={`/sop/${sop.id}/edit`}>Sunting</Link>
        </Button>
      ) : null}

      {showNewVersion ? (
        <Button onClick={() => setVersionOpen(true)}>Buat versi baru</Button>
      ) : null}

      {sop.allowedActions.includes('REJECT') ? (
        <Button variant="outline" className="text-destructive" onClick={() => setRejectOpen(true)}>
          Tolak
        </Button>
      ) : null}

      {sop.allowedActions.includes('APPROVE') ? (
        <Button disabled={transition.isPending} onClick={() => transition.mutate('APPROVE')}>
          {transition.isPending ? 'Memproses…' : 'Setujui'}
        </Button>
      ) : null}

      {sop.allowedActions.includes('SUBMIT') ? (
        <Button disabled={transition.isPending} onClick={() => transition.mutate('SUBMIT')}>
          {transition.isPending ? 'Memproses…' : 'Ajukan review'}
        </Button>
      ) : null}

      {sop.allowedActions.includes('PUBLISH') ? (
        <Button onClick={() => setPublishOpen(true)}>Terbitkan</Button>
      ) : null}

      {canAcknowledge && sop.acknowledgedByMe ? (
        <span className="text-[13px] text-muted-foreground">Sudah dikonfirmasi</span>
      ) : null}

      {canAcknowledge && !sop.acknowledgedByMe ? (
        <Button
          variant={acknowledgeIsPrimary ? 'default' : 'outline'}
          disabled={acknowledge.isPending}
          onClick={() => acknowledge.mutate()}
        >
          {acknowledge.isPending ? 'Menyimpan…' : 'Konfirmasi baca'}
        </Button>
      ) : null}

      <RejectDialog sopId={sop.id} open={rejectOpen} onOpenChange={setRejectOpen} />
      <PublishDialog sopId={sop.id} open={publishOpen} onOpenChange={setPublishOpen} />
      <NewVersionDialog sopId={sop.id} open={versionOpen} onOpenChange={setVersionOpen} />
    </div>
  );
}
