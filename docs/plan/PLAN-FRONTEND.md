# PLAN — Implementasi Frontend MING SOP Center

**Tanggal:** 21 November 2026 · **Status:** rencana, belum dikerjakan
**Rujukan:** `docs/PRD.md` §4.4 · `docs/DESIGN.md` · `docs/PROMPT-FRONTEND.md` · `docs/design-preview/*.png` (ekspor `sop.fig`)

---

## 1. Konteks

Backend sudah selesai dan teruji (23 tes hijau, 23 endpoint, database sudah dimigrasi dan di-seed). Frontend baru berupa scaffold: Vite 8 + React 19 + Tailwind v4 + shadcn/ui, tetapi `client/src/App.tsx` dan `main.tsx` masih template Vite — belum ada router, QueryClient, maupun auth. Aplikasi belum bisa dipakai meski API sudah berjalan.

Tujuan: membangun 11 layar sesuai desain di `sop.fig` dan menyambungkannya ke API nyata, tanpa melanggar bahasa visual `DESIGN.md` (emerald `#3ECF8E` hanya untuk satu aksi utama per layar, teks di atas hijau `#171717`, kartu radius 12px, tombol 6px, Inter 500).

### Keputusan yang sudah disepakati

- **Testing:** `tsc -b` + `vite build` setiap fase, ditambah checklist manual 6 peran. Tanpa dependency test baru.
- **Kode lama dipakai ulang** dari commit `30c6b3f`: `lib/api.ts`, `lib/auth.tsx`, `lib/format.ts`, `components/Markdown.tsx`.
- **`client/src/index.css` tidak diubah** — token sudah final dan diturunkan dari `DESIGN.md`.
- **Rute memakai nama Indonesia** sesuai `PROMPT-FRONTEND.md`.

### Batasan nyata yang harus dipatuhi

| Batasan | Konsekuensi |
|---|---|
| Sesi = cookie `httpOnly` | Semua request wajib `credentials: 'include'` |
| Server menolak mutasi non-GET bila `Origin ≠ http://localhost:5173` | Vite wajib `strictPort: true` di 5173; kalau pindah ke 5174, semua POST 403 |
| `/auth/me` hanya mengembalikan `role` | Peta akses harus dicerminkan dari `server/src/policy.ts` |
| Detail SOP tak berizin → **404**, bukan 403 | Perlu panel not-found khusus, bukan halaman 403 |
| `Sop.status` ≠ `currentVersion.status` | Setelah "buat versi baru", `Sop.status = DRAFT` sementara versi terbit masih `PUBLISHED` |

---

## 2. Fase pengerjaan

Setiap fase punya gerbang sendiri: build harus hijau dan perilaku bisa diperiksa sebelum lanjut. Satu commit per fase.

### Fase 0 — Fondasi

**File**

| Path | Isi |
|---|---|
| `client/src/lib/api.ts` | Pulihkan dari `30c6b3f`; `credentials: 'include'`; tambah `fieldErrors(err)` → `Record<string,string>` |
| `client/src/lib/auth.tsx` | Pulihkan; tambah `queryClient.clear()` saat login/logout |
| `client/src/lib/format.ts` | Pulihkan apa adanya |
| `client/src/lib/queryClient.ts` | Baru: `staleTime 15s`, `refetchOnWindowFocus: false`, retry hanya 5xx/network |
| `client/src/lib/queryKeys.ts` | Baru: `me, dashboard, sops(filters), sop(id), announcements, reports, audit(filters), auditEntities, users` |
| `client/src/lib/nav.ts` | Baru: menu + peran yang boleh, diturunkan dari `policy.ts` |
| `client/src/components/common/*` | `PageHeader`, `StatusPill`, `EmptyState`, `ErrorState`, `Spinner`, `Pagination`, `ConfirmDialog` |
| `client/src/components/layout/AppShell.tsx` | Sidebar 248px + topbar (search global, bell, avatar), `<Outlet/>`, drawer mobile via `Sheet` |
| `client/src/components/layout/RequireAuth.tsx` | `loading` → Spinner; tanpa user → `/login?next=…` |
| `client/src/components/layout/RequireRole.tsx` | Peran salah → render 403 di tempat (URL tetap) |
| `client/src/pages/Forbidden.tsx` | Frame 10: kartu 480px, badge 403, dua tombol |
| `client/src/pages/NotFound.tsx` | Fallback rute |
| `client/src/App.tsx` | Pohon rute saja |
| `client/src/main.tsx` | `QueryClientProvider → BrowserRouter → AuthProvider → App` |
| `client/vite.config.ts` | `server.port: 5173`, `strictPort: true` |

