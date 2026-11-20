/**
 * Seed data dummy. Seluruh nama, email, dan isi SOP fiktif.
 * Idempoten: menjalankan ulang akan menghapus data lama lalu membuat ulang.
 * Jalankan: npm run db:seed
 */
import { PrismaClient, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();
const PASSWORD = 'password123';
const day = 24 * 60 * 60 * 1000;
const ago = (n: number) => new Date(Date.now() - n * day);
const ahead = (n: number) => new Date(Date.now() + n * day);

const body = (title: string, points: string[]) =>
  `# ${title}\n\n## Tujuan\nDokumen ini menetapkan langkah kerja standar agar proses berjalan konsisten dan dapat diaudit.\n\n## Ruang lingkup\nBerlaku untuk seluruh staf pada departemen terkait.\n\n## Langkah kerja\n${points
    .map((p, i) => `${i + 1}. ${p}`)
    .join('\n')}\n\n## Catatan\nPenyimpangan dari prosedur ini wajib dilaporkan kepada PIC SOP.`;

async function main() {
  console.log('Menghapus data lama...');
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

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  console.log('Membuat departemen...');
  const dept = {
    hrd: await db.department.create({ data: { code: 'HRD', name: 'Human Resources' } }),
    opr: await db.department.create({ data: { code: 'OPR', name: 'Operasional' } }),
    fin: await db.department.create({ data: { code: 'FIN', name: 'Keuangan' } }),
    it: await db.department.create({ data: { code: 'IT', name: 'Teknologi Informasi' } }),
  };

  console.log('Membuat pengguna...');
  const mkUser = (email: string, name: string, role: Role, departmentId: string) =>
    db.user.create({ data: { email, name, role, departmentId, passwordHash } });

  const hrd = await mkUser('hrd@ming.test', 'Sari Wulandari', 'HRD', dept.hrd.id);
  const picHrd = await mkUser('pic.hrd@ming.test', 'Budi Santoso', 'PIC_SOP', dept.hrd.id);
  const picOpr = await mkUser('pic.opr@ming.test', 'Rina Kartika', 'PIC_SOP', dept.opr.id);
  const picFin = await mkUser('pic.fin@ming.test', 'Agus Prasetyo', 'PIC_SOP', dept.fin.id);
  const picIt = await mkUser('pic.it@ming.test', 'Maya Anggraini', 'PIC_SOP', dept.it.id);
  const mgrOpr = await mkUser('manager.opr@ming.test', 'Dedi Firmansyah', 'MANAGER', dept.opr.id);
  const mgrHrd = await mkUser('manager.hrd@ming.test', 'Lestari Ningsih', 'MANAGER', dept.hrd.id);
  const auditor = await mkUser('auditor@ming.test', 'Hendra Gunawan', 'AUDITOR', dept.it.id);
  const board = await mkUser('manajemen@ming.test', 'Wijaya Kusuma', 'MANAJEMEN', dept.it.id);

  const staff: Record<string, Awaited<ReturnType<typeof mkUser>>[]> = {};
  for (const [key, d] of Object.entries(dept)) {
    staff[key] = [];
    for (let i = 1; i <= 4; i++) {
      staff[key].push(
        await mkUser(
          `karyawan${i}.${key.toLowerCase()}@ming.test`,
          `Karyawan ${key.toUpperCase()} ${i}`,
          'KARYAWAN',
          d.id,
        ),
      );
    }
  }

  console.log('Membuat SOP...');
  type Seed = {
    code: string;
    title: string;
    summary: string;
    deptId: string;
    ownerId: string;
    requiresAck: boolean;
    status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'SUPERSEDED';
    points: string[];
    ackRatio?: number;
    managerId?: string;
  };

  const seeds: Seed[] = [
    {
      code: 'SOP-HRD-001', title: 'Prosedur Rekrutmen Karyawan Tetap',
      summary: 'Alur rekrutmen dari permintaan tenaga kerja hingga penandatanganan kontrak.',
      deptId: dept.hrd.id, ownerId: picHrd.id, requiresAck: true, status: 'PUBLISHED', ackRatio: 0.75,
      managerId: mgrHrd.id,
      points: ['Permintaan tenaga kerja diajukan oleh kepala departemen', 'HRD menyusun deskripsi pekerjaan dan kanal publikasi', 'Seleksi dilakukan minimal dua tahap wawancara', 'Penawaran kerja disetujui manajemen sebelum dikirim'],
    },
    {
      code: 'SOP-HRD-002', title: 'Prosedur Cuti dan Izin Tidak Masuk',
      summary: 'Pengajuan, persetujuan, dan pencatatan cuti tahunan serta izin.',
      deptId: dept.hrd.id, ownerId: picHrd.id, requiresAck: true, status: 'PUBLISHED', ackRatio: 0.5,
      managerId: mgrHrd.id,
      points: ['Pengajuan diajukan minimal tiga hari kerja sebelum tanggal cuti', 'Atasan langsung menyetujui melalui sistem', 'HRD memverifikasi sisa kuota cuti', 'Pencatatan dilakukan pada kartu cuti karyawan'],
    },
    {
      code: 'SOP-OPR-001', title: 'Prosedur Serah Terima Shift Produksi',
      summary: 'Checklist serah terima antar shift untuk mencegah kehilangan informasi operasional.',
      deptId: dept.opr.id, ownerId: picOpr.id, requiresAck: true, status: 'PUBLISHED', ackRatio: 0.25,
      managerId: mgrOpr.id,
      points: ['Petugas shift sebelumnya mengisi formulir serah terima', 'Kondisi mesin dan stok bahan dicatat', 'Shift berikutnya memverifikasi isi formulir', 'Ketidaksesuaian dilaporkan ke supervisor'],
    },
    {
      code: 'SOP-OPR-002', title: 'Prosedur Penanganan Barang Cacat',
      summary: 'Identifikasi, pencatatan, dan pemisahan barang cacat dari alur produksi.',
      deptId: dept.opr.id, ownerId: picOpr.id, requiresAck: false, status: 'PUBLISHED',
      managerId: mgrOpr.id,
      points: ['Barang cacat diberi label merah', 'Pencatatan dilakukan pada formulir kendali mutu', 'Barang dipindahkan ke area karantina', 'Analisis akar masalah dilakukan mingguan'],
    },
    {
      code: 'SOP-FIN-001', title: 'Prosedur Pengajuan Reimbursement',
      summary: 'Pengajuan, verifikasi bukti, dan pencairan biaya yang dibayar dahulu oleh karyawan.',
      deptId: dept.fin.id, ownerId: picFin.id, requiresAck: true, status: 'PUBLISHED', ackRatio: 0.6,
      points: ['Pengajuan disertai bukti transaksi asli', 'Atasan langsung menyetujui kebutuhan biaya', 'Keuangan memverifikasi kesesuaian dengan kebijakan', 'Pencairan dilakukan maksimal tujuh hari kerja'],
    },
    {
      code: 'SOP-FIN-002', title: 'Prosedur Penutupan Buku Bulanan',
      summary: 'Langkah penutupan periode akuntansi bulanan dan rekonsiliasi akhir.',
      deptId: dept.fin.id, ownerId: picFin.id, requiresAck: false, status: 'PUBLISHED',
      points: ['Seluruh jurnal bulan berjalan diposting', 'Rekonsiliasi bank dilakukan', 'Selisih dicatat pada akun penyesuaian', 'Laporan diserahkan ke manajemen'],
    },
    {
      code: 'SOP-IT-001', title: 'Prosedur Permintaan Akses Sistem Internal',
      summary: 'Permintaan, persetujuan, dan pencabutan hak akses aplikasi internal.',
      deptId: dept.it.id, ownerId: picIt.id, requiresAck: true, status: 'PUBLISHED', ackRatio: 0.4,
      managerId: mgrOpr.id,
      points: ['Permintaan diajukan melalui tiket', 'Atasan pemilik data memberikan persetujuan', 'Akses diberikan sesuai prinsip hak minimum', 'Akses dicabut saat karyawan berhenti'],
    },
    {
      code: 'SOP-OPR-003', title: 'Prosedur Pemeliharaan Preventif Mesin',
      summary: 'Jadwal dan checklist pemeliharaan berkala untuk mengurangi waktu henti mesin.',
      deptId: dept.opr.id, ownerId: picOpr.id, requiresAck: true, status: 'IN_REVIEW',
      managerId: mgrOpr.id,
      points: ['Jadwal pemeliharaan disusun per kuartal', 'Teknisi mengisi checklist sebelum dan sesudah', 'Suku cadang kritis disimpan minimal dua unit', 'Riwayat pemeliharaan diarsipkan'],
    },
    {
      code: 'SOP-HRD-003', title: 'Prosedur Penilaian Kinerja Tahunan',
      summary: 'Siklus penilaian kinerja, kalibrasi, dan umpan balik ke karyawan.',
      deptId: dept.hrd.id, ownerId: picHrd.id, requiresAck: true, status: 'IN_REVIEW',
      managerId: mgrHrd.id,
      points: ['Karyawan mengisi penilaian diri', 'Atasan menilai dengan rubrik yang sama', 'Sesi kalibrasi dilakukan antar atasan', 'Hasil disampaikan dalam pertemuan langsung'],
    },
    {
      code: 'SOP-FIN-003', title: 'Prosedur Pengadaan Barang di Bawah Lima Juta',
      summary: 'Pengadaan nilai kecil tanpa proses tender.',
      deptId: dept.fin.id, ownerId: picFin.id, requiresAck: false, status: 'APPROVED',
      points: ['Permintaan pengadaan diajukan pemohon', 'Keuangan membandingkan minimal dua penawaran', 'Persetujuan diberikan manajer terkait', 'Bukti pembelian diarsipkan'],
    },
    {
      code: 'SOP-IT-002', title: 'Prosedur Pencadangan Data Harian',
      summary: 'Pencadangan basis data dan berkas penting setiap hari kerja.',
      deptId: dept.it.id, ownerId: picIt.id, requiresAck: true, status: 'DRAFT',
      points: ['Pencadangan berjalan otomatis pukul dua pagi', 'Hasil pencadangan diverifikasi setiap pagi', 'Salinan disimpan di lokasi terpisah', 'Uji pemulihan dilakukan bulanan'],
    },
    {
      code: 'SOP-HRD-004', title: 'Prosedur Orientasi Karyawan Baru',
      summary: 'Rangkaian orientasi pada minggu pertama kerja.',
      deptId: dept.hrd.id, ownerId: picHrd.id, requiresAck: true, status: 'DRAFT',
      points: ['Karyawan baru menerima paket orientasi', 'Sesi pengenalan departemen dijadwalkan', 'Mentor ditunjuk selama tiga bulan', 'Evaluasi orientasi dilakukan pada akhir bulan pertama'],
    },
  ];

  let auditCount = 0;
  const auditRow = (actorId: string, action: string, entityType: string, entityId: string, at: Date) => {
    auditCount++;
    return {
      actorId, action, entityType, entityId, createdAt: at,
      after: { seeded: true } as object,
    };
  };

  for (const [index, s] of seeds.entries()) {
    const created = ago(60 - index * 3);
    const sop = await db.sop.create({
      data: {
        code: s.code, title: s.title, summary: s.summary,
        departmentId: s.deptId, ownerId: s.ownerId,
        requiresAcknowledgement: s.requiresAck,
        reviewPeriodMonths: 12,
        status: s.status,
        createdAt: created,
        updatedAt: created,
      },
    });

    const content = body(s.title, s.points);
    const published = s.status === 'PUBLISHED' || s.status === 'SUPERSEDED';

    // Versi 1 selalu ada. SOP berstatus PUBLISHED punya satu versi terbit.
    const v1 = await db.sopVersion.create({
      data: {
        sopId: sop.id, versionNo: 1, content,
        changeSummary: 'Versi awal',
        status: published ? 'PUBLISHED' : 'DRAFT',
        effectiveDate: published ? ago(40 - index) : null,
        createdById: s.ownerId,
        publishedById: published ? hrd.id : null,
        publishedAt: published ? ago(40 - index) : null,
        createdAt: created,
      },
    });

    await db.sop.update({
      where: { id: sop.id },
      data: {
        currentVersionId: v1.id,
        nextReviewAt: published ? ahead(300 - index * 5) : null,
      },
    });

    // Jejak approval sesuai status akhir.
    const steps: { action: 'SUBMIT' | 'APPROVE' | 'PUBLISH'; actorId: string; at: Date }[] = [];
    if (s.status !== 'DRAFT') steps.push({ action: 'SUBMIT', actorId: s.ownerId, at: ago(50 - index) });
    if (s.status === 'APPROVED' || published) {
      steps.push({ action: 'APPROVE', actorId: s.managerId ?? mgrOpr.id, at: ago(45 - index) });
    }
    if (published) steps.push({ action: 'PUBLISH', actorId: hrd.id, at: ago(40 - index) });

    for (const step of steps) {
      await db.sopApproval.create({
        data: {
          sopVersionId: v1.id, actorId: step.actorId, action: step.action,
          note: step.action === 'APPROVE' ? 'Disetujui, isi sudah sesuai kebijakan.' : '',
          createdAt: step.at,
        },
      });
    }

    const auditRows = [
      auditRow(s.ownerId, 'SOP_CREATED', 'Sop', sop.id, created),
      ...steps.map((st) => auditRow(st.actorId, `SOP_${st.action}`, 'Sop', sop.id, st.at)),
    ];

    // Konfirmasi baca: sebagian karyawan departemen, sengaja tidak penuh.
    if (published && s.requiresAck) {
      const deptKey = Object.keys(dept).find((k) => dept[k as keyof typeof dept].id === s.deptId)!;
      const targets = staff[deptKey].slice(0, Math.ceil(4 * (s.ackRatio ?? 0.5)));
      for (const [i, u] of targets.entries()) {
        await db.acknowledgement.create({
          data: { sopVersionId: v1.id, userId: u.id, acknowledgedAt: ago(30 - i) },
        });
        auditRows.push(auditRow(u.id, 'SOP_ACKNOWLEDGED', 'Sop', sop.id, ago(30 - i)));
      }
    }

    await db.auditLog.createMany({ data: auditRows });
  }

  console.log('Membuat pengumuman...');
  const publishedSops = await db.sop.findMany({ where: { status: 'PUBLISHED' }, take: 3 });
  await db.announcement.createMany({
    data: [
      { title: 'Sosialisasi SOP Rekrutmen versi terbaru', body: 'Seluruh kepala departemen diminta membaca SOP-HRD-001 sebelum mengajukan permintaan tenaga kerja.', sopId: publishedSops[0]?.id, createdById: hrd.id, createdAt: ago(9) },
      { title: 'Pengingat konfirmasi SOP Cuti', body: 'Karyawan yang belum mengonfirmasi SOP cuti diminta menyelesaikan sebelum akhir bulan.', sopId: publishedSops[1]?.id, createdById: hrd.id, createdAt: ago(5) },
      { title: 'Perubahan alur serah terima shift', body: 'Formulir serah terima shift kini wajib diisi melalui sistem, bukan kertas.', sopId: publishedSops[2]?.id, createdById: hrd.id, createdAt: ago(2) },
    ],
  });

  console.log('Membuat laporan pelanggaran...');
  const oprSop = await db.sop.findFirst({ where: { code: 'SOP-OPR-001' } });
  const finSop = await db.sop.findFirst({ where: { code: 'SOP-FIN-001' } });
  const r1 = await db.violationReport.create({
    data: { reporterId: staff.opr[0].id, sopId: oprSop?.id, description: 'Serah terima shift malam tidak mengisi formulir selama tiga hari berturut-turut.', status: 'INVESTIGATING', assignedToId: mgrOpr.id, createdAt: ago(12) },
  });
  await db.violationReport.create({
    data: { reporterId: null, sopId: finSop?.id, description: 'Bukti reimbursement diterima tanpa persetujuan atasan langsung.', status: 'OPEN', createdAt: ago(6) },
  });
  await db.violationReport.create({
    data: { reporterId: staff.fin[1].id, description: 'Barang cacat tidak dipindahkan ke area karantina dan tercampur dengan stok baik.', status: 'RESOLVED', assignedToId: mgrOpr.id, createdAt: ago(20) },
  });

  await db.reportFollowUp.createMany({
    data: [
      { reportId: r1.id, actorId: mgrOpr.id, fromStatus: 'OPEN', toStatus: 'TRIAGED', note: 'Laporan diterima dan diteruskan ke supervisor shift.', createdAt: ago(10) },
      { reportId: r1.id, actorId: mgrOpr.id, fromStatus: 'TRIAGED', toStatus: 'INVESTIGATING', note: 'Wawancara dengan petugas shift dijadwalkan minggu ini.', createdAt: ago(8) },
    ],
  });

  const counts = {
    departemen: await db.department.count(),
    pengguna: await db.user.count(),
    sop: await db.sop.count(),
    versi: await db.sopVersion.count(),
    konfirmasi: await db.acknowledgement.count(),
    audit: await db.auditLog.count(),
    pengumuman: await db.announcement.count(),
    laporan: await db.violationReport.count(),
  };
  console.log('Selesai:', counts);
  console.log(`\nAkun demo (password semua: ${PASSWORD})`);
  console.log('  hrd@ming.test            HRD');
  console.log('  pic.hrd@ming.test        PIC SOP (Human Resources)');
  console.log('  pic.opr@ming.test        PIC SOP (Operasional)');
  console.log('  manager.opr@ming.test    Manager (Operasional)');
  console.log('  auditor@ming.test        Auditor');
  console.log('  manajemen@ming.test      Manajemen');
  console.log('  karyawan1.opr@ming.test  Karyawan');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
