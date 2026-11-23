import type { Role } from '@sop/shared';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, FileText, Flag, History, LayoutDashboard, Megaphone, Users } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  end?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const ALL: Role[] = ['KARYAWAN', 'PIC_SOP', 'MANAGER', 'HRD', 'AUDITOR', 'MANAJEMEN'];
const AUDIT_ROLES: Role[] = ['AUDITOR', 'HRD'];

/** Sumber: server/src/policy.ts — jangan menambah menu yang tidak diizinkan server. */
export const NAV: NavGroup[] = [
  {
    title: 'Menu Utama',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ALL, end: true },
      { to: '/sop', label: 'Perpustakaan SOP', icon: FileText, roles: ALL },
    ],
  },
  {
    title: 'Lainnya',
    items: [
      { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone, roles: ALL },
      { to: '/laporan', label: 'Laporan', icon: Flag, roles: ALL },
      { to: '/audit', label: 'Audit Log', icon: History, roles: AUDIT_ROLES },
      { to: '/pengguna', label: 'Pengguna', icon: Users, roles: AUDIT_ROLES },
      { to: '/panduan', label: 'Panduan', icon: BookOpen, roles: ALL },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}
