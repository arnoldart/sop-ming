# PRD — MING SOP Center

**Versi:** 1.0 · **Tanggal:** 20 November 2026 · **Batas pengumpulan:** 25 November 2026
**Konteks:** Tes Teknis Full Stack Programmer. Timebox 1 minggu (sisa ±5 hari kerja), data dummy, boleh pakai AI.

---

## 1. Executive Summary

### Problem Statement

Dokumen SOP, riwayat perubahan, bukti sosialisasi, dan tindak lanjut temuan tersebar di banyak tempat (folder drive, chat, email), sehingga tidak ada satu sumber kebenaran: karyawan tidak tahu versi mana yang berlaku, manager tidak bisa membuktikan SOP sudah dibaca timnya, dan auditor tidak bisa menelusuri siapa mengubah apa dan kapan.

### Proposed Solution

Aplikasi web internal dengan satu siklus hidup SOP yang terkontrol: draft → review PIC → approve Manager → publish HRD, dengan versi immutable, perpustakaan SOP yang bisa dicari, konfirmasi baca yang terlacak per karyawan, dan audit trail append-only untuk setiap perubahan status. Dashboard manajemen menampilkan pekerjaan tertunda dan tingkat kepatuhan konfirmasi.

### Success Criteria

| # | Kriteria | Target terukur |
|---|---|---|
| SC-1 | Siklus hidup SOP berjalan end-to-end | 1 SOP dapat melewati DRAFT → PUBLISHED tanpa intervensi DB manual; versi 2 yang dipublikasikan menandai versi 1 `SUPERSEDED` dan riwayat menampilkan 2 entri |
| SC-2 | Otorisasi benar | 24 sel matriks izin (6 peran × 4 aksi kritis) lulus uji otomatis: 100% permintaan tidak berizin ditolak dengan 403 |
| SC-3 | Audit trail lengkap | 100% endpoint yang mengubah state menulis tepat 1 baris `audit_log`; diverifikasi oleh uji integrasi |
| SC-4 | Pencarian terpakai | Pencarian SOP published (judul/kode/isi) p95 < 300 ms pada 200 SOP seed |
| SC-5 | Kepatuhan konfirmasi akurat | Angka kepatuhan dashboard cocok dengan hitungan manual pada dataset seed (50 user × 20 SOP wajib) — selisih 0 |
| SC-6 | Dapat dijalankan reviewer | Dari clone bersih ke aplikasi berjalan + ter-seed dalam ≤ 5 perintah, tanpa edit kode |
| SC-7 | Kualitas UI | Lighthouse Accessibility ≥ 90 pada 3 layar inti (login, daftar SOP, detail SOP) |

---

## 2. User Experience & Functionality

### 2.1 User Personas

| Peran | Kebutuhan utama | Yang menyakitkan sekarang |
|---|---|---|
| **Karyawan** | Tahu SOP mana yang berlaku untuk pekerjaannya, baca, konfirmasi | Tidak tahu versi terbaru; konfirmasi lewat chat tidak terlacak |
| **PIC SOP** | Menulis & memperbarui SOP departemennya, tahu status reviewnya | Revisi hilang di email; tidak tahu siapa belum setuju |
| **Manager** | Menyetujui/menolak dengan alasan, melihat kepatuhan tim | Tidak ada bukti tim sudah membaca |
| **HRD** | Menerbitkan SOP, menyampaikan sosialisasi/pengumuman | Distribusi tidak seragam, tidak ada bukti terbit |
| **Auditor** | Menelusuri riwayat perubahan & keputusan | Bukti tersebar, tidak bisa direkonstruksi |
| **Manajemen** | Ringkasan kondisi, pekerjaan tertunda, temuan | Tidak ada angka, hanya laporan verbal |

### 2.2 Cakupan (Vertical Slice)

**Selesai penuh (end-to-end, backend + UI + uji):**
1. Autentikasi + RBAC 6 peran
2. Siklus hidup SOP + versioning + approval 3 tahap + audit trail
3. Perpustakaan SOP: cari, filter, baca, konfirmasi baca (per SOP, wajib)
4. Dashboard pekerjaan tertunda & kepatuhan
5. Penampil audit trail (Auditor/HRD)

**Sebagian (CRUD dasar, alur pendek):**
6. Pengumuman/sosialisasi — buat + daftar + tautkan ke SOP; tanpa penjadwalan & tanpa targeting granular
7. Laporan pelanggaran — buat + ubah status + catatan tindak lanjut; tanpa notifikasi & tanpa lampiran

