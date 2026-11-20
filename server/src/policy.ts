import type { Role } from '@sop/shared';

export type Permission =
  | 'sop:read'
  | 'sop:write'
  | 'sop:submit'
  | 'sop:approve'
  | 'sop:reject'
  | 'sop:publish'
  | 'sop:ack'
  | 'sop:compliance:read'
  | 'announcement:write'
  | 'report:create'
  | 'report:triage'
  | 'audit:read'
  | 'dashboard:read'
  | 'user:read';

/**
 * Satu-satunya sumber kebenaran otorisasi. Tambah izin di sini, bukan di route.
 * Catatan: izin di sini bersifat peran; batas kepemilikan (dept/pemilik) diperiksa di service.
 */
export const MATRIX: Record<Permission, readonly Role[]> = {
  'sop:read': ['KARYAWAN', 'PIC_SOP', 'MANAGER', 'HRD', 'AUDITOR', 'MANAJEMEN'],
  'sop:write': ['PIC_SOP'],
  'sop:submit': ['PIC_SOP'],
  'sop:approve': ['MANAGER'],
  'sop:reject': ['MANAGER', 'HRD'],
  'sop:publish': ['HRD'],
  'sop:ack': ['KARYAWAN', 'PIC_SOP', 'MANAGER', 'HRD'],
  'sop:compliance:read': ['PIC_SOP', 'MANAGER', 'HRD'],
  'announcement:write': ['HRD'],
  'report:create': ['KARYAWAN', 'PIC_SOP', 'MANAGER', 'HRD', 'AUDITOR', 'MANAJEMEN'],
  'report:triage': ['MANAGER', 'HRD'],
  'audit:read': ['AUDITOR', 'HRD'],
  'dashboard:read': ['KARYAWAN', 'PIC_SOP', 'MANAGER', 'HRD', 'AUDITOR', 'MANAJEMEN'],
  'user:read': ['AUDITOR', 'HRD'],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[permission].includes(role);
}
