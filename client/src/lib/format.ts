export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  // Bentuk "14 Nov 2026 · 09.12" mengikuti frame desain, dan tidak bergantung locale mesin.
  return `${formatDate(value)} · ${hours}.${minutes}`;
}

export function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return formatDate(value);
}

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'Menunggu persetujuan',
  APPROVED: 'Siap terbit',
  PUBLISHED: 'Terbit',
  SUPERSEDED: 'Digantikan',
  ARCHIVED: 'Diarsipkan',
  OPEN: 'Baru',
  TRIAGED: 'Diverifikasi',
  INVESTIGATING: 'Investigasi',
  RESOLVED: 'Selesai',
  CLOSED: 'Ditutup',
};

export const ACTION_LABEL: Record<string, string> = {
  SUBMIT: 'Diajukan',
  APPROVE: 'Disetujui',
  REJECT: 'Ditolak',
  PUBLISH: 'Diterbitkan',
  SOP_CREATED: 'SOP dibuat',
  SOP_UPDATED: 'SOP disunting',
  SOP_SUBMITTED: 'Diajukan untuk persetujuan',
  SOP_APPROVED: 'Disetujui manager',
  SOP_REJECTED: 'Ditolak',
  SOP_PUBLISHED: 'Diterbitkan',
  SOP_VERSION_CREATED: 'Versi baru dibuat',
  SOP_ACKNOWLEDGED: 'Konfirmasi baca',
  AUTH_LOGIN: 'Masuk',
  AUTH_LOGOUT: 'Keluar',
  ANNOUNCEMENT_CREATED: 'Pengumuman dibuat',
  ANNOUNCEMENT_DELETED: 'Pengumuman dihapus',
  REPORT_CREATED: 'Laporan dibuat',
  REPORT_STATUS_CHANGED: 'Status laporan diubah',
};

/** `entityType` di audit log memakai nama model Prisma, bukan bahasa Indonesia. */
export const ENTITY_LABEL: Record<string, string> = {
  Sop: 'SOP',
  Announcement: 'Pengumuman',
  ViolationReport: 'Laporan',
  User: 'Pengguna',
};

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function percent(part: number, total: number) {
  if (total === 0) return 100;
  return Math.round((part / total) * 100);
}
