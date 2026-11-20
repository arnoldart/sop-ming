import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { db } from '../src/db.js';
import { app, loginAs, resetDb, seedFixtures, sopPayload, type Fixtures } from './helpers.js';

let f: Fixtures;
let picCookie: string;
let managerCookie: string;
let hrdCookie: string;
let karyawanCookie: string;
let auditorCookie: string;

beforeAll(async () => {
  await resetDb();
  f = await seedFixtures();
});

beforeEach(async () => {
  picCookie = await loginAs('pic@test.local');
  managerCookie = await loginAs('manager@test.local');
  hrdCookie = await loginAs('hrd@test.local');
  karyawanCookie = await loginAs('karyawan@test.local');
  auditorCookie = await loginAs('auditor@test.local');
});

let seq = 0;
async function createSop(cookie = picCookie) {
  const code = `SOP-OPR-${String(++seq).padStart(3, '0')}`;
  const res = await request(app).post('/api/sops').set('Cookie', cookie).send(sopPayload(code));
  expect(res.status, res.text).toBe(201);
  return res.body.id as string;
}

describe('autentikasi', () => {
  it('menolak password salah dengan pesan generik', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pic@test.local', password: 'salah' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Email atau password salah');
  });

  it('mengembalikan 401 untuk permintaan tanpa sesi', async () => {
    const res = await request(app).get('/api/sops');
    expect(res.status).toBe(401);
  });

  it('mengembalikan profil sesuai peran setelah masuk', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', picCookie);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('PIC_SOP');
  });
});