**Tidak dibangun (placeholder nav + catatan jujur di dokumen):**
8. Modul pembelajaran & evaluasi pemahaman (kuis)
9. Notifikasi email / in-app
10. Lampiran file (PDF/DOCX)
11. Tanda tangan elektronik, SSO, aplikasi mobile

### 2.3 User Stories & Acceptance Criteria

#### US-1 — Login & sesi
> Sebagai pengguna, saya ingin masuk dengan email & password agar melihat informasi sesuai peran saya.

- Halaman login menerima email + password; salah kredensial → pesan generik "Email atau password salah" (tidak membocorkan mana yang salah).
- Sesi disimpan di cookie `httpOnly`, `SameSite=Lax`, `Secure` di produksi; token tidak pernah dapat dibaca JavaScript.
- Token berlaku 8 jam; logout menghapus cookie dan mencatat `AUTH_LOGOUT` di audit log.
- Login dibatasi 5 percobaan/menit per email+IP; percobaan ke-6 → 429.
- Setelah login, pengguna diarahkan ke `/` dan hanya melihat menu yang diizinkan perannya.
- 6 akun seed tersedia dengan password terdokumentasi di README.

#### US-2 — Membuat & menyunting draft SOP
> Sebagai PIC SOP, saya ingin membuat dan menyunting draft SOP agar bisa diusulkan untuk persetujuan.

- PIC membuat SOP: kode (unik, mis. `SOP-HRD-001`), judul, departemen (terkunci ke departemennya), ringkasan, isi (markdown), `requiresAcknowledgement` (boolean), periode tinjauan ulang (bulan).
- Draft hanya dapat disunting oleh PIC pemiliknya. PIC lain → 403.
- Setiap penyuntingan draft menaikkan `revision` dan mencatat `SOP_VERSION_UPDATED` di audit log beserta diff ringkas (field yang berubah).
- SOP yang sudah `PUBLISHED` tidak dapat disunting langsung; perubahan harus melalui "Buat versi baru".
- Form memvalidasi: kode unik (409 bila duplikat), judul 5–200 karakter, isi minimal 50 karakter.

#### US-3 — Alur persetujuan 3 tahap
> Sebagai PIC/Manager/HRD, saya ingin setiap tahap persetujuan tercatat agar keputusan dapat ditelusuri.

State machine (satu-satunya jalur yang diizinkan):

```
DRAFT --submit(PIC)--> IN_REVIEW --approve(Manager)--> APPROVED --publish(HRD)--> PUBLISHED
                            |                              |
                            +--reject(Manager, alasan)-----+--> DRAFT
                                                           +--reject(HRD, alasan)--> DRAFT
PUBLISHED --versi baru dipublikasikan--> SUPERSEDED
```

- Transisi di luar diagram → 409 `INVALID_TRANSITION` dengan pesan state saat ini.
- Approve & reject **wajib** menyertakan catatan (min. 10 karakter) kecuali approve.
- Setiap transisi menulis 1 baris `sop_approval` (actor, aksi, catatan, timestamp) + 1 baris `audit_log`.
- Publish wajib mengisi tanggal berlaku (`effectiveDate`).
- Manager hanya dapat menyetujui SOP di departemennya; HRD dapat menerbitkan lintas departemen.
- Halaman detail menampilkan timeline vertikal seluruh transisi beserta aktor dan catatan.

#### US-4 — Versioning
> Sebagai auditor, saya ingin setiap versi SOP tersimpan permanen agar saya bisa melihat apa yang berlaku pada tanggal tertentu.

- Versi `PUBLISHED` bersifat **immutable** — tidak ada endpoint yang dapat mengubah isi versi terbit.
- "Buat versi baru" menyalin isi versi terakhir ke draft baru dengan `versionNo + 1` dan field `changeSummary` wajib.
- Setelah versi baru terbit: versi lama → `SUPERSEDED`, `Sop.currentVersionId` berpindah, dan semua konfirmasi baca terhadap versi lama **tidak dihitung** untuk kepatuhan versi baru.
- Halaman riwayat versi menampilkan: nomor versi, status, aktor, tanggal terbit, ringkasan perubahan, dan tautan baca.

