export interface SopFilters {
  q?: string;
  department?: string;
  status?: string;
  requiresAck?: string;
  page?: number;
  limit?: number;
}

export interface AuditFilters {
  action?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}

export const queryKeys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  sops: (filters: SopFilters) => ['sops', filters] as const,
  sopsAll: ['sops'] as const,
  sop: (id: string) => ['sop', id] as const,
  announcements: ['announcements'] as const,
  reports: ['reports'] as const,
  audit: (filters: AuditFilters) => ['audit', filters] as const,
  auditEntities: ['audit-entities'] as const,
  users: ['users'] as const,
};
