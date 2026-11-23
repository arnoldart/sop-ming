# PROGRESS — MING SOP Center

> Status per **2026-11-23**, commit `57cff59`. Dokumen ini ditulis apa adanya:
> yang selesai disebut dengan buktinya, yang belum disebut tanpa dibungkus.

---

## Ringkasan

Backend **selesai dan teruji**: 10 model, 23 endpoint, seluruh siklus SOP
berjalan, RBAC ditegakkan di satu tempat, dan 23 tes hijau. Desain **selesai**:
10 layar di `sop.fig`, dengan Detail SOP dipecah menjadi 4 frame (total 13
frame). Frontend **selesai dan tersambung ke API nyata**: 10 rute, seluruh aksi
memakai `allowedActions` dari server, `npm run build` keluar 0, dan `npm test`
tetap 23/23.

Artinya: aplikasi bisa dijalankan dan diperiksa end-to-end, termasuk lewat demo
daring. Yang tersisa bukan fitur, melainkan video demo.

---

## 1. Status deliverable (PRD Lampiran A)

| # | Deliverable | Status | Catatan |
|---|---|---|---|
| 1 | `README.md` — prasyarat, setup, akun seed, perintah uji | **Selesai** | Termasuk bagian demo daring, keputusan desain, dan batasan yang diketahui |
| 2 | `docs/PRD.md` | **Selesai** | 366 baris, 10 user story dengan AC, matriks izin 6×11 |
| 2 | `docs/ASSUMPTIONS.md` | **Selesai** | 15 asumsi produk + 22 keputusan teknis/desain, masing-masing dengan alasan dan dampak |
| 2 | `docs/PROGRESS.md` | **Selesai** | Dokumen ini |
| 3 | `docs/AI_USAGE.md` | **Selesai** | Termasuk log prompt dan daftar kesalahan AI yang tertangkap |
| 4 | Video demo 3–5 menit | **Belum** | Alur yang akan direkam sudah bisa dijalankan lewat UI |
| 5 | Screenshot 6 layar inti | **Selesai** | 8 screenshot aplikasi asli di `docs/screenshots/`, diambil dari instance daring |
| 6 | Link demo | **Selesai** | <https://sopming.arnoldartworks.my.id>, akun demo tercantum di README |

**Dokumen tambahan (tidak diminta brief):**

- `docs/PLAN-FRONTEND.md` — peta kerja 10 fase beserta gerbang lulusnya.
- `docs/PROMPT-FRONTEND.md` — kontrak 23 endpoint, token desain, peta rute, dan
  definisi selesai.
- `docs/AI-HANDOFF.md` — alur kerja, konvensi kode, jebakan, dan sisa pekerjaan
  untuk sesi AI berikutnya.

Ketiganya ditulis supaya pekerjaan bisa dilanjutkan tanpa menebak, termasuk
oleh saya sendiri di sesi berikutnya.

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

13 frame 1440×900 di `sop.fig`, semuanya lewat MCP `open-pencil`. Frame
disusun berjajar pada `y = 0`, jarak antar frame 1520px, lebar konten 1128px
(sidebar 248 + padding 32 + 1128 + 32 = 1440):

| # | Layar | Node ID | x |
|---|---|---|---|
| 01 | Login | `0:4` | 0 |
| 02 | Dashboard | `0:38` | 1520 |
| 03 | Daftar SOP | `0:151` | 3040 |
| 04 | Detail SOP — tab Isi | `0:285` | 4560 |
| 04b | Detail SOP — tab Riwayat Versi | `997516146:29` | 6080 |
| 04c | Detail SOP — tab Approval | `997516146:103` | 7600 |
| 04d | Detail SOP — tab Konfirmasi | `997516146:177` | 9120 |
| 05 | Editor SOP | `0:395` | 10640 |
| 06 | Audit Log | `0:489` | 12160 |
| 07 | Pengumuman | `0:619` | 13680 |
| 08 | Laporan | `0:706` | 15200 |
| 09 | Pengguna | `0:801` | 16720 |
| 10 | Akses ditolak (403) | `997516146:271` | 18240 |

Detail SOP dipecah menjadi empat frame karena PRD §4.4 mewajibkan empat tab;
satu frame per tab membuat state aktif, underline tab, dan isi panel bisa
diperiksa tanpa menyembunyikan layer.

Ekspor PNG untuk review: `docs/design-preview/`. Setiap layar sudah diperiksa
secara visual dan cacat tata letaknya diperbaiki (tumpang tindih teks, pil yang
melipat, label yang terpotong, tombol Sunting pada SOP berstatus terbit).

### 2.6.1 Perbaikan desain (review 2026-11-21)

Temuan review dan perbaikannya:

