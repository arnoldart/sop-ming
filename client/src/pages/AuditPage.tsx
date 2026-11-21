import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, RotateCcw, ScrollText } from 'lucide-react';
import type { Role } from '@sop/shared';
import { ROLE_LABEL } from '@sop/shared';
import {
  api,
  type AuditEntry,
  type AuditResponse,
  type SopListResponse,
  type UsersResponse,
} from '@/lib/api';
import { ACTION_LABEL, ENTITY_LABEL, formatDateTime } from '@/lib/format';
import { queryKeys, type AuditFilters as AuditFilterState } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { AuditFilters } from '@/components/audit/AuditFilters';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

const LIMIT = 30;
const SEARCH_DEBOUNCE_MS = 300;
const HEAD =
  'h-10 px-4 text-[12px] font-medium tracking-[0.04em] text-muted-foreground uppercase';

function readFilters(params: URLSearchParams): AuditFilterState {
  const page = Number(params.get('page'));
  return {
    action: params.get('action')?.trim() || undefined,
    entityType: params.get('entityType') || undefined,
    actorId: params.get('actorId') || undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: LIMIT,
  };
}

function toQueryString(filters: AuditFilterState) {
  const search = new URLSearchParams();
  if (filters.action) search.set('action', filters.action);
  if (filters.entityType) search.set('entityType', filters.entityType);
  if (filters.actorId) search.set('actorId', filters.actorId);
  search.set('page', String(filters.page ?? 1));
  search.set('limit', String(filters.limit ?? LIMIT));
  return search.toString();
}

type Payload = Record<string, unknown> | null;

function asRecord(value: unknown): Payload {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Kunci yang benar-benar berubah, untuk payload berbentuk daftar field. */
function payloadKeys(payload: Payload) {
  if (!payload) return [];
  return Object.keys(payload).filter(
    (key) => payload[key] !== null && payload[key] !== undefined,
  );
}

/**
 * Ringkasan kolom "Perubahan" dari `before`/`after`. Bentuk payload ditentukan
 * server per aksi, jadi tiap cabang di bawah mengikuti bentuk nyata di service.
 */
function changeSummary(action: string, before: unknown, after: unknown) {
  const prev = asRecord(before);
  const next = asRecord(after);

  if (next && typeof next.versionNo === 'number') {
    return action === 'SOP_ACKNOWLEDGED' ? `ack v${next.versionNo}` : `versionNo ${next.versionNo}`;
  }
  if (prev && next && typeof prev.status === 'string' && typeof next.status === 'string') {
    return prev.status === next.status ? next.status : `${prev.status} → ${next.status}`;
  }
  if (next && Array.isArray(next.changedFields) && next.changedFields.length > 0) {
    return next.changedFields.join(', ');
  }
  const keys = payloadKeys(next);
  if (keys.length > 0) return keys.join(', ');
  const prevKeys = payloadKeys(prev);
  return prevKeys.length > 0 ? prevKeys.join(', ') : null;
}

function hasPayload(entry: AuditEntry) {
  return entry.before !== null || entry.after !== null;
}

/**
 * Ringkasan perubahan tetap satu baris agar tinggi baris seragam; payload mentah
 * dibuka lewat `<details>` di sel yang sama.
 */
function ChangeCell({ entry }: { entry: AuditEntry }) {
  const summary = changeSummary(entry.action, entry.before, entry.after);

  if (!hasPayload(entry)) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <details className="group">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 select-none [&::-webkit-details-marker]:hidden">
        <span className={summary ? undefined : 'text-muted-foreground'}>{summary ?? 'Lihat detail'}</span>
        <ChevronRight
          className="size-3 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          aria-hidden
        />
      </summary>
      <pre className="mt-1 max-w-[360px] overflow-x-auto rounded-md bg-secondary px-2 py-1.5 font-mono text-[11px] leading-4 whitespace-pre-wrap">
        {JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}
      </pre>
    </details>
  );
}

