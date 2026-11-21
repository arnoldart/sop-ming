import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage, type Announcement, type UsersResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { queryKeys } from '@/lib/queryKeys';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm';
import {
  AnnouncementList,
  AnnouncementListSkeleton,
} from '@/components/announcements/AnnouncementList';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AnnouncementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHrd = user?.role === 'HRD';
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.announcements,
    queryFn: () => api.get<{ items: Announcement[] }>('/announcements'),
  });

  // Daftar departemen hanya tersedia lewat /users, yang memang hanya untuk HRD/AUDITOR.
  const departmentsQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.get<UsersResponse>('/users'),
    enabled: isHrd,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/announcements/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.announcements });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast.success('Pengumuman dihapus');
      setPendingDelete(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <>
      <PageHeader
        title="Pengumuman"
        description="Sosialisasi dan pemberitahuan terkait SOP. Hanya HRD yang dapat menerbitkan."
      />

      <div className="space-y-4">
        {isHrd ? <AnnouncementForm /> : null}

        {listQuery.isPending ? (
          <AnnouncementListSkeleton />
        ) : listQuery.isError ? (
          <ErrorState error={listQuery.error} onRetry={() => void listQuery.refetch()} />
        ) : (
          <AnnouncementList
            items={listQuery.data.items}
            departments={departmentsQuery.data?.departments ?? []}
            ownDepartment={
              user?.departmentId && user.departmentName
                ? { id: user.departmentId, name: user.departmentName }
                : undefined
            }
            canManage={isHrd}
            onDelete={setPendingDelete}
          />
        )}
      </div>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengumuman?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” akan dihapus dari semua penerima. Penghapusan ini tercatat di
              audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
              }}
            >
              {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
