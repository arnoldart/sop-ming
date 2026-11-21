import type { ReportStatus, Role, SopAction, SopStatus } from '@sop/shared';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: ApiErrorDetail[];

  constructor(status: number, code: string, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const text = await res.text();
  const body: unknown = text ? parseJson(text) : null;

  if (!res.ok) {
    const err = errorBody(body);
    throw new ApiError(
      res.status,
      err.code ?? 'ERROR',
      err.message ?? 'Permintaan gagal',
      err.details,
    );
  }
  return body as T;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

interface ErrorBody {
  code?: string;
  message?: string;
  details?: ApiErrorDetail[];
}

function errorBody(body: unknown): ErrorBody {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const err = (body as { error?: unknown }).error;
    if (typeof err === 'object' && err !== null) return err as ErrorBody;
  }
  return {};
}

/** Ubah `details` 422 menjadi peta field → pesan, untuk dipasang ke react-hook-form. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.details) return {};
  return Object.fromEntries(error.details.map((d) => [d.field, d.message]));
}

/** Pesan siap tampil untuk toast; server selalu mengirim pesan berbahasa Indonesia. */
export function errorMessage(error: unknown, fallback = 'Terjadi kesalahan. Coba lagi.') {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
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
  status: SopStatus;
  department: { id: string; name: string };
  ownerName: string;
  requiresAcknowledgement: boolean;
  isPublished: boolean;
  versionNo: number | null;
  effectiveDate: string | null;
  acknowledgementCount: number;
  acknowledgedByMe: boolean;
  updatedAt: string;
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
  status: SopStatus;
  changeSummary: string;
  content?: string;
  effectiveDate: string | null;
  publishedAt: string | null;
  createdAt: string;
  /** Hanya ada pada ringkasan riwayat versi, bukan pada currentVersion/draftVersion. */
  authorName?: string;
  authorRole?: Role;
}

export interface SopDetail {
  id: string;
  code: string;
  title: string;
  summary: string;
  status: SopStatus;
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
  allowedActions: SopAction[];
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
  status: ReportStatus;
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
  actorRole: Role | null;
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