export function AuditPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [action, setAction] = useState(filters.action ?? '');

  // Ikuti URL bila berubah dari luar (mis. tombol kembali browser).
  useEffect(() => {
    setAction(filters.action ?? '');
  }, [filters.action]);

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
    if (action === (filters.action ?? '')) return;
    const timer = setTimeout(() => {
      update((next) => {
        const value = action.trim();
        if (value) next.set('action', value);
        else next.delete('action');
        next.delete('page');
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `update` sengaja tidak masuk dependensi: identitasnya berubah tiap render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, filters.action]);

  const auditQuery = useQuery({
    queryKey: queryKeys.audit(filters),
    queryFn: () => api.get<AuditResponse>(`/audit-logs?${toQueryString(filters)}`),
    placeholderData: keepPreviousData,
  });

  const entitiesQuery = useQuery({
    queryKey: queryKeys.auditEntities,
    queryFn: () => api.get<{ items: { entityType: string; count: number }[] }>('/audit-logs/entities'),
    staleTime: 5 * 60 * 1000,
  });

  // entityId adalah id internal; kode SOP lebih terbaca di kolom Entitas.
  const sopsQuery = useQuery({
    queryKey: queryKeys.sops({ limit: 100 }),
    queryFn: () => api.get<SopListResponse>('/sops?limit=100'),
    staleTime: 5 * 60 * 1000,
  });

  // Opsi filter aktor: /users terbuka untuk peran yang sama dengan audit:read.
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.get<UsersResponse>('/users'),
    staleTime: 5 * 60 * 1000,
  });

  const actors = useMemo(
    () =>
      [...(usersQuery.data?.users ?? [])]
        .map((user) => ({ id: user.id, name: user.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [usersQuery.data],
  );

  const sopCodes = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of sopsQuery.data?.items ?? []) map.set(item.id, item.code);
    return map;
  }, [sopsQuery.data]);

  const entities = useMemo(
    () =>
      [...(entitiesQuery.data?.items ?? [])].sort(
        (a, b) => b.count - a.count || a.entityType.localeCompare(b.entityType),
      ),
    [entitiesQuery.data],
  );

  const hasFilter = Boolean(filters.action || filters.entityType || filters.actorId);
  const data = auditQuery.data;

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Setiap perubahan status SOP tercatat permanen. Tidak ada entri yang dapat diubah atau dihapus."
      />

      <div className="space-y-4">
        <AuditFilters
          action={action}
          onActionChange={setAction}
          entityType={filters.entityType}
          onEntityTypeChange={(value) =>
            update((next) => {
              if (value) next.set('entityType', value);
              else next.delete('entityType');
              next.delete('page');
            })
          }
          actorId={filters.actorId}
          onActorIdChange={(value) =>
            update((next) => {
              if (value) next.set('actorId', value);
              else next.delete('actorId');
              next.delete('page');
            })
          }
          entities={entities}
          actors={actors}
          total={data?.total}
        />

        {auditQuery.isPending ? (
          <AuditTableSkeleton />
        ) : auditQuery.isError ? (
          <ErrorState error={auditQuery.error} onRetry={() => void auditQuery.refetch()} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={hasFilter ? 'Tidak ada entri yang cocok' : 'Belum ada aktivitas'}
            description={
              hasFilter
                ? 'Coba kata kunci aksi lain, atau hapus filter yang sedang aktif.'
                : 'Setiap perubahan SOP, pengumuman, dan laporan akan muncul di sini.'
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
            <AuditTable items={data.items} sopCodes={sopCodes} />
            <Pagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              noun="entri"
              onPageChange={(page) => update((next) => next.set('page', String(page)))}
            />
          </>
        ) : null}
      </div>
    </>
  );
}

function entityRef(entry: AuditEntry, sopCodes: Map<string, string>) {
  if (entry.entityType === 'Sop') return sopCodes.get(entry.entityId) ?? entry.entityId.slice(0, 8);
  return null;
}

function AuditTable({ items, sopCodes }: { items: AuditEntry[]; sopCodes: Map<string, string> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#ededed] bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(HEAD, 'w-[170px]')}>Waktu</TableHead>
            <TableHead className={cn(HEAD, 'w-[190px]')}>Aktor</TableHead>
            <TableHead className={HEAD}>Aksi</TableHead>
            <TableHead className={HEAD}>Entitas</TableHead>
            <TableHead className={HEAD}>Perubahan</TableHead>
            <TableHead className={cn(HEAD, 'w-[130px]')}>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => {
            const ref = entityRef(entry, sopCodes);
            return (
              <TableRow key={entry.id} className="h-14">
                <TableCell className="px-4 py-2.5 text-[13px] text-muted-foreground tabular-nums">
                  {formatDateTime(entry.createdAt)}
                </TableCell>
                <TableCell className="px-4 py-2.5">
                  <span className="block text-[13px] font-medium">{entry.actorName}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {entry.actorRole ? (ROLE_LABEL[entry.actorRole as Role] ?? entry.actorRole) : 'Sistem'}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-2.5">
                  <span
                    className="font-mono text-[12px] tracking-tight"
                    title={ACTION_LABEL[entry.action] ?? entry.action}
                  >
                    {entry.action}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-2.5 text-[13px]">
                  <span>{ENTITY_LABEL[entry.entityType] ?? entry.entityType}</span>
                  {ref ? <span className="text-muted-foreground"> · {ref}</span> : null}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-[13px]">
                  <ChangeCell entry={entry} />
                </TableCell>
                <TableCell className="px-4 py-2.5 font-mono text-[12px] text-muted-foreground tabular-nums">
                  {entry.ip ?? '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function AuditTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#ededed] bg-card">
      <div className="flex h-10 items-center gap-6 border-b px-4">
        {[110, 130, 160, 150, 140, 80].map((width, index) => (
          <Skeleton key={index} className="h-2.5" style={{ width }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-14 items-center gap-6 border-b px-4 last:border-b-0">
          <Skeleton className="h-3 w-[110px]" />
          <div className="w-[130px] space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-14" />
          </div>
          <Skeleton className="h-3 w-[150px]" />
          <Skeleton className="h-3 w-[130px]" />
          <Skeleton className="h-3 w-[120px]" />
          <Skeleton className="h-3 w-[70px]" />
        </div>
      ))}
    </div>
  );
}
