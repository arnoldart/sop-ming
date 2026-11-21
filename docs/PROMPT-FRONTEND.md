# PROMPT — Implementasi Frontend MING SOP Center

> **Cara pakai:** salin seluruh isi dokumen ini (mulai dari bagian "Peran" di
> bawah) ke agen coding, lalu jalankan. Dokumen ini ditulis agar agen tidak perlu
> menebak apa pun: kontrak API, token desain, dan definisi selesai sudah ada di
> dalamnya.

---

## Peran

Kamu adalah frontend engineer yang mengerjakan `client/` pada repo
`c:/Users/pgfe/Bitb/sop-ming`. Aplikasinya adalah **MING SOP Center** — aplikasi
internal untuk mengelola SOP perusahaan: siklus dokumen (draft → review →
approve → publish), konfirmasi baca, pengumuman, laporan pelanggaran, dan audit
trail, dengan 6 peran pengguna.

Backend **sudah selesai, sudah diuji (23 tes hijau), dan tidak boleh diubah.**
Desain **sudah selesai** dalam bentuk 9 layar di `sop.fig`. Tugasmu: membuat
aplikasi React-nya benar-benar jalan dan semua layar terhubung ke API nyata.

---

## Aturan yang tidak boleh dilanggar

1. **Jangan mengubah `server/`, `shared/`, atau `docs/PRD.md`.** Kalau menurutmu
   ada yang kurang di API, laporkan — jangan diam-diam menambah endpoint.
2. **Jangan menambah dependency baru.** Yang tersedia sudah cukup: React 19,
   Vite 6, Tailwind v4, TanStack Query 5, react-router-dom 7, react-hook-form,
   zod.
3. **Jangan mengarang data.** Semua angka dan daftar datang dari API. Mock hanya
   boleh dipakai kalau endpoint-nya memang belum ada — dan itu harus dilaporkan.
4. **Jangan mengubah token desain di `client/src/index.css`.** Token itu sudah
   diturunkan dari `docs/DESIGN.md`; memakainya, bukan menimpanya.
5. **Jangan memakai warna di luar palet.** Hijau `--color-primary` hanya untuk
   satu aksi utama per layar. Selain itu seluruh UI monokrom.
6. **Jangan menambah fitur yang tidak diminta.** Tidak ada dark mode, tidak ada
   ekspor, tidak ada diff viewer, tidak ada notifikasi.

---

## Keadaan repo saat ini

Sudah ada dan **wajib dipakai ulang** (jangan ditulis ulang):

| File | Isi |
|---|---|
| `client/src/index.css` | Token `@theme` (warna, radius, shadow, font) + kelas komponen `.card` `.btn` `.btn-primary` `.btn-outline` `.btn-ghost` `.input` `.label` `.pill` `.pill-primary` `.pill-soft` `.prose-sop` |
| `client/src/lib/api.ts` | `api.get/post/patch/del`, kelas `ApiError` (punya `status`, `code`, `details[]`), dan **semua tipe respons** (`Me`, `SopListItem`, `SopListResponse`, `SopDetail`, `DashboardSummary`, `Announcement`, `Report`, `AuditEntry`, `AuditResponse`, `UsersResponse`) |
| `client/src/lib/auth.tsx` | `AuthProvider`, `useAuth()` → `{ user, loading, login, logout }` |
| `client/src/lib/format.ts` | Formatter tanggal dan label status |
| `client/src/components/ui.tsx` | `Button`, `Card`, `Field`, `Input`, `StatusPill`, `EmptyState`, `Spinner`, `ErrorNote`, `PageHeader`, `Progress`, `SectionTitle` |
| `client/src/components/Icons.tsx` | `IconGrid`, `IconDoc`, `IconMegaphone`, `IconFlag`, `IconHistory`, `IconUsers`, `IconSearch`, `IconBell`, `IconChevronDown`, `IconChevronRight`, `IconCheck`, `IconPlus`, `IconLogout`, `IconClock`, `IconLock`, `IconArrowLeft`, `IconAlert` |
| `client/src/components/Markdown.tsx` | Renderer markdown untuk isi SOP |
| `client/src/components/AppShell.tsx` | Sidebar + topbar. **Belum diekspor sebagai layout rute** — sambungkan lewat `<Outlet />` |
| `client/src/pages/Login.tsx` | Layar login, sudah memakai `useAuth().login` |
| `client/src/pages/Dashboard.tsx` | Dashboard, sudah memakai `DashboardSummary` |

