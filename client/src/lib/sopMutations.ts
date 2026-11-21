import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

/**
 * Setelah mutasi SOP, tiga cache ini selalu ikut berubah: detail SOP, daftar SOP,
 * dan angka ringkasan di dashboard.
 */
export function useSopRefresh(sopId?: string) {
  const queryClient = useQueryClient();

  return () => {
    if (sopId) void queryClient.invalidateQueries({ queryKey: queryKeys.sop(sopId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sopsAll });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}