**Pohon rute**

```
/login                          publik
RequireAuth → AppShell
  index                         Dashboard
  sop                           Daftar SOP
  sop/new                       RequireRole PIC_SOP
  sop/:id                       Detail SOP
  sop/:id/edit                  RequireRole PIC_SOP
  pengumuman                    semua
  laporan                       semua
  audit                         RequireRole AUDITOR, HRD
  pengguna                      RequireRole AUDITOR, HRD
  403                           Forbidden
  *                             NotFound
```

**Catatan**

- `Toaster` diimpor langsung dari `sonner` dengan `theme="light"`; `ui/sonner.tsx` memanggil `useTheme()` yang butuh provider `next-themes` yang tidak dipasang.
- Ikon memakai `lucide-react`; `Icons.tsx` lama tidak dipulihkan.
- `Markdown.tsx` dipulihkan lalu kelas lamanya (`prose-sop`, `text-ink`, `bg-canvas-soft`) diganti utilitas Tailwind.

**Gerbang:** `npm run build -w client` = 0; 6 akun seed login; sidebar berbeda per peran; `/audit` sebagai KARYAWAN menampilkan 403.

---

### Fase 1 — Login & Dashboard

**File:** `pages/Login.tsx`, `pages/Dashboard.tsx`, `components/dashboard/StatCard.tsx`

- Login: kartu tengah, `loginSchema` dari `@sop/shared`, pesan generik untuk 401, chip akun demo, `Navigate` bila sudah login, parameter `next` dihormati setelah sukses.
- Dashboard: 4 kartu (`published`, `pendingForMe`, `awaitingMyAcknowledgement`, `compliancePercent`) + tabel "Menunggu tindakan saya", "Kepatuhan terendah" (`Progress`), daftar konfirmasi tertunda, pengumuman terbaru.
- `GET /dashboard/summary`; semua angka dari API.

**Gerbang:** angka cocok dengan seed; isi tabel berbeda untuk Manager, HRD, dan PIC.

---

### Fase 2 — Daftar SOP

**File:** `pages/sop/SopListPage.tsx`, `components/sop/{SopTable,SopFilters}.tsx`

- `useSearchParams` sebagai satu-satunya sumber state filter (`q, department, status, requiresAck, page`); debounce 300 ms; ganti filter → `page=1`; `placeholderData: keepPreviousData`.
- Kolom: kode, judul, departemen, status (`StatusPill`), versi, penanda "belum dikonfirmasi".
- Status terbit dibaca dari `isPublished`, bukan `status === 'PUBLISHED'`.
- Paginasi dari `total/page/limit`; empty state menyarankan menghapus filter; error state punya tombol coba lagi.

**Gerbang:** pencarian mengembalikan hasil relevan; kombinasi filter benar; halaman 2 memuat data berbeda; pencarian ngawur menampilkan empty state.

---

### Fase 3 — Detail SOP (4 tab)

**File:** `pages/sop/SopDetailPage.tsx`, `components/sop/{DetailHeader,DetailTabs,VersionHistory,ApprovalTimeline,CompliancePanel}.tsx`

