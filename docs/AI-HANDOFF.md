# AI-HANDOFF — Cara kerja untuk sesi AI berikutnya

> **Untuk siapa:** agen AI yang membuka repo ini tanpa riwayat percakapan.
> **Tujuan:** kamu bisa langsung bekerja tanpa menebak alur, konvensi, atau cara
> membuktikan pekerjaanmu sendiri.
> **Status dokumen:** 2026-11-21, commit `507b407`, fase 0–7 selesai.

---

## 0. Ringkasan 60 detik

MING SOP Center — aplikasi internal pengelola SOP: siklus dokumen
(draft → review → approve → publish), konfirmasi baca, pengumuman, laporan
pelanggaran, audit trail. Enam peran: `KARYAWAN`, `PIC_SOP`, `MANAGER`, `HRD`,
`AUDITOR`, `MANAJEMEN`.

Monorepo npm workspaces: `shared/` (tipe + state machine + skema zod),
`server/` (Express 5 + Prisma 6 + Postgres), `client/` (Vite 8 + React 19 +
Tailwind v4 + shadcn/ui + TanStack Query 5).

**Backend selesai dan teruji (23 tes). Frontend 8 dari 9 layar selesai; sisa
layar Pengguna dan pemantapan.** Pekerjaan dilakukan per fase, satu commit per
fase.

```bash
npm install          # sekali
npm run db:seed      # isi data demo
npm run dev          # API :4000 + Vite :5173
```

---

## 1. Urutan membaca dokumen — dan mana yang sudah usang

Baca berurutan, jangan lompat ke kode dulu:

| # | Dokumen | Dipakai untuk |
|---|---|---|
| 1 | `docs/PRD.md` | Sumber kebenaran kebutuhan: 10 user story + AC, matriks izin |
| 2 | `docs/DESIGN.md` | Token warna/radius/tipografi dan aturan "satu CTA hijau per layar" |
| 3 | `docs/PLAN-FRONTEND.md` | **Peta kerja.** Daftar fase, file per fase, gerbang tiap fase |
| 4 | `docs/design-preview/*.png` | Acuan visual per layar (ekspor `sop.fig`) |
| 5 | `docs/AI-HANDOFF.md` | Dokumen ini: alur kerja, konvensi, jebakan |

**Kalau dokumen dan kode berbeda, kode menang.** Matriks izin yang berlaku ada di
`server/src/policy.ts` (14 permission × 6 peran), dan cerminnya untuk menu ada di
`client/src/lib/nav.ts`. Membaca dua file itu lebih cepat daripada menebak dari
PRD.

**Dokumen yang jangan dijadikan acuan teknis:**

- `docs/PROMPT-FRONTEND.md` — kontrak 23 endpoint-nya masih akurat dan berguna,
  tetapi bagian "keadaan repo" **usang**: menyebut Vite 6, `components/ui.tsx`
  monolitik, `credentials: 'same-origin'`, dan path `c:/Users/pgfe/...`. Kondisi
  nyata: Vite 8, komponen shadcn per file di `client/src/components/ui/`,
  `credentials: 'include'`.
- `docs/PROGRESS.md` dan `docs/AI_USAGE.md` — **deliverable penilaian**, ditulis
  dari sudut pandang manusia pemilik tugas. Jangan menulis ulang isinya tanpa
  diminta; kalau ada yang berubah, laporkan ke manusia, jangan sunting sendiri.

---

## 2. Alur kerja satu fase (loop 7 langkah)

Ini urutan yang terbukti; mengubah urutannya biasanya berakhir dengan pekerjaan
ulang.

### Langkah 1 — Baca spesifikasi fase

Buka bagian fase terkait di `docs/PLAN-FRONTEND.md`. Catat tiga hal: **file yang
harus dibuat**, **perilaku yang diminta**, **gerbang** (kriteria lulus). Jangan
menambah di luar itu; kalau ada yang kurang, laporkan, jangan diam-diam
dikerjakan.