#### US-5 — Perpustakaan & pencarian SOP
> Sebagai karyawan, saya ingin mencari SOP yang berlaku agar saya tidak bekerja dengan prosedur kedaluwarsa.

- Daftar SOP hanya menampilkan `PUBLISHED` untuk Karyawan/Auditor/Manajemen; PIC/Manager/HRD juga melihat draft & in-review milik departemennya (ditandai badge status).
- Pencarian kata kunci mencocokkan kode, judul, dan isi (Postgres `tsvector` + fallback `ILIKE`).
- Filter: departemen, status, wajib-konfirmasi, rentang tanggal berlaku.
- Hasil kosong menampilkan empty state dengan saran menghapus filter.
- Badge "Perlu konfirmasi" muncul pada SOP yang belum dikonfirmasi pengguna.

#### US-6 — Konfirmasi baca
> Sebagai karyawan, saya ingin menandai bahwa saya sudah membaca SOP agar atasan punya bukti.

- Tombol "Saya sudah membaca & memahami" muncul hanya untuk SOP published dengan `requiresAcknowledgement = true`.
- Konfirmasi idempoten: klik dua kali tidak membuat baris ganda (unique `(sopVersionId, userId)`).
- Setelah konfirmasi, tombol berubah menjadi status terkunci dengan timestamp.
- Target konfirmasi = seluruh pengguna aktif di departemen SOP tersebut, kecuali peran `AUDITOR` dan `MANAJEMEN`.
- PIC/Manager/HRD dapat melihat daftar siapa sudah/belum konfirmasi pada halaman detail SOP.

#### US-7 — Dashboard
> Sebagai manager/manajemen, saya ingin melihat pekerjaan tertunda dan tingkat kepatuhan agar bisa mengambil tindakan.

- Kartu ringkasan: SOP published, menunggu persetujuan saya, draft saya, kepatuhan konfirmasi 30 hari (%).
- Tabel "Menunggu tindakan saya" — isinya berbeda per peran (Manager: menunggu approve; HRD: menunggu publish; PIC: draft/reject).
- Tabel "Kepatuhan terendah" — 5 SOP dengan persentase konfirmasi terendah.
- Semua angka dihitung dari query DB (bukan hardcode) dan cocok dengan uji seed.

#### US-8 — Pengumuman
> Sebagai HRD, saya ingin menyampaikan sosialisasi SOP agar perubahan diketahui karyawan.

- HRD membuat pengumuman: judul, isi, tautan SOP opsional, departemen target (atau semua).
- Pengumuman tampil di beranda pengguna sesuai departemennya, terbaru di atas.
- Hanya HRD yang dapat membuat/menghapus; menghapus mencatat audit log.

#### US-9 — Laporan pelanggaran
> Sebagai karyawan, saya ingin melaporkan dugaan pelanggaran SOP agar bisa ditindaklanjuti.

- Form laporan: SOP terkait (opsional), deskripsi (min. 20 karakter), opsi anonim.
- Bila anonim, `reporterId` disimpan `null` dan identitas tidak pernah dikembalikan API mana pun.
- Manager/HRD dapat mengubah status `OPEN → TRIAGED → INVESTIGATING → RESOLVED → CLOSED` dan menambah catatan tindak lanjut.
- Setiap perubahan status + catatan tersimpan sebagai riwayat tindak lanjut, bukan menimpa.

#### US-10 — Audit trail
> Sebagai auditor, saya ingin menelusuri seluruh aktivitas penting agar keputusan dapat dipertanggungjawabkan.

- Halaman audit: filter aktor, tipe entitas, rentang tanggal, aksi; urut terbaru.
- Baris audit menampilkan: waktu, aktor, aksi, entitas, ringkasan perubahan (JSON before/after disimpan, ditampilkan sebagai diff).
- Audit log **append-only**: tidak ada endpoint update/delete; tidak ada cascading delete dari entitas.
- Akses hanya untuk `AUDITOR` dan `HRD`; peran lain → 403.

### 2.4 Matriks Izin

