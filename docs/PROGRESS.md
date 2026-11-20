# PROGRESS — MING SOP Center

> Status per **2026-11-20**. Dokumen ini ditulis apa adanya: yang selesai
> disebut dengan buktinya, yang belum disebut tanpa dibungkus.

---

## Ringkasan

Backend **selesai dan teruji**: 10 model, 23 endpoint, seluruh siklus SOP
berjalan, RBAC ditegakkan di satu tempat, dan 23 tes hijau. Desain **selesai**:
9 layar di `sop.fig`. Frontend **baru sebagian** — shell, komponen dasar, dan 2
layar ada, tetapi belum ada entry point sehingga aplikasi belum bisa dijalankan
di browser.

Artinya: inti penilaian (logika, otorisasi, model data, desain) sudah bisa
diperiksa sekarang; yang tersisa adalah menyambungkan UI ke API yang sudah ada.

---

## 1. Status deliverable (PRD Lampiran A)

| # | Deliverable | Status | Catatan |
|---|---|---|---|
| 1 | `README.md` — prasyarat, setup, akun seed, perintah uji | **Belum** | Akan ditulis setelah frontend bisa dijalankan, agar langkahnya sudah terbukti |
| 2 | `docs/PRD.md` | **Selesai** | 366 baris, 10 user story dengan AC, matriks izin 6×11 |
| 2 | `docs/ASSUMPTIONS.md` | **Selesai** | 15 asumsi produk + 22 keputusan teknis/desain, masing-masing dengan alasan dan dampak |
| 2 | `docs/PROGRESS.md` | **Selesai** | Dokumen ini |
| 3 | `docs/AI_USAGE.md` | **Selesai** | Termasuk log prompt dan daftar kesalahan AI yang tertangkap |
| 4 | Video demo 3–5 menit | **Belum** | Direkam setelah UI jalan; tidak masuk akal merekam layar yang belum ada |
| 5 | Screenshot 6 layar inti | **Sebagian** | 9 mockup desain ada di `docs/design-preview/`; screenshot aplikasi asli menyusul |

**Dokumen tambahan (tidak diminta brief):** `docs/PROMPT-FRONTEND.md` — spesifikasi
serah-terima untuk melanjutkan frontend: kontrak 23 endpoint, token desain, peta
rute, dan definisi selesai. Ditulis supaya pekerjaan bisa dilanjutkan tanpa
menebak, termasuk oleh saya sendiri di sesi berikutnya.

---

## 2. Yang sudah selesai

### 2.1 Fondasi & data

| Item | Bukti |
|---|---|
| Monorepo npm workspaces (`shared`, `server`, `client`) | `package.json` root dengan `dev`/`build`/`test` yang menjalankan ketiganya |
| 10 model Prisma + 5 enum | `server/prisma/schema.prisma` — Department, User, Sop, SopVersion, SopApproval, Acknowledgement, Announcement, ViolationReport, ReportFollowUp, AuditLog |
| Seed idempoten | `server/prisma/seed.ts` — 4 departemen, 25 pengguna, 12 SOP lintas status, 12 versi, 11 konfirmasi, 48 baris audit, 3 pengumuman, 3 laporan |
| Migrasi & reset | `npm run db:migrate`, `db:seed`, `db:reset` |
| Docker compose alternatif | Postgres 17 dipetakan ke port **5433** agar tidak menabrak Postgres lokal di 5432 |

### 2.2 Autentikasi & otorisasi

| Item | Bukti |
|---|---|
| Login sesi cookie `httpOnly` + `SameSite=Lax`, bcrypt cost 12 | `server/src/auth.ts`, `server/src/routes/auth.ts` |
| Pemeriksaan origin (CSRF) untuk request non-GET | `server/src/app.ts:21` |
| Satu matriks izin, 14 permission × 6 peran | `server/src/policy.ts` — `MATRIX` |
| `requirePermission()` dipakai di semua route | 7 router di `server/src/routes/` |
| Kepemilikan dicek di service, bukan hanya di route | `server/src/services/sopService.ts` — PIC hanya menyunting SOP departemennya |
| Rate limit login 5/menit | `server/src/routes/auth.ts` — dinonaktifkan saat `NODE_ENV=test` |