### Langkah 2 — Recon, jangan menebak

Sebelum menulis satu baris, baca file nyata yang akan disentuh **dan**
tetangganya:

- Layar serupa yang sudah jadi → tiru polanya (daftar di §3.1).
- Route server untuk endpoint yang dipakai → pastikan nama query param, bentuk
  respons, dan peran yang diizinkan.
- `client/src/lib/api.ts` → pastikan tipe responsnya sudah ada; kalau belum,
  tambahkan di sana, jangan mendefinisikan tipe lokal di komponen.

Recon yang salah adalah penyebab paling umum pekerjaan ulang di repo ini
(mis. filter departemen diambil dari `/users` yang ternyata hanya terbuka untuk
HRD/AUDITOR).

### Langkah 3 — Implementasi mengikuti pola yang ada

Kalau ragu antara "cara baru" dan "cara yang sudah dipakai di layar lain",
pilih yang sudah dipakai. Lihat §3.

### Langkah 4 — Build

```bash
npm run build -w client
```

Wajib hijau sebelum lanjut. TypeScript di repo ini **strict** dan tiga opsi
berikut paling sering menggagalkan build: `verbatimModuleSyntax` (butuh
`import type`), `noUnusedLocals` (impor sisa), `erasableSyntaxOnly` (parameter
properties di constructor dilarang).

### Langkah 5 — Verifikasi API dengan curl

Jangan percaya UI saja. Buktikan endpoint-nya lebih dulu (resep di §5.2), lalu
pastikan UI memakai bentuk data yang sama.

### Langkah 6 — Verifikasi visual dengan screenshot

Jalankan dev server, ambil screenshot dengan Chrome headless (resep di §5.3),
lalu **baca gambarnya**. Yang dicari: kolom kosong, teks terpotong, dua tombol
hijau, tinggi baris tidak seragam, angka `NaN`/`Invalid Date`.

### Langkah 7 — Bersihkan artefak, lalu commit

- Hapus `client/public/__shot.html` bila kamu memakainya (§5.3).
- `git status --short` harus hanya berisi file yang memang bagian fase ini.
- Satu commit per fase, pesan bahasa Indonesia:

```
feat(client): audit log dengan filter aktor, entitas, dan aksi
```

Pola yang sudah dipakai: `feat(client): …`, `fix(client): …`, `feat(server): …`,
`docs: …`, `chore: …`. Badan commit hanya dipakai kalau ada keputusan yang tidak
terlihat dari diff.

---

## 3. Konvensi kode yang sudah mapan

### 3.1 Peta file — cari contoh terdekat, jangan bikin pola baru

| Kebutuhan | Contoh yang sudah ada |
|---|---|
| Daftar + filter + paginasi | `pages/sop/SopListPage.tsx` + `components/sop/SopFilters.tsx` + `components/sop/SopTable.tsx` |
| Daftar + panel detail dua kolom | `pages/ReportsPage.tsx` + `components/reports/ReportList.tsx` + `ReportDetail.tsx` |
| Daftar + form (peran terbatas) | `pages/AnnouncementsPage.tsx` + `components/announcements/*` |
| Tabel audit (read-only, filter, `<details>`) | `pages/AuditPage.tsx` + `components/audit/AuditFilters.tsx` |
| Detail multi-tab | `pages/sop/SopDetailPage.tsx` + `components/sop/DetailTabs.tsx` |
| Form validasi | `pages/sop/SopEditorPage.tsx` (react-hook-form + skema `@sop/shared`) |
| Mutasi + invalidasi cache | `lib/sopMutations.ts` (`useSopRefresh`) |

Struktur: `pages/<Nama>Page.tsx` untuk layar datar, `pages/sop/*` untuk sub-rute
SOP, komponen per domain di `components/<domain>/`, komponen lintas layar di
`components/common/`, primitif shadcn di `components/ui/` (**jangan disunting**).

