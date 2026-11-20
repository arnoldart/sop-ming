import { z } from 'zod';

/* ---------- Peran & status ---------- */

export const ROLES = [
  'KARYAWAN',
  'PIC_SOP',
  'MANAGER',
  'HRD',
  'AUDITOR',
  'MANAJEMEN',
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  KARYAWAN: 'Karyawan',
  PIC_SOP: 'PIC SOP',
  MANAGER: 'Manager',
  HRD: 'HRD',
  AUDITOR: 'Auditor',
  MANAJEMEN: 'Manajemen',
};

export const SOP_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'SUPERSEDED',
  'ARCHIVED',
] as const;
export type SopStatus = (typeof SOP_STATUSES)[number];

export const STATUS_LABEL: Record<SopStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'Menunggu persetujuan',
  APPROVED: 'Siap terbit',
  PUBLISHED: 'Terbit',
  SUPERSEDED: 'Digantikan',
  ARCHIVED: 'Diarsipkan',
};

/* ---------- State machine (satu sumber kebenaran) ---------- */

export type SopAction = 'SUBMIT' | 'APPROVE' | 'REJECT' | 'PUBLISH';

export interface TransitionRule {
  action: SopAction;
  from: SopStatus;
  to: SopStatus;
  roles: readonly Role[];
}

/**
 * Satu-satunya daftar transisi yang sah. Server menolak apa pun di luar daftar ini;
 * UI memakai daftar yang sama untuk menampilkan tombol.
 */
export const TRANSITION_RULES: readonly TransitionRule[] = [
  { action: 'SUBMIT', from: 'DRAFT', to: 'IN_REVIEW', roles: ['PIC_SOP'] },
  { action: 'APPROVE', from: 'IN_REVIEW', to: 'APPROVED', roles: ['MANAGER'] },
  { action: 'REJECT', from: 'IN_REVIEW', to: 'DRAFT', roles: ['MANAGER'] },
  { action: 'REJECT', from: 'APPROVED', to: 'DRAFT', roles: ['HRD'] },
  { action: 'PUBLISH', from: 'APPROVED', to: 'PUBLISHED', roles: ['HRD'] },
];

export function findRule(action: SopAction, from: SopStatus): TransitionRule | undefined {
  return TRANSITION_RULES.find((r) => r.action === action && r.from === from);
}

/** Aksi yang mungkin dari status tertentu. UI memakai ini untuk menampilkan tombol. */
export function allowedActions(status: SopStatus): SopAction[] {
  return [...new Set(TRANSITION_RULES.filter((r) => r.from === status).map((r) => r.action))];
}

/* ---------- Skema validasi bersama ---------- */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const createSopSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^SOP-[A-Z]{2,5}-\d{3}$/, 'Format kode: SOP-XXX-001'),
  title: z.string().trim().min(5, 'Judul minimal 5 karakter').max(200),
  summary: z.string().trim().max(500).optional().default(''),
  content: z.string().trim().min(50, 'Isi minimal 50 karakter'),
  requiresAcknowledgement: z.boolean().default(false),
  reviewPeriodMonths: z.number().int().min(1).max(60).default(12),
});

export const updateSopSchema = createSopSchema
  .omit({ code: true })
  .partial();

export const newVersionSchema = z.object({
  changeSummary: z.string().trim().min(10, 'Ringkasan perubahan minimal 10 karakter'),
});

export const rejectSchema = z.object({
  note: z.string().trim().min(10, 'Alasan penolakan minimal 10 karakter'),
});

export const publishSchema = z.object({
  effectiveDate: z.coerce.date(),
});

export const acknowledgeSchema = z.object({});

export const announcementSchema = z.object({
  title: z.string().trim().min(5).max(200),
  body: z.string().trim().min(10),
  sopId: z.string().uuid().nullish(),
  targetDepartmentId: z.string().uuid().nullish(),
});

export const reportSchema = z.object({
  sopId: z.string().uuid().nullish(),
  description: z.string().trim().min(20, 'Deskripsi minimal 20 karakter'),
  anonymous: z.boolean().default(false),
});

export const REPORT_STATUSES = [
  'OPEN',
  'TRIAGED',
  'INVESTIGATING',
  'RESOLVED',
  'CLOSED',
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const followUpSchema = z.object({
  status: z.enum(REPORT_STATUSES),
  note: z.string().trim().min(5, 'Catatan minimal 5 karakter'),
});

/* ---------- Tipe respons API ---------- */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  departmentId: string | null;
  departmentName: string | null;
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
