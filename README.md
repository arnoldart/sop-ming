# MING SOP Center

Aplikasi internal untuk mengelola siklus hidup Standard Operating Procedure (SOP): penyusunan, review berjenjang, penerbitan versi, konfirmasi baca karyawan, pengumuman, pelaporan pelanggaran, dan audit trail.

Dibangun sebagai monorepo npm workspaces: API Express + Prisma + PostgreSQL, SPA React + Vite + Tailwind, dan satu paket `shared` yang menjadi sumber kebenaran tipe, aturan transisi status, serta skema validasi untuk kedua sisi.

> **Demo daring:** <https://sopming.arnoldartworks.my.id> — berisi data dummy. Akun contoh `hrd@ming.test` / `password123`; daftar lengkap ada di [Akun demo](#akun-demo). Bentuk deployment dan prosedur rilis ulang ada di [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## Daftar isi

- [Fitur](#fitur)
- [Tech stack](#tech-stack)
- [Struktur repositori](#struktur-repositori)
- [Menjalankan di lokal](#menjalankan-di-lokal)
- [Akun demo](#akun-demo)
- [Peran dan hak akses](#peran-dan-hak-akses)
- [Alur status SOP](#alur-status-sop)
- [Ringkasan API](#ringkasan-api)
- [Perintah npm](#perintah-npm)
- [Pengujian](#pengujian)
- [Keputusan desain](#keputusan-desain)
- [Batasan yang diketahui](#batasan-yang-diketahui)
- [Dokumentasi](#dokumentasi)

---

## Fitur

| Fitur | Keterangan |
|---|---|
| **Perpustakaan SOP** | Daftar SOP dengan filter status, departemen, pencarian, dan paginasi. State filter disimpan di URL sehingga bisa di-refresh atau dibagikan. |
| **Alur review berjenjang** | `DRAFT → IN_REVIEW → APPROVED → PUBLISHED`. Penolakan mengembalikan SOP ke `DRAFT` dengan alasan wajib. |
| **Versi immutable** | SOP terbit tidak bisa disunting langsung. Perubahan dilakukan lewat "versi baru"; versi lama menjadi `SUPERSEDED` saat versi baru diterbitkan. |
| **Konfirmasi baca** | Karyawan menandai SOP sudah dibaca (idempoten per versi). Persentase kepatuhan per SOP dihitung dari jumlah karyawan departemen. |
| **Pengumuman** | HRD menerbitkan pengumuman; seluruh pengguna dapat membacanya. |
| **Laporan pelanggaran** | Semua peran dapat melapor, termasuk secara anonim. Manager/HRD menindaklanjuti lewat status `OPEN → TRIAGED → INVESTIGATING → RESOLVED → CLOSED` dengan catatan wajib dan riwayat yang tidak bisa ditimpa. |
| **Audit trail** | Log append-only untuk aksi SOP, pengumuman, laporan, dan autentikasi. Dapat dibaca Auditor dan HRD. |
| **Dashboard per peran** | Ringkasan pekerjaan yang menunggu tindakan pengguna, kepatuhan, dan laporan terbuka. |
| **Manajemen pengguna** | Daftar pengguna dan perannya (read-only) untuk Auditor dan HRD. |

Otorisasi sepenuhnya ditegakkan di server. UI hanya menyembunyikan tombol yang tidak diizinkan; setiap endpoint tetap memeriksa izin dan kepemilikan.

---

## Tech stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query 5, React Router 7, React Hook Form + Zod |
| Backend | Node.js, Express 4, Prisma 6, PostgreSQL, Zod, JWT (cookie), bcrypt |
| Shared | TypeScript — tipe domain, `TRANSITION_RULES`, label status/peran, skema Zod |
| Pengujian | Vitest + Supertest (integrasi API), Vitest (state machine) |

---

## Struktur repositori

```
.
├── shared/          # Tipe, state machine, skema Zod — dipakai server & client
│   └── src/index.ts
├── server/
│   ├── prisma/      # schema.prisma, migrations, seed.ts
│   ├── src/
│   │   ├── app.ts        # Rakit Express app, middleware, pemasangan router
│   │   ├── policy.ts     # Matriks izin: 14 permission × 6 peran
│   │   ├── auth.ts       # Sesi JWT di cookie httpOnly
│   │   ├── audit.ts      # Satu-satunya pintu penulisan audit log
│   │   ├── services/     # Aturan bisnis (sopService, dll.)
│   │   └── routes/       # 7 router: auth, sops, dashboard, announcements, reports, audit-logs, users
│   └── test/        # 23 tes (17 integrasi API + 6 state machine)
├── client/
│   └── src/
│       ├── lib/          # api.ts (satu pintu HTTP), auth.tsx, nav.ts, queryKeys.ts
│       ├── pages/        # Dashboard, SOP, Pengumuman, Laporan, Audit, Pengguna, Login
│       └── components/   # Layout, SOP, reports, dan primitif UI
└── docs/            # PRD, DESIGN, PLAN-FRONTEND, PROGRESS, ASSUMPTIONS, AI_USAGE
```

---

## Menjalankan di lokal

### Prasyarat

- Node.js 22 atau lebih baru (disarankan 24) dan npm 10+
- PostgreSQL 14+ yang berjalan di `localhost:5432`

### Langkah

```bash
# 1. Install dependency seluruh workspace
npm install

# 2. Siapkan environment
cp .env.example server/.env        # PowerShell: Copy-Item .env.example server/.env

# 3. Buat database
createdb -U postgres sop_center
createdb -U postgres sop_center_test   # dipakai suite pengujian

# Alternatif bila `createdb` tidak tersedia di PATH:
# psql -U postgres -c "CREATE DATABASE sop_center;"
# psql -U postgres -c "CREATE DATABASE sop_center_test;"

# 4. Terapkan skema dan isi data demo
npm run db:migrate
npm run db:seed

# 5. Jalankan API (4000) dan web (5173) sekaligus
npm run dev
```

Buka <http://localhost:5173>. Vite mem-proxy `/api` ke `http://localhost:4000`, jadi tidak perlu konfigurasi CORS tambahan.

`server/.env` minimal berisi:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sop_center?schema=public"
SESSION_SECRET="ganti-dengan-string-acak-minimal-32-karakter"
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
NODE_ENV="development"
```

Catatan:

- Server menolak request mutasi (non-GET) yang membawa `Origin` berbeda dari `CLIENT_ORIGIN`, sebagai perlindungan CSRF. Karena itu port Vite dikunci (`strictPort: true`).
- Untuk lingkungan produksi gunakan `npx prisma migrate deploy` di dalam `server/`, bukan `migrate dev`.
- `npm run db:reset` menghapus seluruh data lalu menjalankan ulang migrasi; jalankan `npm run db:seed` setelahnya.

---

## Akun demo

Semua akun memakai password yang sama: `password123`.

| Email | Peran | Departemen |
|---|---|---|
| `hrd@ming.test` | HRD | Human Resources |
| `pic.hrd@ming.test` | PIC SOP | Human Resources |
| `pic.opr@ming.test` | PIC SOP | Operasional |
| `pic.fin@ming.test` | PIC SOP | Keuangan |
| `pic.it@ming.test` | PIC SOP | Teknologi Informasi |
| `manager.opr@ming.test` | Manager | Operasional |
| `manager.hrd@ming.test` | Manager | Human Resources |
| `auditor@ming.test` | Auditor | Teknologi Informasi |
| `manajemen@ming.test` | Manajemen | Teknologi Informasi |
| `karyawan1.opr@ming.test` … `karyawan4.opr@ming.test` | Karyawan | Operasional |

Pola `karyawan{1-4}.{hrd|opr|fin|it}@ming.test` berlaku untuk semua departemen. Seed bersifat idempoten dengan cara **menghapus seluruh data lalu membuatnya ulang**, jadi jangan dijalankan setelah ada data yang ingin dipertahankan.

---

## Peran dan hak akses

| Peran | Hak utama |
|---|---|
| **KARYAWAN** | Melihat SOP, konfirmasi baca, membuat laporan pelanggaran, melihat pengumuman |
| **PIC_SOP** | Semua di atas + membuat/menyunting SOP departemennya, mengajukan review, membuat versi baru, melihat kepatuhan |
| **MANAGER** | Menyetujui/menolak SOP departemennya, menindaklanjuti laporan, melihat kepatuhan |
| **HRD** | Menerbitkan SOP, mengelola pengumuman, menindaklanjuti laporan, melihat audit log dan daftar pengguna |
| **AUDITOR** | Melihat seluruh SOP dan audit log, melihat daftar pengguna (read-only) |
| **MANAJEMEN** | Melihat seluruh SOP dan dashboard (read-only) |

Matriks lengkap ada di `server/src/policy.ts`. Pemeriksaan izin berbasis peran dilakukan di route; batas kepemilikan dan departemen diperiksa di service. SOP yang tidak boleh dilihat mengembalikan `404`, bukan `403`, agar keberadaannya tidak bocor.

---

## Alur status SOP

```
        submit                approve              publish
DRAFT ──────────► IN_REVIEW ──────────► APPROVED ──────────► PUBLISHED
  ▲                    │                                        │
  └────── reject ◄─────┘                                        │ versi baru dibuat
                                                                ▼
                                              versi lama ◄── SUPERSEDED
```

- Hanya `PIC_SOP` yang dapat membuat dan mengajukan SOP.
- `MANAGER` hanya dapat menyetujui SOP dari departemennya sendiri.
- Penolakan wajib menyertakan alasan minimal 10 karakter.
- Penerbitan wajib menyertakan tanggal berlaku; tanggal tinjau ulang dihitung dari tanggal tersebut.
- `currentVersionId` tidak berpindah saat draft versi baru dibuat, sehingga angka kepatuhan tidak ter-reset sebelum versi baru benar-benar terbit.

---

## Ringkasan API

Semua endpoint berprefix `/api`. Autentikasi memakai cookie sesi; tidak ada token di header.

| Grup | Endpoint |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| SOP | `GET /sops`, `POST /sops`, `GET /sops/:id`, `PATCH /sops/:id`, `POST /sops/:id/submit`, `/approve`, `/reject`, `/publish`, `POST /sops/:id/versions`, `POST /sops/:id/acknowledge` |
| Dashboard | `GET /dashboard` |
| Pengumuman | `GET /announcements`, `POST /announcements`, `DELETE /announcements/:id` |
| Laporan | `GET /reports`, `POST /reports`, `POST /reports/:id/follow-ups` |
| Audit | `GET /audit-logs`, `GET /audit-logs/entities` |
| Pengguna | `GET /users` |
| Health | `GET /health` |

Bentuk error konsisten:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "code": "..." } } }
```

---

## Perintah npm

Dijalankan dari root repositori:

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan API dan web bersamaan |
| `npm run build` | Type-check server, lalu build client ke `client/dist` |
| `npm test` | Menjalankan seluruh tes server |
| `npm run db:migrate` | Menerapkan migrasi Prisma |
| `npm run db:seed` | Mengisi data demo |
| `npm run db:reset` | Menghapus dan membangun ulang database |

Perintah khusus satu workspace: `npm run dev -w server`, `npm run dev -w client`, `npm run lint -w client`.

---

## Pengujian

```bash
npm test
```

Hasil saat ini: **23 tes lulus** (17 tes integrasi API, 6 tes state machine).

Suite integrasi memakai database terpisah `sop_center_test` yang skemanya disiapkan otomatis lewat `prisma db push`. Database tersebut harus sudah ada, tetapi tidak perlu di-seed. Database pengembangan tidak tersentuh. Untuk memakai database lain, set `TEST_DATABASE_URL`.

Cakupan tes mencakup login dan sesi, matriks izin per peran, seluruh transisi status beserta transisi yang tidak sah, immutability versi, konfirmasi baca, isolasi laporan anonim, serta penulisan audit.

---

## Keputusan desain

1. **Satu sumber kebenaran di `shared/`.** `TRANSITION_RULES` dan `allowedActions()` dipakai server untuk menolak transisi tidak sah dan dipakai client untuk menentukan tombol yang tampil. Mustahil ada tombol yang tidak dikenal server.
2. **Otorisasi dua lapis.** `policy.ts` menjawab "peran ini boleh melakukan apa"; service menjawab "boleh terhadap objek yang mana". Route tidak pernah menyimpan aturan izin sendiri.
3. **Satu pintu perubahan status.** `sopService.transition()` adalah satu-satunya fungsi yang boleh mengubah status SOP, sehingga audit dan validasi tidak bisa terlewat.
4. **Audit append-only.** Semua penulisan lewat satu fungsi `audit()`; tidak ada endpoint yang mengubah atau menghapus log. Laporan anonim juga menulis `actorId: null`.
5. **Versi tidak pernah ditimpa.** Menyunting SOP terbit selalu membuat baris `SopVersion` baru, sehingga isi yang pernah berlaku tetap dapat direkonstruksi.
6. **URL sebagai state UI.** Filter, pencarian, tab, dan halaman disimpan di query string agar dapat di-refresh dan dibagikan.
7. **Sesi di cookie `httpOnly` + `SameSite=Lax` + `Secure` di produksi.** Tidak ada token yang bisa dibaca JavaScript; mutasi lintas origin ditolak berdasarkan header `Origin`.

---

## Batasan yang diketahui

Bagian ini sengaja ditulis terbuka agar penilai tidak perlu menebak.

- **Isi SOP berupa Markdown**, bukan rich text, dan tidak ada lampiran berkas (PDF/DOCX).
- **Belum ada modul sanksi/Surat Peringatan.** Brief hanya meminta pelaporan dan tindak lanjut oleh pihak berwenang, yang sudah dipenuhi lewat status bertahap + catatan. Laporan juga belum menyimpan entitas "terlapor", sehingga sanksi formal tidak bisa dimodelkan tanpa perubahan skema.
- **Tidak ada notifikasi** (email, push, atau in-app) untuk review, penerbitan, atau tindak lanjut laporan.
- **Pencarian memakai `ILIKE`**, belum `tsvector`/full-text index. Cukup untuk 12 SOP di data demo, tetapi perlu ditingkatkan untuk volume besar.
- **Ukuran data demo lebih kecil dari target non-fungsional PRD** (12 SOP dan 25 pengguna, bukan 200 SOP dan 50 pengguna).
- **Tindak lanjut laporan tidak dibatasi departemen** dan urutan statusnya tidak dipaksakan oleh server; UI hanya menonaktifkan status yang sedang aktif.
- **Tidak ada refresh token.** Sesi berlaku 8 jam dan berakhir dengan logout atau kedaluwarsa.
- **Manajemen pengguna bersifat read-only** — belum ada pembuatan, penyuntingan, atau penonaktifan akun lewat aplikasi.
- **Rate limit login** disimpan di memori proses, sehingga tidak berlaku lintas instance.

---

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Kebutuhan produk, user story, matriks izin, target non-fungsional |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Bahasa visual, warna, tipografi, komponen |
| [`docs/PLAN-FRONTEND.md`](docs/PLAN-FRONTEND.md) | Rencana pengerjaan frontend per fase beserta gerbang lulus |
| [`docs/PROMPT-FRONTEND.md`](docs/PROMPT-FRONTEND.md) | Kontrak API dan peta rute untuk implementasi frontend |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Catatan kemajuan dan keputusan per fase |
| [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) | Asumsi yang diambil saat requirement ambigu |
| [`docs/AI_USAGE.md`](docs/AI_USAGE.md) | Catatan penggunaan AI selama pengerjaan |
| [`docs/AI-HANDOFF.md`](docs/AI-HANDOFF.md) | Konvensi kode dan jebakan bagi kontributor berikutnya |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Bentuk deployment, prosedur rilis ulang, dan verifikasi |