| Temuan | Perbaikan |
|---|---|
| Tombol "Sunting" tetap tampil pada SOP berstatus Terbit (melanggar US-2) | Dihapus dari layar 04 |
| Highlight navigasi layar 09 bernama "Nav active Laporan" | Diganti nama menjadi "Nav active Pengguna" |
| Kolom PERUBAHAN di Audit Log terpotong | Kolom digeser ke `x = 1040`, teks dipendekkan, `auto_resize` diset |
| Stat 2/3/4 di layar 09 tidak sejajar grid | Disetel ke `x = 565 / 850 / 1135`, lebar 273, jarak 12 — keempat kartu kini menempati 280…1408 |
| Kontras teks gagal WCAG AA (140 error) | Seluruh teks sekunder `#9A9A9A`/`#A3A3A3`/`#B2B2B2` → `#707070` (4.95:1). Lint kontras: 0 error |
| Pil status "Terbit" memakai hijau penuh sehingga bersaing dengan CTA | Diganti `#D8F8E9` (primary-soft), teks tetap `#171717`. Berlaku juga untuk pil "Selesai" di layar 08 |
| Label tabel 11px | Dinaikkan ke 12px |
| Tinggi baris tabel 64px | 56px, tinggi tabel 492 → 436, footer dan pagination naik 56px |
| Sel IP di Audit Log berisi `::1` (alamat loopback) sehingga terbaca seperti ikon | Diisi IPv4 internal yang wajar (`10.20.4.18` dst.) |
| Layar 08 punya dua tombol hijau penuh ("Buat laporan" dan "Simpan tindak lanjut") | "Buat laporan" jadi tombol garis; hanya "Simpan tindak lanjut" yang hijau — satu CTA per viewport |
| Kartu daftar laporan menyisakan 184px kosong di bawah | Catatan kaki dipindah ke footer kartu dengan garis pemisah di `y = 536` |
| Tab Riwayat Versi dan Approval hanya teks polos di kartu 600px | Riwayat Versi jadi daftar dua baris (nomor, pil status, tanggal berlaku, ringkasan, penulis); Approval jadi timeline tiga langkah dengan titik, garis penghubung, dan blok catatan. Tinggi kartu mengikuti isi: 260, 336, dan 252 (Konfirmasi) |
| Layar 403 belum ada padahal disebut PROMPT | Frame 10 "Akses ditolak": kartu tengah 480×300, badge 403, dua tombol |

### 2.7 Frontend (selesai)

| Item | Bukti |
|---|---|
| Fondasi: router, auth guard, shell, QueryClient, komponen common | `client/src/main.tsx`, `App.tsx`, `components/layout/`, `components/common/` |
| Login & Dashboard | `pages/Login.tsx`, `pages/Dashboard.tsx` — 4 kartu, 2 tabel, pengumuman; semua angka dari `/dashboard/summary` |
| Perpustakaan SOP | `pages/sop/SopListPage.tsx` — pencarian debounce 300 ms, filter, paginasi; state filter di URL |
| Detail SOP 4 tab | `pages/sop/SopDetailPage.tsx`, `components/sop/DetailTabs.tsx` — tab aktif tersimpan di URL |
| Aksi SOP & editor | `components/sop/ActionBar.tsx` — tombol dari `allowedActions`; dialog tolak/terbitkan/versi baru; editor markdown dua kolom |
| Pengumuman | `pages/AnnouncementsPage.tsx` — form hanya HRD, hapus dengan konfirmasi |
| Laporan pelanggaran | `pages/ReportsPage.tsx` — dua kolom, panel tindak lanjut hanya Manager/HRD |
| Audit Log | `pages/AuditPage.tsx` — filter aktor/entitas/aksi, `before`/`after` di dalam `<details>` |
| Pengguna | `pages/UsersPage.tsx` — read-only, 25 akun seed, paginasi 7 per halaman |
| 403 & 404 | `pages/Forbidden.tsx`, `pages/NotFound.tsx` |

Pengerjaan dibagi menjadi 10 fase (0–9), satu commit per fase. Setiap fase
lulus gerbangnya sendiri sebelum lanjut: `npm run build -w client` hijau, endpoint
diuji dengan curl termasuk satu kasus 403, dan screenshot dibaca.

### 2.8 Verifikasi akhir

| Pemeriksaan | Hasil |
|---|---|
| `npm run build` di root (server `tsc --noEmit` + client) | 0 error |
| `npm test` | 23/23 hijau |
| Screenshot 1440×1000 seluruh layar | Tidak ada teks terpotong, kolom kosong, atau dua CTA hijau |
| Screenshot 390×844 (emulasi CDP) | Filter membungkus, kartu satu kolom, 4 tab detail muat, tabel scroll horizontal |
| Sidebar mobile | `Sheet` 248px terbuka penuh, menu dan footer pengguna utuh |
| Console browser di 10 rute | Bersih; hanya 401 `/auth/me` saat anonim dan `favicon.ico` 404 |
| Cacat yang ditemukan & diperbaiki | Kartu "Menunggu tindakan Anda" memanjang mengikuti kolom kanan → grid diberi `items-start` |