| Aksi | Karyawan | PIC SOP | Manager | HRD | Auditor | Manajemen |
|---|---|---|---|---|---|---|
| Baca SOP published | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Buat/sunting draft | — | ✓ (dept sendiri) | — | — | — | — |
| Submit review | — | ✓ (miliknya) | — | — | — | — |
| Approve / reject | — | — | ✓ (dept sendiri) | — | — | — |
| Publish | — | — | — | ✓ | — | — |
| Konfirmasi baca | ✓ | ✓ | ✓ | ✓ | — | — |
| Buat pengumuman | — | — | — | ✓ | — | — |
| Lapor pelanggaran | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Triage laporan | — | — | ✓ | ✓ | — | — |
| Lihat audit log | — | — | — | ✓ | ✓ | — |
| Lihat dashboard | ringkas | ✓ | ✓ | ✓ | ✓ | ✓ |

### 2.5 Non-Goals

- Bukan aplikasi produksi: tidak ada SLA, backup, atau hardening infrastruktur.
- Tidak ada email/notifikasi push; semua pemberitahuan bersifat in-app passif.
- Tidak ada unggah lampiran, tanda tangan digital, atau integrasi SSO/LDAP.
- Tidak ada rich-text editor (markdown + preview cukup).
- Tidak ada multi-bahasa, mode gelap, atau aplikasi mobile.
- Tidak ada mesin pencari eksternal (Elasticsearch/Algolia).
- Tidak ada modul kuis/pembelajaran.

---

## 3. AI System Requirements

**Tidak ada fitur AI di dalam produk.** Tidak ada LLM call, tidak ada endpoint AI, tidak ada data yang dikirim ke pihak ketiga.

Bagian ini relevan hanya karena "Penggunaan AI" termasuk aspek penilaian, sehingga PRD mengatur bagaimana penggunaan AI didokumentasikan:

- **Catatan penggunaan AI** (`docs/AI_USAGE.md`) mencantumkan: bagian mana yang dibantu AI, prompt/keputusan yang diambil, dan apa yang diverifikasi manual.
- **Aturan verifikasi:** setiap kode hasil AI harus lulus typecheck + uji terkait sebelum masuk commit; tidak ada kode yang di-commit tanpa dibaca.
- **Batas:** AI tidak dipakai untuk menghasilkan data pribadi/perusahaan; seluruh seed adalah data fiktif.

*Stretch (tidak dikerjakan dalam timebox): ringkasan otomatis isi SOP dan saran tagging departemen.*

---

## 4. Technical Specifications

### 4.1 Arsitektur

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│  client/  (Vite + React 19) │  HTTP  │  server/  (Express 5 + TS)   │
│  React Router · TanStack Q │ ─────► │  routes → services → prisma  │
│  Tailwind v4 (design token)│ cookie │  zod validation · RBAC mid.  │
└────────────────────────────┘        └──────────────┬───────────────┘
                                                     │ Prisma
                                        ┌────────────▼────────────┐
                                        │ PostgreSQL 17 (local)   │
                                        └─────────────────────────┘