**Belum ada:** `client/src/main.tsx`, router, guard rute, dan 7 layar sisanya.
`client/index.html` menunjuk `/src/main.tsx` yang belum dibuat — jadi saat ini
`npm run dev -w client` tidak menyajikan apa pun. **Ini pekerjaan pertamamu.**

---

## Kontrak API

Base URL `/api`. Sesi lewat cookie `httpOnly` — `api.ts` sudah mengirim
`credentials: 'same-origin'`, jadi tidak perlu header Authorization.

Semua error berbentuk `{ error: { code, message, details? } }`. `ApiError`
sudah memetakannya; untuk 422 `details` berisi `{ field, message }[]` yang harus
ditampilkan di bawah input terkait.

| Method | Path | Peran | Catatan |
|---|---|---|---|
| POST | `/auth/login` | publik | body `{ email, password }` → `{ user }` |
| POST | `/auth/logout` | login | → `{ ok }` |
| GET | `/auth/me` | login | → `{ user }` |
| GET | `/sops` | semua | query: `q`, `department`, `status`, `requiresAck`, `page`, `limit` → `SopListResponse` |
| POST | `/sops` | PIC_SOP | body `{ code, title, summary, content, requiresAcknowledgement, reviewPeriodMonths }` → `{ id }` |
| GET | `/sops/:id` | semua | → `SopDetail` (termasuk `allowedActions`, `compliance`, `draftVersion`) |
| PATCH | `/sops/:id` | PIC_SOP (pemilik) | body parsial → `{ ok }` |
| POST | `/sops/:id/submit` | PIC_SOP | tanpa body → `{ ok, status }` |
| POST | `/sops/:id/approve` | MANAGER | tanpa body → `{ ok, status }` |
| POST | `/sops/:id/reject` | MANAGER, HRD | body `{ note }` (min 10 karakter) → `{ ok, status }` |
| POST | `/sops/:id/publish` | HRD | body `{ effectiveDate? }` → `{ ok, status }` |
| POST | `/sops/:id/versions` | PIC_SOP (pemilik) | body `{ changeSummary }` → `{ id, versionNo }` |
| POST | `/sops/:id/acknowledge` | KARYAWAN, PIC_SOP, MANAGER, HRD | tanpa body → `{ ok, alreadyAcknowledged, acknowledgedAt }` |
| GET | `/dashboard/summary` | semua | → `DashboardSummary` |
| GET | `/announcements` | login | → `{ items: Announcement[] }` |
| POST | `/announcements` | HRD | body `{ title, body, sopId?, targetDepartmentId? }` → `{ id }` |
| DELETE | `/announcements/:id` | HRD | → `{ ok }` |
| GET | `/reports` | login | → `{ canTriage, items: Report[] }` — pelapor hanya melihat laporannya sendiri |
| POST | `/reports` | semua | body `{ description, sopId?, anonymous }` → `{ id }` |
| POST | `/reports/:id/follow-ups` | MANAGER, HRD | body `{ status, note }` → `{ id, status }` |
| GET | `/audit-logs` | AUDITOR, HRD | query: `action`, `entityType`, `actorId`, `from`, `to`, `page`, `limit` → `AuditResponse` |
| GET | `/audit-logs/entities` | AUDITOR, HRD | → `{ items: { entityType, count }[] }` |
| GET | `/users` | AUDITOR, HRD | → `UsersResponse` (sudah termasuk daftar departemen) |

**Aturan penting:** jangan memutuskan sendiri tombol aksi mana yang tampil.
`SopDetail.allowedActions` sudah dihitung server berdasarkan peran **dan** status
**dan** kepemilikan. Pakai itu apa adanya.

---

## Token desain (sudah ada di `index.css`)