---

## 3. Yang belum selesai

Tidak ada pekerjaan fitur yang tersisa. Yang belum ada adalah deliverable
serah terima:

| Item | Perkiraan usaha | Catatan |
|---|---|---|
| `README.md` | 1 jam | Prasyarat, langkah setup, akun seed, perintah uji, troubleshooting |
| Screenshot aplikasi asli di `docs/screenshots/` | 30 menit | 6 layar inti; mockup desain sudah ada di `docs/design-preview/` |
| Video demo 3–5 menit | 1 jam | Alur PIC → Manager → HRD → Karyawan, lalu angka Dashboard berubah |
| Finalisasi `PROGRESS.md` setelah rekaman | 15 menit | Menyebut hasil akhir dan menautkan video |

Di luar cakupan dan tidak akan dikerjakan meski waktu tersisa (alasannya ada di
`ASSUMPTIONS.md` §6): modul kuis, notifikasi email, lampiran file, penjadwalan
review otomatis, SSO, aplikasi mobile.

**Diketahui, sengaja dibiarkan:**

- Entri audit dari login di mesin lokal menampilkan IP `::1`. Itu alamat
  loopback yang sebenarnya; data seed tetap memakai IPv4 internal yang wajar.
  Tidak diubah karena kolom IP adalah bukti, bukan hiasan.
- `favicon.ico` belum ada sehingga console browser mencatat 404. Tidak
  memengaruhi tampilan atau fungsi layar.

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
| `TS5102: Option 'baseUrl' has been deprecated` | TypeScript 7 menolak `baseUrl` | `baseUrl` dihapus; path dipetakan relatif (`"@/*": ["./src/*"]`) |
| Build gagal di kelas `ApiError` | `erasableSyntaxOnly` melarang parameter properties di constructor | Field `status`, `code`, `details` dideklarasikan eksplisit |
| Semua POST dibalas 403 | Vite pindah ke port 5174, sedangkan server memeriksa `Origin: http://localhost:5173` | `strictPort: true`; proses lama dimatikan sebelum `npm run dev` |
| Jam tampil `13,18` alih-alih `13.18` | `toLocaleTimeString` mengikuti locale mesin | Semua tanggal lewat `formatDateTime` di `lib/format.ts` |
| Dua tombol hijau dalam satu layar | Tiap komponen memutuskan sendiri tombol mana yang "utama" | Satu pemilik CTA di level halaman (`ActionBar`, `ReportsPage`) |
| Underline tab menjadi kotak | `after:` pseudo-element pada label tab | `border-b-2` + `data-active:border-b-foreground` + `-mb-px` |
| Filter departemen kosong untuk Karyawan | Opsi diambil dari `/users`, yang hanya terbuka untuk HRD/Auditor | Opsi diturunkan dari data yang memang terlihat (`/sops`), atau filter disembunyikan |
| SOP terbit tampak "Draft" setelah versi baru | `Sop.status` (alur kerja) berbeda dari `currentVersion.status` (publikasi) | Kolom daftar memakai `isPublished`; banner draft hanya bila `draft.id !== published.id` |
| Detail SOP tak berizin dibalas 404 | Aturan privasi server, bukan 403 | Panel "SOP tidak ditemukan", bukan halaman 403 |
| Kolom Perubahan/IP di Audit kosong | Seed lama menulis `{seeded:true}` tanpa `before`/`after`/`ip` | Seed diperbaiki mengikuti bentuk payload service |

---

## 5. Rencana berikutnya

| Urutan | Pekerjaan | Definisi selesai |
|---|---|---|
| 1 | `README.md` | Orang lain bisa menjalankan dari clone bersih dalam ≤ 5 perintah, tanpa mengedit kode |
| 2 | Screenshot 6 layar inti | `docs/screenshots/` berisi gambar aplikasi asli, bukan mockup |
| 3 | Video demo 3–5 menit | Siklus PIC → Manager → HRD → Karyawan terekam, angka Dashboard berubah setelah konfirmasi |
| 4 | Finalisasi dokumen | `PROGRESS.md` menyebut hasil akhir dan menautkan video; `AI_USAGE.md` diperbarui bila ada temuan baru |

**Garis berhenti tetap berlaku:** tidak ada lagi fitur yang ditambahkan. Sisa
waktu dipakai untuk dokumentasi, screenshot, dan video, karena itu dinilai
eksplisit sedangkan fitur yang belum jadi cukup dinyatakan belum jadi.
