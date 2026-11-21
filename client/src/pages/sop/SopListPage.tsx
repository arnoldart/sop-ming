import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FileText, Plus, RotateCcw } from 'lucide-react';
import { api, type SopListResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { queryKeys, type SopFilters as SopFilterState } from '@/lib/queryKeys';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { SopFilters } from '@/components/sop/SopFilters';
import { SopTable, SopTableSkeleton } from '@/components/sop/SopTable';
import { Button } from '@/components/ui/button';

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

function readFilters(params: URLSearchParams): SopFilterState {
  const page = Number(params.get('page'));
  return {
    q: params.get('q')?.trim() || undefined,
    department: params.get('department') || undefined,
    status: params.get('status') || undefined,
    requiresAck: params.get('requiresAck') || undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: LIMIT,
  };
}

function toQueryString(filters: SopFilterState) {
  const search = new URLSearchParams();
  if (filters.q) search.set('q', filters.q);
  if (filters.department) search.set('department', filters.department);
  if (filters.status) search.set('status', filters.status);
  if (filters.requiresAck) search.set('requiresAck', filters.requiresAck);
  search.set('page', String(filters.page ?? 1));
  search.set('limit', String(filters.limit ?? LIMIT));
  return search.toString();
}

export function SopListPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [search, setSearch] = useState(filters.q ?? '');

  // Ikuti URL bila berubah dari luar (mis. kotak pencarian di topbar).
  useEffect(() => {
    setSearch(filters.q ?? '');
  }, [filters.q]);

  function update(mutate: (next: URLSearchParams) => void) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        mutate(next);
        return next;
      },
      { replace: true },
    );
  }

  // Debounce 300 ms supaya setiap ketikan tidak menjadi request.
  useEffect(() => {
    if (search === (filters.q ?? '')) return;
    const timer = setTimeout(() => {
      update((next) => {
        const value = search.trim();
        if (value) next.set('q', value);
        else next.delete('q');
        next.delete('page');
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `update` sengaja tidak masuk dependensi: identitasnya berubah tiap render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters.q]);

  function setFilter(key: 'department' | 'status' | 'requiresAck', value?: string) {
    update((next) => {
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
    });
  }

  const listQuery = useQuery({
    queryKey: queryKeys.sops(filters),
    queryFn: () => api.get<SopListResponse>(`/sops?${toQueryString(filters)}`),
    placeholderData: keepPreviousData,
  });

  // Satu-satunya sumber daftar departemen adalah endpoint /users yang hanya
  // terbuka untuk HRD/AUDITOR, jadi opsi filter diturunkan dari SOP yang terlihat.
  const departmentQuery = useQuery({
    queryKey: queryKeys.sops({ limit: 50 }),
    queryFn: () => api.get<SopListResponse>('/sops?limit=50'),
    staleTime: 5 * 60 * 1000,
  });

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of departmentQuery.data?.items ?? []) {
      map.set(item.department.id, item.department.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departmentQuery.data]);

  const hasFilter = Boolean(
    filters.q || filters.department || filters.status || filters.requiresAck,
  );
  const data = listQuery.data;

  return (
    <>
      <PageHeader
        title="Perpustakaan SOP"
        description="SOP yang berlaku untuk Anda, beserta draft departemen yang sedang diproses."
        actions={
          user?.role === 'PIC_SOP' ? (
            <Button asChild>
              <Link to="/sop/new">
                <Plus className="size-4" aria-hidden />
                Buat SOP
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <SopFilters
          search={search}
          onSearchChange={setSearch}
          department={filters.department}
          onDepartmentChange={(value) => setFilter('department', value)}
          status={filters.status}
          onStatusChange={(value) => setFilter('status', value)}
          requiresAck={filters.requiresAck === 'true'}
          onRequiresAckChange={(checked) => setFilter('requiresAck', checked ? 'true' : undefined)}
          departments={departments}
        />

        {listQuery.isPending ? (
          <SopTableSkeleton />
        ) : listQuery.isError ? (
          <ErrorState error={listQuery.error} onRetry={() => void listQuery.refetch()} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={hasFilter ? 'Tidak ada SOP yang cocok' : 'Belum ada SOP'}
            description={
              hasFilter
                ? 'Coba kata kunci lain, atau hapus filter yang sedang aktif.'
                : 'SOP yang dibuat PIC akan muncul di sini setelah diajukan.'
            }
            action={
              hasFilter ? (
                <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                  <RotateCcw className="size-4" aria-hidden />
                  Hapus filter
                </Button>
              ) : undefined
            }
          />
        ) : data ? (
          <>
            <SopTable items={data.items} />
            <Pagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              noun="SOP"
              onPageChange={(page) => update((next) => next.set('page', String(page)))}
            />
          </>
        ) : null}
      </div>
    </>
  );
}