```
primary        #3ECF8E    primary-deep  #24B47E    primary-soft  #D8F8E9
on-primary     #171717    canvas        #FFFFFF    canvas-soft   #FAFAFA
hairline       #DFDFDF    hairline-strong #C7C7C7  hairline-cool #EDEDED
ink            #171717    ink-mute      #707070    ink-mute-2    #9A9A9A
ink-faint      #B2B2B2
radius: xs 4 · sm 6 · md 8 · lg 12 · xl 16
```

Aturan visual yang harus diikuti:

- Judul halaman 28px / weight 500 / `letter-spacing: -0.72px` (sudah jadi `h1`).
- Kartu: latar putih, border 1px `hairline`, radius 12px, **tanpa shadow**.
- Tombol: radius 6px, tinggi 36px, label 14px weight 500.
- Tombol primary: latar `primary`, teks `on-primary` (**hitam, bukan putih** —
  putih di atas hijau ini gagal kontras).
- Pil status: radius penuh, border 1px `hairline-cool`, teks 12px.
- Label kolom tabel: 12px, weight 500, warna `ink-mute`, huruf kapital.
- Baris tabel: tinggi 56px, garis pemisah 1px `hairline-cool`, tanpa zebra.
- Satu warna hijau per layar. Kalau ada dua tombol, hanya satu yang hijau.

---

## Layar yang harus dibuat

Referensi visual ada di `sop.fig` (buka dengan OpenPencil) — 13 frame
berderet horizontal, masing-masing 1440×900. Ekspor PNG-nya ada di
`docs/design-preview/`. Ikuti tata letaknya, tetapi **implementasikan dengan
HTML/CSS biasa** — jangan meniru posisi absolutnya.

| Rute | Layar | Referensi | Akses |
|---|---|---|---|
| `/login` | Login | `01 Login` | publik (sudah ada) |
| `/` | Dashboard | `02 Dashboard` | semua (sudah ada) |
| `/sop` | Daftar SOP | `03 Daftar SOP` | semua |
| `/sop/:id` | Detail SOP — tab **Isi / Riwayat Versi / Approval / Konfirmasi** | `04 Detail SOP` | semua |
| `/sop/new` | Editor SOP (buat) | `05 Editor SOP` | PIC_SOP |
| `/sop/:id/edit` | Editor SOP (sunting draft) | `05 Editor SOP` | PIC_SOP pemilik |
| `/pengumuman` | Pengumuman | `07 Pengumuman` | semua; form tulis hanya HRD |
| `/laporan` | Laporan pelanggaran | `08 Laporan` | semua; panel tindak lanjut hanya MANAGER/HRD |
| `/audit` | Audit Log | `06 Audit Log` | AUDITOR, HRD |
| `/pengguna` | Pengguna (read-only) | `09 Pengguna` | AUDITOR, HRD |
| — | Akses ditolak (403) | `10 Akses ditolak` | rute apa pun yang perannya tidak berhak |

### Perilaku yang wajib ada

**Umum**
- `main.tsx` merender `QueryClientProvider` → `BrowserRouter` → `AuthProvider` →
  rute. `AuthProvider` memanggil `/auth/me` sekali saat mount.
- Rute terlindungi: belum login → redirect `/login?next=<path>`; peran tidak
  berhak → halaman 403 dengan pesan jelas (bukan blank).
- Item navigasi di sidebar yang tidak boleh diakses peran tersebut **disembunyikan**,
  bukan ditampilkan lalu error.
- Setiap halaman punya tiga state: `Spinner` saat memuat, `EmptyState` saat
  kosong, `ErrorNote` saat gagal. Jangan biarkan layar putih.

**Daftar SOP**
- Pencarian dengan debounce 300ms ke `?q=`; filter status dan departemen.
- Paginasi dari `total`/`page`/`limit`.
- Baris menampilkan: kode, judul, departemen, status (`StatusPill`), versi,
  dan penanda "belum dikonfirmasi" bila `requiresAcknowledgement && !acknowledgedByMe`.

**Detail SOP**
- Tab **Isi**: render `currentVersion.content` (atau `draftVersion.content` bila
  SOP masih draft) lewat `Markdown`.