### 3.2 Query key satu pintu

Semua key ada di `lib/queryKeys.ts`. Jangan menulis array literal di komponen.
Filter yang memengaruhi hasil harus ikut jadi bagian key, misalnya
`queryKeys.audit(filters)`.

### 3.3 URL adalah sumber kebenaran filter

Filter, pencarian, dan nomor halaman hidup di `useSearchParams`, bukan
`useState`. Pola: `readFilters(params)` → objek filter → `toQueryString(filters)`
→ `useQuery`. Input teks tetap `useState` dengan debounce 300 ms, lalu ditulis ke
URL (`{ replace: true }`) dan `page` dihapus saat filter berubah. Ini yang membuat
tombol back, refresh, dan tautan yang dibagikan tetap benar.

### 3.4 Setiap layar punya empat state

`isPending` → skeleton, `isError` → `<ErrorState onRetry>`, data kosong →
`<EmptyState>` (dengan tombol "Hapus filter" bila ada filter aktif), data ada →
isi. Tidak boleh ada layar putih. `placeholderData: keepPreviousData` dipakai
saat berpindah halaman supaya tabel tidak berkedip kosong.

### 3.5 Bahasa dan format

- Seluruh teks UI **bahasa Indonesia**; kode, nama field, dan komentar teknis
  tetap Inggris/Indonesia campuran seperti file sekitarnya.
- Tanggal lewat `formatDate` / `formatDateTime` di `lib/format.ts` — jangan
  memanggil `toLocaleString` langsung (pernah menghasilkan `13,18` alih-alih
  `13.18`).
- Label status dan aksi lewat `STATUS_LABEL` / `ACTION_LABEL` / `ROLE_LABEL`
  (`@sop/shared`), bukan string literal di JSX.

### 3.6 Aturan visual yang tidak boleh dilanggar

- Hijau `#3ECF8E` hanya untuk **satu** aksi utama per layar. Kalau muncul dua
  kandidat, turunkan salah satunya jadi `variant="outline"`.
- Teks di atas hijau selalu `#171717`, tidak pernah putih.
- Kartu: putih, border 1px `#ededed`, radius 12px, tanpa shadow.
- Label tabel 12px uppercase `text-muted-foreground`; baris tabel `h-14`.
- Warna di luar palet: hanya `--destructive #B42318`.

### 3.7 Primitif UI: install, jangan tulis tangan

Komponen `components/ui/*` berasal dari shadcn CLI. Kalau butuh primitif baru,
pasang lewat CLI lalu sesuaikan token; jangan menyalin kode komponen dari
internet.

---

## 4. Perintah yang sering dipakai

| Perintah | Arti |
|---|---|
| `npm run dev` | API `:4000` + Vite `:5173` sekaligus (concurrently) |
| `npm run dev -w server` / `-w client` | satu sisi saja |
| `npm run build` | `tsc --noEmit` server + `tsc -b && vite build` client |
| `npm run build -w client` | cepat, untuk gerbang per fase |
| `npm test` | 23 tes integrasi + state machine (DB `sop_center_test`) |
| `npm run db:seed` | isi ulang data demo (idempoten, menghapus data lama) |
| `npm run db:reset` | drop + migrate + seed |

Butuh `server/.env`:

```bash
cp .env.example server/.env
```

Tanpa itu Prisma gagal dengan `P1012: Environment variable not found:
DATABASE_URL`.

---

## 5. Verifikasi

### 5.1 Akun seed (password semua: `password123`)

| Email | Peran | Departemen |
|---|---|---|
| `hrd@ming.test` | HRD | Human Resources |
| `pic.hrd@ming.test` | PIC_SOP | Human Resources |
| `pic.opr@ming.test` | PIC_SOP | Operasional |
| `pic.fin@ming.test` | PIC_SOP | Finance |
| `pic.it@ming.test` | PIC_SOP | Teknologi Informasi |
| `manager.opr@ming.test` | MANAGER | Operasional |
| `manager.hrd@ming.test` | MANAGER | Human Resources |
| `auditor@ming.test` | AUDITOR | Teknologi Informasi |
| `manajemen@ming.test` | MANAJEMEN | Teknologi Informasi |
| `karyawan1.opr@ming.test` … `karyawan3.*` | KARYAWAN | sesuai akhiran |

