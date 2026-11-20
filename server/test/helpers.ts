import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';

export const app = createApp();
export const PASSWORD = 'password123';

export async function resetDb() {
  await db.reportFollowUp.deleteMany();
  await db.violationReport.deleteMany();
  await db.announcement.deleteMany();
  await db.acknowledgement.deleteMany();
  await db.sopApproval.deleteMany();
  await db.auditLog.deleteMany();
  await db.sop.updateMany({ data: { currentVersionId: null } });
  await db.sopVersion.deleteMany();
  await db.sop.deleteMany();
  await db.user.deleteMany();
  await db.department.deleteMany();
}

export interface Fixtures {
  deptOpr: string;
  deptHrd: string;
  pic: string;
  picOther: string;
  manager: string;
  hrd: string;
  karyawan: string;
  auditor: string;
}

/** Data minimum: satu departemen dengan PIC/Manager/Karyawan, plus HRD dan Auditor. */
export async function seedFixtures(): Promise<Fixtures> {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);

  const opr = await db.department.create({ data: { code: 'OPR', name: 'Operasional' } });
  const hrdDept = await db.department.create({ data: { code: 'HRD', name: 'Human Resources' } });

  const mk = (email: string, role: 'PIC_SOP' | 'MANAGER' | 'HRD' | 'KARYAWAN' | 'AUDITOR', departmentId: string) =>
    db.user.create({ data: { email, name: email.split('@')[0], role, departmentId, passwordHash } });

  const pic = await mk('pic@test.local', 'PIC_SOP', opr.id);
  const picOther = await mk('pic2@test.local', 'PIC_SOP', opr.id);
  const manager = await mk('manager@test.local', 'MANAGER', opr.id);
  const hrd = await mk('hrd@test.local', 'HRD', hrdDept.id);
  const karyawan = await mk('karyawan@test.local', 'KARYAWAN', opr.id);
  const auditor = await mk('auditor@test.local', 'AUDITOR', hrdDept.id);

  return {
    deptOpr: opr.id,
    deptHrd: hrdDept.id,
    pic: pic.id,
    picOther: picOther.id,
    manager: manager.id,
    hrd: hrd.id,
    karyawan: karyawan.id,
    auditor: auditor.id,
  };
}

/** Login dan kembalikan cookie sesi siap pakai. */
export async function loginAs(email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login ${email} gagal: ${res.status} ${res.text}`);
  const cookie = res.headers['set-cookie'];
  return Array.isArray(cookie) ? cookie[0] : cookie;
}

export const sopPayload = (code = 'SOP-OPR-001') => ({
  code,
  title: 'Prosedur Uji Integrasi',
  summary: 'Ringkasan uji',
  content:
    '# Prosedur Uji\n\nIsi dokumen uji yang panjangnya melewati batas minimal lima puluh karakter.',
  requiresAcknowledgement: true,
  reviewPeriodMonths: 12,
});