- Tab **Riwayat Versi**: `versions[]` — nomor, status, `changeSummary`, tanggal efektif.
- Tab **Approval**: `approvals[]` sebagai timeline vertikal (aksi, aktor, peran, catatan, waktu).
- Tab **Konfirmasi**: `compliance` (`total`, `acknowledged`, `pending[]`) + `Progress`.
  Kalau `compliance === null`, tampilkan penjelasan bahwa rekap hanya untuk
  PIC/Manager/HRD — **jangan** sembunyikan tab tanpa alasan.
- Tombol aksi dirender dari `allowedActions`: `SUBMIT`, `APPROVE`, `REJECT`,
  `PUBLISH`. `REJECT` wajib membuka dialog catatan (min 10 karakter) dan
  menampilkan error 422 di bawah textarea. `PUBLISH` boleh meminta tanggal efektif.
- Setelah aksi berhasil: invalidate query detail + daftar + dashboard.
- Konfirmasi baca: tombol nonaktif dan berubah jadi "Sudah dikonfirmasi" bila
  `acknowledgedByMe`; respons `alreadyAcknowledged: true` juga harus dianggap sukses.

**Editor SOP**
- `react-hook-form` + skema zod dari `@sop/shared` (`createSopSchema` /
  `updateSopSchema`) — jangan menulis ulang aturan validasinya.
- Pratinjau markdown berdampingan dengan textarea.
- `requiresAcknowledgement` dan `reviewPeriodMonths` sebagai kontrol eksplisit,
  bukan tersembunyi.
- SOP berstatus `PUBLISHED` tidak boleh disunting — arahkan ke "buat versi baru"
  (`POST /sops/:id/versions`) dengan input `changeSummary`.

**Pengumuman**
- Daftar terbaru di atas. Form tulis (judul, isi, target departemen) hanya
  dirender untuk HRD. Tombol hapus dengan konfirmasi.

**Laporan**
- Dua kolom: daftar laporan (kiri) + panel tindak lanjut (kanan) untuk
  MANAGER/HRD. Untuk peran lain, tampilkan hanya daftar + tombol "Buat laporan".
- Form buat laporan punya saklar **anonim** yang jelas menjelaskan bahwa
  identitas tidak disimpan.
- Panel tindak lanjut: ubah status + catatan → `POST /reports/:id/follow-ups`.
  Status tujuan sama dengan status sekarang akan ditolak 403 — tangani dengan pesan.

**Audit Log**
- Tabel: waktu, aktor, aksi, entitas, `before`/`after` (JSON mentah dalam `<details>`
  agar tidak memenuhi layar), IP.
- Filter aksi dan `entityType`; paginasi dari `total`.

**Pengguna**
- Read-only. Tabel: nama + email, peran, departemen, status aktif, dibuat.
- Tidak ada tombol tambah/ubah/hapus — backend memang tidak menyediakannya.

---

## Definisi selesai

Jangan menganggap tugas selesai sebelum semua ini benar:

1. `npm run build` di root keluar dengan kode 0 (server **dan** client).
2. `npm run dev` menyajikan aplikasi di browser; tidak ada error di console.
3. Login dengan 6 akun seed berhasil, dan sidebar tiap peran menampilkan menu
   yang berbeda sesuai tabel akses di atas.
4. Membuka `/audit` sebagai KARYAWAN menampilkan 403, bukan layar kosong.
5. Siklus penuh bisa dilakukan lewat UI: PIC membuat SOP → submit → Manager
   approve → HRD publish → Karyawan konfirmasi. Setelah itu angka di Dashboard
   ikut berubah.
6. Setiap halaman punya state memuat / kosong / error yang terlihat.
7. `npm test -w server` tetap **23/23 hijau** — kamu tidak boleh merusak backend.
8. Tidak ada `any` yang tidak perlu, tidak ada `console.log` yang tertinggal.

---

## Cara melapor

Setelah selesai, laporkan:

- File yang dibuat dan diubah.
- Perintah yang kamu jalankan beserta hasilnya (tempel keluaran `build` dan `test`).
- Apa pun yang **tidak** berhasil, tanpa dibungkus kata "hampir selesai".
- Bagian mana dari desain yang tidak bisa kamu tiru persis dan alasannya.