- Tab aktif disimpan di URL (`?tab=isi|riwayat|approval|konfirmasi`).
- Isi: `draftVersion?.content ?? currentVersion?.content` lewat `Markdown`; bila draft ada dan versi terbit masih hidup, tampilkan banner "Draf vN — versi terbit masih vX".
- Riwayat: `versions[]` (nomor, status, `changeSummary`, tanggal efektif, penulis).
- Approval: timeline vertikal `approvals[]` (aksi, aktor, peran, catatan, waktu).
- Konfirmasi: `compliance` (`total/acknowledged/pending[]`) + `Progress`; bila `null`, tampilkan penjelasan bahwa rekap hanya untuk PIC/Manager/HRD — tab tetap terlihat.
- 404 → panel "SOP tidak ditemukan atau tidak dapat Anda akses", bukan halaman 403.

**Gerbang:** keempat tab terisi dari API; SOP draft menampilkan isi draft; SOP terbit menampilkan isi versi terbit; URL tab tahan refresh.

---

### Fase 4 — Aksi SOP & Editor

**File:** `components/sop/{ActionBar,RejectDialog,PublishDialog,NewVersionDialog,AcknowledgeButton,MarkdownEditor}.tsx`, `pages/sop/SopEditorPage.tsx`

- Tombol aksi hanya dari `detail.allowedActions` (`SUBMIT|APPROVE|REJECT|PUBLISH`).
- `REJECT` → `Dialog` + `rejectSchema`; error 422 dipetakan ke `setError('note')`.
- `PUBLISH` → input tanggal, default hari ini; selalu kirim `effectiveDate` (server menolak bila kosong).
- `ACKNOWLEDGE` tidak ada di `allowedActions`: tampilkan bila `requiresAcknowledgement && currentVersion.status === 'PUBLISHED'` dan pengguna satu departemen serta perannya berhak. Idempoten — `alreadyAcknowledged: true` dianggap sukses; setelah sukses invalidate `['sop', id]`, `['sops']`, `['dashboard']`.
- Editor: `react-hook-form` + `zodResolver(createSopSchema)`; tipe form `z.input<…>` karena ada `.default()`; `reviewPeriodMonths` pakai `valueAsNumber`.
- Mode sunting memuat `draftVersion.content`; `PATCH` memakai `updateSopSchema` tanpa `code`; 409 kode duplikat → error di field `code`.
- `status !== 'DRAFT'` → form read-only + `NewVersionDialog` (`newVersionSchema`, hanya untuk pemilik SOP terbit).
- Pratinjau markdown dua kolom (`grid lg:grid-cols-2`).

**Gerbang:** PIC buat SOP → submit; Manager approve; HRD publish dengan tanggal; versi 2 menandai versi 1 `SUPERSEDED`; Karyawan konfirmasi dua kali tetap sukses.

---

### Fase 5 — Pengumuman

**File:** `pages/AnnouncementsPage.tsx`, `components/announcements/{AnnouncementList,AnnouncementForm}.tsx`

- Daftar terbaru di atas, isi `whitespace-pre-line`.
- Form tulis hanya untuk HRD (`announcementSchema`); `sopId`/`targetDepartmentId` kosong dikirim sebagai `null` (uuid menolak string kosong).
- Daftar departemen diambil dari `GET /users` (satu-satunya endpoint yang menyediakannya), `enabled: role === 'HRD'`.
- Hapus via `AlertDialog` + toast.

**Gerbang:** HRD membuat pengumuman bertarget departemen → hanya departemen itu melihat; KARYAWAN tidak melihat form; hapus menghilangkan baris.

---

### Fase 6 — Laporan Pelanggaran

**File:** `pages/ReportsPage.tsx`, `components/reports/{ReportList,ReportDetail,FollowUpForm,CreateReportDialog}.tsx`

- Dua kolom; panel kanan hanya bila `canTriage` (Manager/HRD).
- Buat laporan: `reportSchema`, `Switch` anonim dengan teks "identitas tidak disimpan", pilihan SOP dari daftar published.
- Tindak lanjut: `followUpSchema`, `Select` status dengan status sekarang dinonaktifkan; tetap tangani 403 "Status tujuan sama…" dengan toast.
- Riwayat tindak lanjut sebagai timeline, bukan menimpa.