### 2.3 Siklus SOP

| Item | Bukti |
|---|---|
| `TRANSITION_RULES` sebagai satu-satunya sumber kebenaran, dipakai client & server | `shared/src/index.ts` |
| `transition()` sebagai satu-satunya pintu perubahan status | `server/src/services/sopService.ts` |
| Alur DRAFT → IN_REVIEW → APPROVED → PUBLISHED → versi baru menandai versi lama `SUPERSEDED` | Diverifikasi manual lewat curl **dan** tes integrasi |
| Versi terbit tidak dapat disunting; perubahan = versi baru | `createNewVersion()` |
| Konfirmasi baca idempoten | `@@unique([sopVersionId, userId])` + upsert |
| Rekap kepatuhan dihitung terhadap `currentVersionId`, bukan versi apa pun | `getSop()` |
| Audit ditulis pada setiap mutasi, `before`/`after` JSON | `AUDIT_ACTION` map + `AuditLog` |

### 2.4 API

23 endpoint di 7 router (`server/src/routes/`):

| Router | Jumlah | Isi |
|---|---|---|
| `/api/auth` | 3 | login, logout, me |
| `/api/sops` | 10 | list, create, detail, update, submit, approve, reject, publish, versi baru, konfirmasi |
| `/api/dashboard` | 1 | 4 angka + 2 tabel ringkas |
| `/api/announcements` | 3 | list, create, delete |
| `/api/reports` | 3 | list, create, tindak lanjut |
| `/api/audit-logs` | 2 | list + filter, detail |
| `/api/users` | 1 | direktori (HRD & Auditor) |

Semua endpoint mengembalikan error terstruktur (`AppError`), validasi zod
menghasilkan 422 dengan detail per-field, dan konflik unik Prisma dipetakan ke
409.

### 2.5 Tes

```
Test Files  2 passed (2)
     Tests  23 passed (23)
  Duration  7.86s
```

- `server/test/stateMachine.test.ts` — 6 tes: 5 aturan sah, 7 kombinasi ilegal,
  daftar aksi per status, batasan peran, cakupan seluruh status.
- `server/test/api.test.ts` — 17 tes integrasi: login, 4 uji negatif otorisasi,
  siklus penuh, transisi ganda → 409, reject tanpa catatan → 422, PIC lain
  menyunting → 403, versi baru menandai versi lama, konfirmasi idempoten,
  konfirmasi lintas departemen → 403, aturan visibilitas.

Tes memakai database terpisah `sop_center_test` yang dibuat `globalSetup` lewat
`prisma db push --accept-data-loss`, sehingga tidak menyentuh data demo.

### 2.6 Desain

9 layar 1440×900 di `sop.fig`, semuanya lewat MCP `open-pencil`:

| # | Layar | Node ID |
|---|---|---|
| 01 | Login | `1940361353:104` |
| 02 | Dashboard | `1940361353:255` |
| 03 | Daftar SOP | `1940361353:370` |
| 04 | Detail SOP (tab Isi / Riwayat / Approval / Konfirmasi) | `1940361353:620` |
| 05 | Editor SOP | `1940361353:732` |
| 06 | Audit Log | `1940361353:828` |
| 07 | Pengumuman | `1940361353:962` |
| 08 | Laporan | `1940361353:1049` |
| 09 | Pengguna | `1940361353:1150` |

Ekspor PNG untuk review: `docs/design-preview/` (9 layar + 1 detail panel).
Setiap layar sudah diperiksa secara visual dan cacat tata letaknya diperbaiki
(tumpang tindih teks, pil yang melipat, label yang terpotong).

### 2.7 Frontend (sebagian)

| Item | Status |
|---|---|
| `client/src/index.css` — token Tailwind v4 (`@theme`) dari `DESIGN.md` | Ada |
| `lib/api.ts` — fetch wrapper + penanganan error | Ada |
| `lib/auth.tsx` — context sesi + guard | Ada |
| `lib/format.ts` — tanggal & label status | Ada |
| `components/ui.tsx`, `Icons.tsx`, `Markdown.tsx` | Ada |
| `components/AppShell.tsx` — sidebar + topbar | Ada |
| `pages/Login.tsx` | Ada |
| `pages/Dashboard.tsx` | Ada |
| `main.tsx` + router + 7 layar lain | **Belum** |