```

- Satu repo, npm workspaces: `client/`, `server/`, `shared/` (tipe & skema zod yang dipakai kedua sisi).
- Frontend hanya bicara ke `/api/v1/*`; di dev, Vite proxy ke `http://localhost:4000`.
- Semua logika izin dan transisi status ada di **server**; UI hanya menyembunyikan tombol, bukan sebagai pengaman.

### 4.2 Data Model (Prisma / Postgres)

| Model | Field penting |
|---|---|
| `User` | `id`, `email` (unique), `passwordHash`, `name`, `role` (enum), `departmentId`, `isActive`, `createdAt` |
| `Department` | `id`, `code` (unique), `name` |
| `Sop` | `id`, `code` (unique), `title`, `departmentId`, `ownerId`, `status` (enum), `requiresAcknowledgement`, `reviewPeriodMonths`, `currentVersionId`, `nextReviewAt`, timestamps |
| `SopVersion` | `id`, `sopId`, `versionNo`, `content` (markdown), `changeSummary`, `status` (enum), `effectiveDate`, `createdById`, `publishedById`, `publishedAt`; unique `(sopId, versionNo)` |
| `SopApproval` | `id`, `sopVersionId`, `actorId`, `action` (SUBMIT/APPROVE/REJECT/PUBLISH), `note`, `createdAt` |
| `Acknowledgement` | `id`, `sopVersionId`, `userId`, `acknowledgedAt`; unique `(sopVersionId, userId)` |
| `Announcement` | `id`, `title`, `body`, `sopId?`, `targetDepartmentId?`, `createdById`, `createdAt` |
| `ViolationReport` | `id`, `reporterId?` (null = anonim), `sopId?`, `description`, `status` (enum), `assignedToId?`, `createdAt` |
| `ReportFollowUp` | `id`, `reportId`, `actorId`, `fromStatus`, `toStatus`, `note`, `createdAt` |
| `AuditLog` | `id`, `actorId?`, `action`, `entityType`, `entityId`, `before` (jsonb), `after` (jsonb), `ip`, `createdAt`; index `(entityType, entityId)`, `(createdAt)` |

Enum `SopStatus`: `DRAFT | IN_REVIEW | APPROVED | PUBLISHED | SUPERSEDED | ARCHIVED`
Enum `Role`: `KARYAWAN | PIC_SOP | MANAGER | HRD | AUDITOR | MANAJEMEN`

**Keputusan desain:** `Sop` memegang status alur kerja, `SopVersion` memegang isi + status publikasinya. Pemisahan ini membuat versi terbit immutable tanpa memaksa duplikasi metadata SOP.

### 4.3 API (REST, `/api/v1`)

| Method | Path | Peran | Keterangan |
|---|---|---|---|
| POST | `/auth/login` | publik | Set cookie sesi |
| POST | `/auth/logout` | semua | Hapus cookie |
| GET | `/auth/me` | semua | Profil + izin |
| GET | `/sops` | semua | List + `?q=&department=&status=&requiresAck=&page=` |
| POST | `/sops` | PIC | Buat SOP + draft versi 1 |
| GET | `/sops/:id` | semua | Detail + versi aktif + timeline approval |
| PATCH | `/sops/:id` | PIC pemilik | Sunting draft |
| POST | `/sops/:id/submit` | PIC pemilik | DRAFT → IN_REVIEW |
| POST | `/sops/:id/approve` | Manager | IN_REVIEW → APPROVED |
| POST | `/sops/:id/reject` | Manager/HRD | → DRAFT (wajib `note`) |
| POST | `/sops/:id/publish` | HRD | APPROVED → PUBLISHED (+ `effectiveDate`) |
| POST | `/sops/:id/versions` | PIC pemilik | Buat draft versi baru |
| GET | `/sops/:id/versions` | semua | Riwayat versi |
| POST | `/sops/:id/acknowledge` | sesuai target | Idempoten |
| GET | `/sops/:id/acknowledgements` | PIC/Manager/HRD | Siapa sudah/belum |
| GET | `/dashboard/summary` | semua | Angka ringkasan per peran |
| GET/POST/DELETE | `/announcements` | HRD (tulis) | Pengumuman |
| GET/POST | `/reports` | semua (baca sesuai peran) | Laporan pelanggaran |
| POST | `/reports/:id/follow-ups` | Manager/HRD | Ubah status + catatan |
| GET | `/audit-logs` | Auditor/HRD | Filter + paginasi |

Konvensi error: `{ error: { code, message, details? } }`; kode: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INVALID_TRANSITION`, `CONFLICT`, `RATE_LIMITED`.

### 4.4 Frontend

- **Shell** mengikuti `docs/image.png`: sidebar kiri (logo, grup menu utama / grup "LAINNYA", item aktif berwarna emerald-soft, grup collapsible) + topbar (search global, ikon notifikasi & pesan, avatar + status).
- **Design token** dari `docs/DESIGN.md`: emerald `#3ecf8e` sebagai satu-satunya warna kromatik, skala abu `#ededed`–`#171717`, Inter weight 500 untuk display dengan negative tracking, radius 6px untuk tombol (tidak pill), border 1px hairline, shadow level 0–3.
- Halaman: Login · Dashboard · Daftar SOP · Detail SOP (tab: Isi / Riwayat Versi / Approval / Konfirmasi) · Editor SOP (markdown + preview) · Pengumuman · Laporan · Audit Log · Pengguna (read-only, Auditor/HRD).
- State server via TanStack Query; tidak ada Redux. Form pakai `react-hook-form` + resolver zod dari `shared/`.

### 4.5 Keamanan & Privasi

- Password: bcrypt cost 12; hash tidak pernah keluar dari server (field di-strip di serializer).
- Sesi: JWT ditandatangani HS256, disimpan di cookie `httpOnly` + `SameSite=Lax`; `Secure` aktif bila `NODE_ENV=production`.
- CSRF: karena cookie `SameSite=Lax` + semua mutasi via `POST/PATCH/DELETE` dengan `Content-Type: application/json`, ditambah pemeriksaan header `Origin` untuk permintaan mutasi.
- Otorisasi berlapis: middleware `authenticate` → `requireRole` → cek kepemilikan/kedepepartemenan di service layer. Setiap endpoint mutasi punya uji negatif (403).
- Validasi input: zod di setiap body/query/params; Prisma parameterized; pencarian full-text memakai `Prisma.sql` bertag, bukan string concat.
- Rate limit login 5/menit (in-memory — lihat catatan batasan).
- Audit log append-only; data anonim pada laporan tidak pernah dikembalikan.
- Tidak ada data pribadi nyata; seluruh seed fiktif dan diberi label di README.

### 4.6 Setup & Environment

- Node 24, npm 11 (npm workspaces).
- Postgres 17 lokal di `localhost:5432`, database `sop_center`.
- `.env.example`: `DATABASE_URL`, `SESSION_SECRET`, `PORT`, `CLIENT_ORIGIN`.
- Perintah: `npm install` → `npm run db:migrate` → `npm run db:seed` → `npm run dev`.
- `docker-compose.yml` disediakan sebagai alternatif Postgres, **tidak dijalankan** dalam pengembangan ini (port 5432 sudah dipakai Postgres lokal). Container dipetakan ke host port **5433** agar tidak bentrok dengan Postgres lokal siapa pun yang menjalankan repo ini.

### 4.7 Testing

| Lapis | Alat | Cakupan minimum |
|---|---|---|
| Unit | Vitest | State machine transisi (semua jalur valid + 6 jalur invalid), perhitungan kepatuhan, policy matrix |
| Integrasi API | Vitest + Supertest | 10 alur kritis: login, buat SOP, submit, approve, reject, publish, versi baru, acknowledge idempoten, 403 per peran, audit tertulis |
| E2E ringan | Playwright (1 skenario) | Login sebagai PIC → buat SOP → submit; login sebagai Manager → approve |
| Manual | Checklist di README | 6 peran × 3 layar utama |

Target: `npm test` hijau sebelum pengumpulan. Tidak mengejar angka coverage.

---

## 5. Risks & Roadmap

### 5.1 Rencana Bertahap (target 2 hari, ±21 jam kerja)

Cakupan **tidak dipotong** — 7 modul dan 6 peran tetap. Yang dikompresi adalah kedalaman dan polish per modul (lihat 5.1.1).

| Sesi | Durasi | Fokus | Definisi selesai |
|---|---|---|---|
| Hari 1 pagi | 4 j | Fondasi | Workspace, skema Prisma + migrasi, seed 6 peran/4 departemen/12 SOP lintas status, login + `policy.ts` + `requireRole` + audit middleware. Bukti: 6 akun bisa login, 403 benar pada 4 uji negatif |
| Hari 1 siang | 4 j | Inti SOP | CRUD SOP, `transition()` 3 tahap, versioning, timeline approval, audit tertulis. Bukti: 1 SOP DRAFT→PUBLISHED; versi 2 menandai versi 1 `SUPERSEDED` |
| Hari 1 malam | 3 j | Konsumsi | Daftar + cari + filter, detail SOP, konfirmasi idempoten, rekap kepatuhan |
| Hari 2 pagi | 4 j | Sekunder | Dashboard (4 angka + 2 tabel), pengumuman, laporan pelanggaran, penampil audit |
| Hari 2 siang | 4 j | Pemantapan | UI sesuai DESIGN.md + shell `image.png`, uji state machine + 17 uji integrasi, README |
| Hari 2 malam | 2 j | Kumpul | `ASSUMPTIONS.md`, `PROGRESS.md`, `AI_USAGE.md`, video 3–5 menit, submit |

**Garis berhenti:** pada akhir hari ke-2, apa pun statusnya, berhenti menulis fitur dan mulai menulis dokumentasi + rekam video. Dokumentasi dinilai eksplisit; fitur yang belum jadi cukup dinyatakan belum jadi.

#### 5.1.1 Kedalaman yang Diturunkan (bukan fitur yang dihapus)

| Modul | Versi 5 hari | Versi 2 hari |
|---|---|---|
| Pencarian | Postgres `tsvector` + peringkat | `ILIKE` pada kode/judul/isi, tanpa peringkat |
| Versioning | Diff per field di UI | Daftar versi + `changeSummary`; tanpa diff viewer |
| Konfirmasi | Rekap + filter + ekspor | Rekap tabel siapa sudah/belum; tanpa ekspor |
| Pengumuman | Target departemen + hapus + audit | Buat + daftar + target departemen; hapus opsional |
| Laporan | Assignment + riwayat penuh | Buat + ubah status + catatan tindak lanjut |
| Audit | Diff before/after di UI | Tabel + filter; JSON before/after tampil mentah |
| Uji | Unit + 10 integrasi + 1 E2E Playwright | Unit state machine + 10 integrasi; tanpa Playwright |
| UI | Semua state loading/empty/error | Loading skeleton hanya di 2 layar teratas |

**MVP (wajib, hari 1):** auth+RBAC, siklus SOP penuh, perpustakaan + konfirmasi, audit trail.
**v1.1 (hari 2):** dashboard, pengumuman, laporan.
**v2.0 (di luar timebox):** modul pembelajaran/kuis, notifikasi email, lampiran file, penjadwalan review otomatis, SSO.

### 5.2 Risiko Teknis

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Timebox terlalu pendek (5 hari efektif) | Modul sekunder tidak selesai | Urutan MVP dikunci; modul di luar MVP boleh berstatus placeholder dengan catatan eksplisit |
| Bug state machine (transisi ilegal lolos) | Data korup, nilai "kualitas teknis" jatuh | Satu fungsi `transition()` sebagai satu-satunya pintu + uji tabel seluruh pasangan status |
| Konfirmasi dihitung terhadap versi lama | Angka kepatuhan salah | Kepatuhan selalu di-join ke `sop.currentVersionId`, bukan versi apa pun |
| Rate limit in-memory hilang saat restart | Lemah terhadap brute force di multi-instance | `ponytail:` catat batasannya di kode; cukup untuk demo single-instance, ganti ke Redis bila multi-instance |
| Pencarian `tsvector` perlu konfigurasi bahasa | Hasil pencarian bahasa Indonesia kurang presisi | Pakai `simple` config + `ILIKE` fallback; catat sebagai batasan |
| Reviewer tidak bisa menjalankan (env beda) | Aplikasi tidak dinilai | `.env.example` + README langkah-per-langkah + seed idempoten + video demo sebagai jalur cadangan |
| Postgres lokal versi/port berbeda | Setup gagal | Docker compose disediakan sebagai alternatif; README menyebut versi yang diuji (17.11) |

### 5.3 Asumsi

1. Satu pengguna = satu peran. Tidak ada pengguna multi-peran (mis. Manager yang juga PIC).
2. "Departemen" adalah unit kepemilikan SOP; satu SOP milik tepat satu departemen.
3. Isi SOP berupa markdown, bukan file PDF/DOCX.
4. Konfirmasi baca hanya berlaku untuk versi terbit terbaru; versi baru mereset kepatuhan.
5. Approval bersifat berurutan dan tidak dapat diparalelkan; satu approver per tahap (siapa pun dengan peran tersebut di departemen itu).
6. Tidak ada delegasi saat approver cuti; tidak ada eskalasi otomatis.
7. Pengumuman tidak memerlukan approval — HRD langsung terbit.
8. Laporan pelanggaran tidak memerlukan verifikasi identitas; opsi anonim tersedia.
9. Audit log disimpan selamanya dalam lingkup demo; tidak ada retensi/arsip.
10. Zona waktu tunggal (Asia/Jakarta), disimpan UTC dan ditampilkan lokal.

### 5.4 Pertanyaan Terbuka

- Apakah konfirmasi baca perlu kedaluwarsa (mis. wajib ulang tiap 12 bulan)? — Diasumsikan **tidak** dalam timebox.
- Apakah Manager boleh menerbitkan bila HRD tidak tersedia? — Diasumsikan **tidak**.
- Apakah laporan pelanggaran perlu SLA/reminder? — Diasumsikan **tidak**.

---

## Lampiran A — Deliverable yang Dikumpulkan

1. README: prasyarat, langkah setup, akun seed, perintah uji, troubleshooting.
2. `docs/PRD.md` (dokumen ini), `docs/ASSUMPTIONS.md` (ringkasan asumsi & keputusan teknis), `docs/PROGRESS.md` (selesai / belum / kendala / rencana).
3. `docs/AI_USAGE.md` — transparansi penggunaan AI.
4. Video demo 3–5 menit + tautan Google Meet untuk walkthrough.
5. Screenshot 6 layar inti di `docs/screenshots/`.