describe('otorisasi', () => {
  it('menolak karyawan membuat SOP', async () => {
    const res = await request(app).post('/api/sops').set('Cookie', karyawanCookie).send(sopPayload());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('menolak PIC menyetujui SOP-nya sendiri', async () => {
    const id = await createSop();
    await request(app).post(`/api/sops/${id}/submit`).set('Cookie', picCookie).send({});
    const res = await request(app).post(`/api/sops/${id}/approve`).set('Cookie', picCookie).send({});
    expect(res.status).toBe(403);
  });

  it('menolak karyawan membuka audit log', async () => {
    const res = await request(app).get('/api/audit-logs').set('Cookie', karyawanCookie);
    expect(res.status).toBe(403);
  });

  it('mengizinkan auditor membuka audit log', async () => {
    const res = await request(app).get('/api/audit-logs').set('Cookie', auditorCookie);
    expect(res.status).toBe(200);
  });

  it('tidak pernah mengirim passwordHash', async () => {
    const res = await request(app).get('/api/users').set('Cookie', auditorCookie);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
});

describe('siklus hidup SOP', () => {
  it('menjalankan DRAFT sampai PUBLISHED dan mencatat audit', async () => {
    const id = await createSop();

    expect((await request(app).post(`/api/sops/${id}/submit`).set('Cookie', picCookie).send({})).status).toBe(200);
    expect((await request(app).post(`/api/sops/${id}/approve`).set('Cookie', managerCookie).send({})).status).toBe(200);
    const published = await request(app)
      .post(`/api/sops/${id}/publish`)
      .set('Cookie', hrdCookie)
      .send({ effectiveDate: '2026-11-20' });
    expect(published.status, published.text).toBe(200);
    expect(published.body.status).toBe('PUBLISHED');

    const detail = await request(app).get(`/api/sops/${id}`).set('Cookie', picCookie);
    expect(detail.body.status).toBe('PUBLISHED');
    expect(detail.body.approvals.map((a: { action: string }) => a.action)).toEqual([
      'SUBMIT',
      'APPROVE',
      'PUBLISH',
    ]);

    const actions = await db.auditLog.findMany({ where: { entityId: id } });
    expect(actions.map((a) => a.action).sort()).toEqual(
      ['SOP_APPROVED', 'SOP_CREATED', 'SOP_PUBLISHED', 'SOP_SUBMITTED'].sort(),
    );
  });

  it('menolak transisi ganda dengan 409', async () => {
    const id = await createSop();
    await request(app).post(`/api/sops/${id}/submit`).set('Cookie', picCookie).send({});
    const res = await request(app).post(`/api/sops/${id}/submit`).set('Cookie', picCookie).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('mewajibkan alasan saat menolak', async () => {
    const id = await createSop();
    await request(app).post(`/api/sops/${id}/submit`).set('Cookie', picCookie).send({});
    const res = await request(app).post(`/api/sops/${id}/reject`).set('Cookie', managerCookie).send({ note: 'pendek' });
    expect(res.status).toBe(422);

    const ok = await request(app)
      .post(`/api/sops/${id}/reject`)
      .set('Cookie', managerCookie)
      .send({ note: 'Isi belum sesuai kebijakan terbaru' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('DRAFT');
  });

  it('menolak PIC lain menyunting draft milik orang lain', async () => {
    const id = await createSop();
    const other = await loginAs('pic2@test.local');
    const res = await request(app).patch(`/api/sops/${id}`).set('Cookie', other).send({ title: 'Judul Baru Sekali' });
    expect(res.status).toBe(403);
  });

  it('menggantikan versi lama saat versi baru terbit', async () => {
    const id = await createSop();
    await request(app).post(`/api/sops/${id}/submit`).set('Cookie', picCookie).send({});
    await request(app).post(`/api/sops/${id}/approve`).set('Cookie', managerCookie).send({});
    await request(app)
      .post(`/api/sops/${id}/publish`)
      .set('Cookie', hrdCookie)
      .send({ effectiveDate: '2026-11-20' });

    const v2 = await request(app)
      .post(`/api/sops/${id}/versions`)
      .set('Cookie', picCookie)
      .send({ changeSummary: 'Menambah langkah verifikasi akhir' });
    expect(v2.status).toBe(201);
    expect(v2.body.versionNo).toBe(2);

    await request(app).post(`/api/sops/${id}/submit`).set('Cookie', picCookie).send({});
    await request(app).post(`/api/sops/${id}/approve`).set('Cookie', managerCookie).send({});
    await request(app)
      .post(`/api/sops/${id}/publish`)
      .set('Cookie', hrdCookie)
      .send({ effectiveDate: '2026-12-01' });

    const versions = await db.sopVersion.findMany({ where: { sopId: id }, orderBy: { versionNo: 'asc' } });
    expect(versions.map((v) => v.status)).toEqual(['SUPERSEDED', 'PUBLISHED']);

    const sop = await db.sop.findUniqueOrThrow({ where: { id } });
    expect(sop.currentVersionId).toBe(versions[1].id);
  });
});

describe('konfirmasi baca', () => {
  it('idempoten: klik dua kali tidak menambah baris', async () => {
    const id = await createSop();
    await request(app).post(`/api/sops/${id}/submit`).set('Cookie', picCookie).send({});
    await request(app).post(`/api/sops/${id}/approve`).set('Cookie', managerCookie).send({});
    await request(app)
      .post(`/api/sops/${id}/publish`)
      .set('Cookie', hrdCookie)
      .send({ effectiveDate: '2026-11-20' });

    const first = await request(app).post(`/api/sops/${id}/acknowledge`).set('Cookie', karyawanCookie).send({});
    const second = await request(app).post(`/api/sops/${id}/acknowledge`).set('Cookie', karyawanCookie).send({});

    expect(first.status).toBe(200);
    expect(first.body.alreadyAcknowledged).toBe(false);
    expect(second.body.alreadyAcknowledged).toBe(true);

    const count = await db.acknowledgement.count({ where: { userId: f.karyawan } });
    expect(count).toBe(1);
  });

  it('menolak konfirmasi dari departemen lain', async () => {
    const id = await createSop();
    await request(app).post(`/api/sops/${id}/submit`).set('Cookie', picCookie).send({});
    await request(app).post(`/api/sops/${id}/approve`).set('Cookie', managerCookie).send({});
    await request(app)
      .post(`/api/sops/${id}/publish`)
      .set('Cookie', hrdCookie)
      .send({ effectiveDate: '2026-11-20' });

    const res = await request(app).post(`/api/sops/${id}/acknowledge`).set('Cookie', auditorCookie).send({});
    expect(res.status).toBe(403);
  });
});

describe('visibilitas', () => {
  it('karyawan hanya melihat SOP yang sudah terbit', async () => {
    const id = await createSop(); // masih DRAFT
    const res = await request(app).get('/api/sops?limit=50').set('Cookie', karyawanCookie);
    expect(res.status).toBe(200);
    expect(res.body.items.some((s: { id: string }) => s.id === id)).toBe(false);
  });

  it('PIC melihat draft departemennya sendiri', async () => {
    const id = await createSop();
    const res = await request(app).get('/api/sops?limit=50').set('Cookie', picCookie);
    expect(res.body.items.some((s: { id: string }) => s.id === id)).toBe(true);
  });
});
