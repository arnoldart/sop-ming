import type { Role } from '@sop/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiError(
      res.status,
      err.code ?? 'ERROR',
      err.message ?? 'Permintaan gagal',
      err.details,
    );
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/* ---------- Tipe respons, mengikuti bentuk yang dikembalikan service ---------- */

export interface Me {
  id: string;
  email: string;
  name: string;
  role: Role;
  departmentId: string | null;
  departmentName: string | null;
}

export interface SopListItem {
  id: string;
  code: string;
  title: string;
  summary: string;
  status: string;
  department: { id: string; name: string };
  ownerName: string;
  requiresAcknowledgement: boolean;
  isPublished: boolean;
  versionNo: number | null;
  effectiveDate: string | null;
  acknowledgementCount: number;
  acknowledgedByMe: boolean;
}

export interface SopListResponse {
  total: number;
  page: number;
  limit: number;
  items: SopListItem[];
}

export interface SopVersion {
  id: string;
  versionNo: number;
  status: string;
  changeSummary: string;
  content?: string;
  effectiveDate: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface SopDetail {
  id: string;
  code: string;
  title: string;
  summary: string;
  status: string;
  department: { id: string; name: string };
  owner: { id: string; name: string };
  requiresAcknowledgement: boolean;
  reviewPeriodMonths: number;
  nextReviewAt: string | null;
  currentVersion: SopVersion | null;
  draftVersion: SopVersion | null;
  versions: SopVersion[];
  approvals: {
    id: string;
    action: string;
    note: string;
    createdAt: string;
    actorName: string;
    actorRole: string;
  }[];
  acknowledgedByMe: boolean;
  acknowledgedAt: string | null;
  compliance: {
    total: number;
    acknowledged: number;
    pending: { name: string; email: string }[];
  } | null;
  allowedActions: string[];
}

export interface DashboardSummary {
  cards: {
    published: number;
    pendingForMe: number;
    awaitingMyAcknowledgement: number;
    compliancePercent: number;
    openReports: number;
  };
  pendingActions: {
    id: string;
    code: string;
    title: string;
    status: string;
    department: string;
    versionNo: number | null;
    updatedAt: string;
  }[];
  awaitingAcknowledgement: { id: string; code: string; title: string; updatedAt: string }[];
  lowestCompliance: {
    id: string;
    code: string;
    title: string;
    department: string;
    target: number;
    acknowledged: number;
    percent: number;
  }[];
  announcements: {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    authorName: string;
    sopId: string | null;
  }[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  authorName: string;
  sop: { id: string; code: string; title: string } | null;
  targetDepartmentId: string | null;
}

export interface Report {
  id: string;
  description: string;
  status: string;
  createdAt: string;
  sop: { id: string; code: string; title: string } | null;
  anonymous: boolean;
  assignedTo: string | null;
  followUps: {
    id: string;
    fromStatus: string;
    toStatus: string;
    note: string;
    createdAt: string;
  }[];
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string;
  actorRole: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
}

export interface AuditResponse {
  total: number;
  page: number;
  limit: number;
  items: AuditEntry[];
}

export interface UsersResponse {
  departments: { id: string; code: string; name: string }[];
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string | null;
    isActive: boolean;
    createdAt: string;
  }[];
}