Isi seed: 4 departemen, 25 pengguna, 12 SOP lintas status, 12 versi, 11
konfirmasi, 48 baris audit, 3 pengumuman, 3 laporan.

### 5.2 Resep curl

Server menolak request non-GET bila `Origin ≠ http://localhost:5173`, jadi header
Origin wajib ada saat login:

```bash
curl -s -c /tmp/a.txt -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:5173' \
  -d '{"email":"auditor@ming.test","password":"password123"}'

curl -s -b /tmp/a.txt "http://localhost:4000/api/audit-logs?entityType=Sop&page=2"
```

Uji negatif yang wajib dicoba setiap kali menyentuh layar berperan:
login sebagai peran yang **tidak** berhak → endpoint harus `403`, dan rutenya
harus menampilkan halaman 403 (bukan layar kosong).

### 5.3 Screenshot (Chrome headless)

Rute butuh sesi, jadi pakai harness sementara di `client/public/__shot.html`
yang login lalu redirect. Buat file itu, ambil gambar, lalu **hapus sebelum
commit**:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --disable-gpu --hide-scrollbars \
  --user-data-dir=C:/Users/<user>/AppData/Local/Temp/chrome-sop \
  --window-size=1440,1000 --virtual-time-budget=12000 \
  --screenshot=C:/Users/<user>/AppData/Local/Temp/shot.png \
  "http://localhost:5173/__shot.html?e=auditor@ming.test&to=/audit"
```

Isi harness: `fetch('/api/auth/login', {method:'POST', credentials:'include',
headers:{'Content-Type':'application/json'}, body: JSON.stringify({email, password:'password123'})})`
lalu `location.replace(params.get('to'))`. `--virtual-time-budget` harus cukup
besar (≥ 8000) supaya redirect + query selesai sebelum gambar diambil.

Selalu **baca** gambar hasilnya dengan tool pembaca gambar, jangan hanya
memastikan file-nya ada.

---

## 6. Jebakan yang sudah pernah menggigit

| Gejala | Sebab | Solusi |
|---|---|---|
| `TS5102: Option 'baseUrl' has been deprecated` | TS 7 menolak `baseUrl` | Hapus `baseUrl`, pakai `paths` relatif (`"@/*": ["./src/*"]`) |
| Build gagal di `ApiError` | `erasableSyntaxOnly` melarang parameter properties | Deklarasikan field secara eksplisit |
| Build gagal "declared but never read" | `noUnusedLocals` | Hapus impor sisa setiap kali refactor |
| Semua POST 403 | Vite pindah ke 5174 (port 5173 dipakai) | `strictPort: true` sudah diset; matikan proses lama: `taskkill //PID <pid> //F` |
| Jam tampil `13,18` | `toLocaleTimeString` bergantung locale mesin | Pakai `formatDateTime` di `lib/format.ts` |
| Dua tombol hijau di satu layar | Tiap komponen memutuskan sendiri jadi "utama" | Tentukan satu pemilik CTA di level halaman (lihat `ActionBar.tsx`) |
| Underline tab jadi kotak | `after:` pseudo-element pada label | Pakai `border-b-2 border-transparent` + `data-active:border-b-foreground` + `-mb-px` |
| Filter departemen kosong untuk KARYAWAN | `/users` hanya untuk HRD/AUDITOR | Turunkan opsi dari data yang memang terlihat (`/sops`), atau sembunyikan filter |
| SOP terbit tampak "Draft" setelah versi baru | `Sop.status` ≠ `currentVersion.status` | Kolom daftar pakai `isPublished`; banner draft hanya bila `draft.id !== published.id` |
| Detail SOP tak berizin balas 404 | Aturan privasi server | Tampilkan panel not-found, bukan halaman 403 |
| Kolom Perubahan/IP di audit kosong | Seed lama hanya menulis `{seeded:true}` tanpa `ip` | Seed diperbaiki agar menulis `before`/`after` sesuai bentuk service |
| Screenshot kosong / putih | Edge headless berhenti bekerja | Pakai Chrome headless seperti §5.3 |