**Gerbang:** laporan anonim tidak menampilkan identitas di mana pun; ubah status + catatan menambah entri riwayat; status sama → pesan error jelas.

---

### Fase 7 — Audit Log

**File:** `pages/AuditPage.tsx`, `components/audit/AuditFilters.tsx`

- Filter aksi + `entityType` (opsi dari `/audit-logs/entities`), paginasi dari `total`.
- Kolom: waktu, aktor, aksi, entitas, perubahan, IP. `before`/`after` JSON mentah di dalam `<details>`.
- Baris 56px, header 12px uppercase.

**Gerbang:** filter menyempitkan hasil; paginasi jalan; KARYAWAN tidak bisa membuka rute.

---

### Fase 8 — Pengguna

**File:** `pages/UsersPage.tsx`

- Read-only: nama + email, peran (`ROLE_LABEL`), departemen, status aktif, tanggal dibuat.
- Tanpa tombol tambah/ubah/hapus — backend tidak menyediakannya; registrasi mandiri sudah diputuskan di luar cakupan.

**Gerbang:** tabel memuat 25 pengguna seed; tidak ada kontrol mutasi.

---

### Fase 9 — Pemantapan & verifikasi

- Audit semua layar untuk state loading / empty / error (tidak ada layar putih).
- Cek kontras: teks sekunder `#707070`; hijau hanya satu per layar.
- Responsif: sidebar jadi `Sheet` < 1024px; tabel scroll horizontal.
- `npm run build` di root (server `tsc --noEmit` + client).
- `npm test -w server` tetap 23/23.

---

## 3. Konvensi data

- Query key: `['me']`, `['dashboard']`, `['sops', filters]`, `['sop', id]`, `['announcements']`, `['reports']`, `['audit', filters]`, `['audit-entities']`, `['users']`.
- Setiap mutasi meng-invalidate `['sop', id]` + prefix `['sops']` + `['dashboard']`; `['me']` tidak pernah di-invalidate.
- `queryClient.clear()` saat login/logout agar data peran sebelumnya tidak berkedip.

---

## 4. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| TS 7: `verbatimModuleSyntax` mewajibkan `import type`; `noUnusedLocals` menggagalkan build | Build tiap fase, bukan di akhir |
| Vite pindah ke 5174 → semua POST 403 karena Origin guard | `strictPort: true` |
| `Sop.status` vs `currentVersion.status` tertukar | `status` untuk alur kerja, `currentVersion.status` untuk kelayakan konfirmasi, `isPublished` untuk daftar |
| Detail tak berizin balas 404 | Panel not-found khusus, bukan halaman 403 |
| `publishSchema` mewajibkan `effectiveDate` | Selalu kirim tanggal dari dialog |
| Kelas CSS lama (`text-ink`, `.card`, `.pill`) sudah tidak ada | `grep` kelas lama sebelum gerbang fase |

---

## 5. Verifikasi akhir (definisi selesai)

1. `npm run build` di root keluar 0.
2. `npm run dev` menyajikan UI, console bersih.
3. 6 akun seed login; sidebar sesuai peran.
4. `/audit` sebagai KARYAWAN → 403, bukan layar kosong.
5. Siklus penuh lewat UI: PIC buat → submit → Manager approve → HRD publish → Karyawan konfirmasi; angka Dashboard berubah.
6. Setiap halaman punya state memuat / kosong / error.
7. `npm test -w server` tetap 23/23.
8. Tidak ada `any` yang tidak perlu, tidak ada `console.log` tertinggal.

---

## 6. Strategi commit

Satu commit per fase dengan pesan `feat(client): …`, sehingga setiap langkah bisa ditinjau dan di-revert sendiri. Fase 0 di-commit terpisah sebelum layar pertama.