---

## 3. Yang belum selesai

| Item | Perkiraan usaha | Catatan |
|---|---|---|
| `client/src/main.tsx` + router + guard rute | 1 jam | Tanpa ini `vite` tidak menyajikan apa pun — `index.html` menunjuk `/src/main.tsx` yang belum ada |
| 7 layar: Daftar SOP, Detail SOP, Editor SOP, Pengumuman, Laporan, Audit Log, Pengguna | 6–8 jam | Desainnya sudah ada; tinggal disambungkan ke endpoint yang sudah ada |
| `README.md` | 1 jam | Ditulis setelah aplikasi benar-benar bisa dijalankan |
| Video demo 3–5 menit | 1 jam | Butuh aplikasi jalan |
| Screenshot aplikasi asli di `docs/screenshots/` | 30 menit | Butuh aplikasi jalan |

---

## 4. Kendala yang ditemui dan cara mengatasinya

| Kendala | Akar masalah | Penyelesaian |
|---|---|---|
| `PrismaClientValidationError: Unknown field 'approvals'` | `include: { approvals }` dipasang di model `Sop`, padahal relasinya ada di `SopVersion` | Query `SopApproval` terpisah dengan `sopVersionId: { in: [...] }` |
| Approve ditolak 422 "catatan wajib" | Syarat catatan ditulis untuk `APPROVE` **dan** `REJECT` | Catatan hanya wajib untuk `REJECT` — approve tanpa catatan adalah kasus normal |
| Login 500 `env is not defined` | Menambah `if (env.NODE_ENV === 'test')` tanpa mengimpor `env` | Tambah `import { env } from '../env.js'` |
| Seluruh suite gagal 429 | Rate limit login 5/menit terkunci oleh tes itu sendiri | Rate limit dilewati saat `NODE_ENV=test` |
| Tes saling menabrak dengan 409 | Semua tes memakai kode `SOP-OPR-001` | Counter modul-level untuk kode unik per tes |
| Nama aksi audit tidak cocok | Service menulis `SOP_APPROVE`, tes mengharapkan `SOP_APPROVED` | Peta `AUDIT_ACTION` dengan bentuk past tense, satu sumber untuk service dan seed |
| Peringatan `baseUrl` deprecated (TS 7.0) | `baseUrl` di `tsconfig` | Dihapus; path dipetakan relatif (`./src/*`). **Tidak** memakai `ignoreDeprecations: "6.0"` karena TS 5.9 hanya menerima `"5.0"` |
| MCP desain tidak bisa konek | `~/.codebuddy/mcp.json` menunjuk aplikasi **Pen**, sedangkan `sop.fig` dibuka dengan **OpenPencil** — dua produk berbeda | Mendaftarkan server `open-pencil` per-proyek; setelah itu seluruh desain dikerjakan lewat tool tersebut |

---

## 5. Rencana berikutnya

| Urutan | Pekerjaan | Definisi selesai |
|---|---|---|
| 1 | `main.tsx` + router + guard | `npm run dev` menyajikan aplikasi; login mengarah ke dashboard; rute terlarang menampilkan 403 |
| 2 | Daftar SOP + Detail SOP | Cari, filter status, dan tab Riwayat/Approval/Konfirmasi terisi dari API nyata |
| 3 | Editor SOP | Buat draft, sunting, ajukan; tombol aksi mengikuti `allowedActions()` dari server |
| 4 | Pengumuman, Laporan, Audit Log, Pengguna | Empat layar sisa, masing-masing dengan state kosong dan state error |
| 5 | README + screenshot + video | Penguji lain bisa menjalankan dari nol hanya dengan README |

**Garis berhenti tetap berlaku:** kalau waktu habis sebelum langkah 5, saya
berhenti menambah fitur dan menyelesaikan dokumentasi + video, karena itu
dinilai eksplisit sedangkan fitur yang belum jadi cukup dinyatakan belum jadi.