**Preseden yang boleh diikuti:** bila data demo tidak mendukung sebuah layar
(kolom kosong, angka tidak masuk akal), perbaiki `server/prisma/seed.ts` lalu
`npm run db:seed`, dan sebutkan di laporan. Logika backend tetap tidak disentuh
tanpa alasan.

---

## 7. Sisa pekerjaan

### Fase 8 — Pengguna (`pages/UsersPage.tsx`)

Read-only: nama + email, peran (`ROLE_LABEL`), departemen, status aktif, tanggal
dibuat. Tanpa tombol tambah/ubah/hapus — backend memang tidak menyediakannya,
dan registrasi mandiri sudah diputuskan di luar cakupan (jangan menambahkannya).

Gerbang: tabel memuat 25 pengguna seed; tidak ada kontrol mutasi; KARYAWAN tidak
bisa membuka rute.

### Fase 9 — Pemantapan

- Audit semua layar: loading / empty / error terlihat, tidak ada layar putih.
- Kontras: teks sekunder `#707070`; hijau hanya satu per layar.
- Responsif: sidebar sudah jadi `Sheet` di bawah `lg`; pastikan tabel bisa
  scroll horizontal dan filter membungkus rapi di 390px.
- `npm run build` di root hijau, `npm test` tetap 23/23.

### Serah terima (belum dikerjakan, jangan diklaim selesai)

- `README.md`: prasyarat, setup, akun seed, perintah uji.
- Screenshot aplikasi asli di `docs/screenshots/` (6 layar inti).
- Video demo 3–5 menit.
- `docs/PROGRESS.md` diperbarui — **hanya** setelah manusia mengonfirmasi.

---

## 8. Aturan keras

1. **Jangan mengubah `server/` atau `shared/`** kecuali tidak ada jalan lain;
   kalau terpaksa, jelaskan alasannya di laporan. Tes 23/23 tidak boleh merah.
2. **Jangan menambah dependency** tanpa diminta. Yang ada sudah cukup.
3. **Jangan mengarang data.** Semua angka dari API. Kalau endpoint tidak ada,
   laporkan — jangan bikin mock diam-diam.
4. **Jangan menyunting `client/src/index.css`** (token) atau
   `client/src/components/ui/*` (primitif shadcn).
5. **Jangan menambah fitur di luar fase**: tidak ada dark mode, ekspor, diff
   viewer, notifikasi, atau pencarian global baru.
6. **Jangan commit artefak verifikasi**: `__shot.html`, screenshot, atau file
   sementara.
7. **Jangan menyatakan selesai tanpa bukti.** Setiap klaim "sudah jalan" harus
   punya keluaran perintah atau gambar yang bisa ditunjukkan.
8. **Balas dalam bahasa Indonesia** kepada pemilik repo.

---

## 9. Checklist akhir setiap fase

- [ ] `npm run build -w client` hijau
- [ ] `npm test` 23/23 (bila menyentuh apa pun di `server/` atau `shared/`)
- [ ] Endpoint diuji dengan curl, termasuk satu kasus 403
- [ ] Screenshot dibaca, bukan hanya dibuat
- [ ] State loading / empty / error ada dan terlihat
- [ ] Tidak ada `any` yang tidak perlu, tidak ada `console.log` tertinggal
- [ ] `git status --short` bersih dari artefak
- [ ] Satu commit dengan pesan `feat(client): …`
