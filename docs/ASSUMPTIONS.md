# ASSUMPTIONS — MING SOP Center

> Dokumen ini adalah ringkasan asumsi dan keputusan teknis. Rujukan utama tetap
> `docs/PRD.md`; di sini saya menuliskan **apa yang saya anggap benar tanpa
> bertanya**, **apa yang saya pilih di antara opsi**, dan **apa yang saya terima
> sebagai batasan**.

Terakhir diperbarui: 2026-11-20

---

## 1. Cara membaca dokumen ini

Setiap baris punya tiga bagian: **keputusan**, **alasan**, dan **dampak bila
asumsinya salah**. Bagian terakhir itu yang penting bagi penilai — kalau asumsi
saya keliru, bagian itu menunjukkan seberapa jauh akibatnya dan seberapa mudah
diperbaiki.

Skala dampak yang saya pakai:

| Label | Arti |
|---|---|
| **Kecil** | Perubahan terlokalisasi, < 1 jam, tidak mengubah skema |
| **Sedang** | Menyentuh beberapa file atau satu endpoint, perlu migrasi data |
| **Besar** | Mengubah skema inti atau alur persetujuan, perlu rework |

---

## 2. Asumsi produk

Asumsi ini diambil dari PRD §5.3 dan diperluas dengan alasannya.

| # | Asumsi | Alasan | Dampak bila salah |
|---|---|---|---|
| A1 | Satu pengguna = satu peran | Menyederhanakan RBAC menjadi satu kolom `role`; matriks izin jadi tabel dua dimensi yang bisa dibaca sekali lihat | **Besar** — perlu tabel `UserRole` many-to-many dan `policy.ts` harus mengubah `role` menjadi `roles[]` di seluruh pemeriksaan |
| A2 | Satu SOP milik tepat satu departemen | Kepemilikan departemen dipakai untuk visibilitas dan untuk menentukan approver yang sah | **Sedang** — SOP lintas departemen butuh tabel pivot dan aturan approval baru |
| A3 | Isi SOP berupa markdown, bukan lampiran PDF/DOCX | Tidak perlu object storage, virus scanning, atau preview dokumen; cukup renderer markdown | **Besar** — lampiran berarti storage, tipe file, ukuran maksimum, dan endpoint upload terpisah |
| A4 | Konfirmasi baca hanya berlaku untuk versi terbit terbaru | Angka kepatuhan harus bermakna tunggal. Kalau konfirmasi versi lama ikut dihitung, "90% sudah membaca" tidak menjawab "sudah baca yang berlaku atau bukan?" | **Sedang** — perlu kolom `sopVersionId` pada rekap dan aturan reset yang berbeda |
| A5 | Approval berurutan, satu approver per tahap | Cukup satu baris `SopApproval` per tahap; tidak perlu model kuorum | **Besar** — approval paralel butuh tabel suara dan aturan mayoritas |
| A6 | Tidak ada delegasi saat approver cuti, tidak ada eskalasi otomatis | Di luar cakupan tes; menambah state dan timer yang tidak bisa didemokan | **Kecil** — SOP akan menggantung di `IN_REVIEW` sampai approver kembali; ini perilaku yang benar untuk demo |
| A7 | Pengumuman tidak butuh approval | HRD adalah pemilik kebijakan; menambah approval membuat pengumuman tidak bisa dipakai mendesak | **Kecil** — tambah satu status dan satu transisi |
| A8 | Laporan pelanggaran boleh anonim, tanpa verifikasi identitas | Justru itu inti fitur pelaporan; verifikasi identitas menutup kasus yang paling ingin dilaporkan | **Sedang** — perlu kolom pelapor wajib dan aturan visibilitas baru |
| A9 | Audit log disimpan selamanya, tanpa retensi | Lingkup demo; retensi menambah job terjadwal yang tidak bisa dibuktikan | **Kecil** — tambah kolom `archivedAt` dan kebijakan purge |
| A10 | Satu zona waktu (Asia/Jakarta), simpan UTC, tampil lokal | Menghindari kebingungan "8 Nov" versus "7 Nov 17:00" saat direview dari zona lain | **Kecil** — format tanggal terpusat di `client/src/lib/format.ts` |

### Asumsi yang saya tambahkan sendiri (tidak ada di PRD)

| # | Asumsi | Alasan | Dampak bila salah |
|---|---|---|---|
| A11 | Approver sah = siapa pun berperan `MANAGER` **di departemen SOP tersebut** | Tanpa syarat departemen, manager Finance bisa menyetujui SOP Operasional. Itu bukan bug yang ingin saya tinggalkan | **Kecil** — satu klausa di `transition()` |
| A12 | PIC hanya boleh menyunting SOP milik departemennya sendiri | Sama alasannya dengan A11; dicek di service, bukan di route, supaya tidak bisa dilewati lewat endpoint lain | **Kecil** — satu pemeriksaan kepemilikan |
| A13 | Karyawan hanya melihat SOP berstatus `PUBLISHED`; peran lain melihat semua | Draft yang belum disetujui bukan informasi untuk seluruh perusahaan | **Kecil** — satu predikat di `listSops` |
| A14 | Laporan anonim menyembunyikan pelapor di **semua** tampilan, termasuk audit log | Kalau identitas bocor di audit log, janji anonimnya palsu | **Sedang** — perlu redaksi pada `AuditLog.before/after` |
| A15 | Kode SOP unik global dengan pola `SOP-<DEPT>-<NNN>` | Kode dipakai manusia untuk merujuk dokumen; duplikat membuat rujukan ambigu | **Kecil** — unique constraint sudah ada, pesan 409 sudah ditangani |

---

## 3. Keputusan teknis

| Area | Keputusan | Alternatif yang ditolak | Alasan |
|---|---|---|---|
| Bahasa & runtime | TypeScript di ketiga workspace | JS polos | Tipe pada `TRANSITION_RULES` dan `policy.ts` membuat kesalahan izin/transisi tertangkap saat compile, bukan saat demo |
| Monorepo | npm workspaces: `shared/`, `server/`, `client/` | Satu folder, dua `package.json` terpisah | `shared/` harus dibaca **kedua** sisi; workspace membuat impor `@sop/shared` tanpa build step tambahan |
| Sumber kebenaran transisi | Satu array `TRANSITION_RULES` di `shared/` | `if/else` tersebar di route | Client memakai array yang sama untuk memutuskan tombol mana yang tampil; mustahil tombol dan aturan server berbeda |
| Otorisasi | Satu `MATRIX` di `server/src/policy.ts` + `requirePermission()` | Pemeriksaan `if (user.role === ...)` per route | Satu tempat untuk diaudit; menambah peran tidak perlu menyisir seluruh route |
| Sesi | JWT di cookie `httpOnly` + `SameSite=Lax` | JWT di `Authorization` header + localStorage | localStorage bisa dibaca XSS; cookie `httpOnly` tidak. `SameSite=Lax` + pemeriksaan origin menutup CSRF untuk demo |
| Hashing | bcrypt cost 12 | argon2 | bcrypt tersedia tanpa build native di Windows; cost 12 cukup untuk demo dan tidak memperlambat tes |
| Validasi | zod di client **dan** server, skema di `shared/` | Validasi hanya di server | Satu skema, dua pemakai; pesan error 422 per-field bisa langsung dipetakan ke input |
| Status SOP | Dua sumbu: `Sop.status` (alur kerja) dan `SopVersion.status` (publikasi) | Satu kolom status | Kalau digabung, "versi 1 masih terbit sementara versi 2 sedang direview" tidak bisa dinyatakan. Ini kasus normal, bukan tepi |
| Immutabilitas versi | Versi `PUBLISHED` tidak bisa disunting; perubahan = versi baru | Edit di tempat + simpan riwayat | Tanpa ini, "apa isi SOP saat saya tanda tangan bulan lalu?" tidak bisa dijawab, dan audit jadi tidak berarti |
| Audit | Tabel append-only, `before`/`after` JSON, **tanpa** foreign key ke entitas | Relasi FK ke setiap tabel | Audit harus tetap ada walau entitasnya dihapus. FK akan memaksa `ON DELETE SET NULL` dan menghapus jejak |
| Konfirmasi | `@@unique([sopVersionId, userId])` + upsert | Cek-lalu-insert di service | Constraint di database membuat operasi idempoten walau dua request datang bersamaan |
| Pencarian | `ILIKE` pada kode/judul/isi | Postgres `tsvector` | `tsvector` butuh konfigurasi bahasa; untuk bahasa Indonesia hasilnya justru lebih buruk daripada `ILIKE`. Dicatat sebagai penurunan kedalaman, bukan penghapusan fitur (PRD §5.1.1) |
| Rate limit login | In-memory, 5 percobaan/menit per email+IP | Redis | Satu instance untuk demo; Redis menambah dependensi yang tidak bisa ditunjukkan nilainya di sini. Dinonaktifkan saat `NODE_ENV=test` agar suite tidak saling mengunci |
| Database | Postgres 17 lokal (port 5432) sebagai jalur utama; docker-compose disediakan di port **5433** | Docker sebagai jalur utama | Mesin penguji sudah punya Postgres lokal; compose yang menabrak port 5432 akan gagal start. Pemetaan ke 5433 membuat keduanya bisa hidup berdampingan |
| Tes | Vitest + Supertest, DB terpisah `sop_center_test` | Mock Prisma | Tes integrasi yang memakai DB nyata menangkap bug yang tidak terlihat pada mock — dan memang menangkap dua bug saat pengerjaan (lihat `AI_USAGE.md`) |
| Tanpa AI di produk | Tidak ada fitur AI di aplikasi | Menambahkan "ringkas SOP dengan AI" | Brief memperbolehkan AI untuk **proses** pengerjaan, bukan sebagai fitur. Menambahkannya berarti menambah permukaan yang tidak diminta dan tidak bisa diuji |

---

## 4. Keputusan desain

| Keputusan | Alternatif | Alasan |
|---|---|---|
| Bahasa visual Supabase dari `docs/DESIGN.md` | Dashboard admin generik | Brief menyediakan `DESIGN.md` sebagai acuan; mengabaikannya berarti tidak membaca bahan yang diberikan |
| Hijau emerald `#3ECF8E` hanya untuk satu aksi utama per layar | Hijau untuk semua tombol | Kalau semua tombol hijau, tidak ada lagi yang menonjol. Satu warna aksen hanya berguna bila langka |
| Teks di atas hijau berwarna `#171717`, bukan putih | Putih | Kontras putih di atas `#3ECF8E` hanya ~1.9:1 — gagal WCAG. `#171717` memberi ~9:1 |
| Radius 6px untuk tombol, 12px untuk kartu, 999px untuk pil | Satu radius untuk semua | Skala radius adalah bagian dari bahasa visual; tombol bersudut tegas membaca "alat", kartu lembut membaca "wadah" |
| 9 layar @1440×900 di `sop.fig` | Wireframe low-fidelity | Penilai perlu melihat keputusan visual, bukan kotak abu-abu |
| Tata letak absolut di file desain | Auto-layout | Tool `render` yang tersedia tidak mendukung auto-layout; absolut memberi hasil deterministik dan bisa direproduksi |

### Deviasi kecil dari `DESIGN.md`

| Hal | `DESIGN.md` | Yang dipakai | Alasan |
|---|---|---|---|
| Label tersier 11–12px | `ink-mute-2` `#9A9A9A` | `#A3A3A3` | Pada 11px di layar non-retina, `#9A9A9A` terbaca sebagai noise; `#A3A3A3` tetap lolos kontras untuk teks non-esensial. Implementasi cukup memakai satu token `text-faint` |
| Font display | Circular | Inter 500 | Circular berlisensi; `DESIGN.md` sendiri menetapkan Inter sebagai padanan open-source terdekat |

---

## 5. Batasan yang saya terima sadar

Ini bukan hal yang terlupa — ini hal yang **diputuskan untuk tidak dikerjakan**
dalam timebox, dan disebutkan supaya tidak terbaca sebagai kelalaian.

| Batasan | Konsekuensi | Kapan harus diperbaiki |
|---|---|---|
| Rate limit in-memory | Hilang saat restart, tidak berlaku lintas instance | Sebelum deploy lebih dari satu instance — ganti ke Redis |
| Audit log menampilkan JSON mentah | Kurang nyaman dibaca, tapi jujur dan tidak menyembunyikan apa pun | Bila ada waktu untuk diff viewer per field |
| Tanpa diff antar versi | Pengguna harus membaca dua versi berdampingan secara manual | v1.1 |
| Tanpa ekspor rekap kepatuhan | Rekap hanya bisa dilihat di layar | Bila HRD butuh lampiran rapat |
| Tanpa Playwright/E2E | Regresi UI tidak tertangkap otomatis | Setelah UI stabil |
| Loading skeleton hanya di 2 layar teratas | Layar lain memakai teks "Memuat…" | Setelah semua layar ada |
| Pengumuman: tanpa edit, hanya buat/hapus | Salah tulis berarti hapus lalu buat ulang | Bila ada waktu; sengaja tidak ditambah agar tidak menambah endpoint yang tidak diuji |

---

## 6. Yang sengaja tidak dikerjakan

Di luar cakupan, sesuai PRD §2.5 — dan **tidak** akan saya kerjakan meski waktu
tersisa, karena menambahkannya berarti menguji lebih sedikit hal dengan waktu
yang sama.

- Modul pembelajaran/kuis dan penilaian pemahaman
- Notifikasi email / WhatsApp
- Lampiran file pada SOP
- Penjadwalan review otomatis dan pengingat kedaluwarsa
- SSO / LDAP
- Multi-tenant (satu instalasi = satu perusahaan)
- Aplikasi mobile

---

## 7. Pertanyaan yang saya jawab sendiri

Tiga pertanyaan terbuka di PRD §5.4 saya putuskan tanpa menunggu jawaban, karena
timebox tidak mengizinkan:

| Pertanyaan | Jawaban yang saya ambil | Alasan |
|---|---|---|
| Konfirmasi baca perlu kedaluwarsa (mis. ulang tiap 12 bulan)? | **Tidak** | Menambah kolom `expiresAt` dan job; tidak bisa didemokan dalam 2 hari |
| Manager boleh menerbitkan bila HRD tidak tersedia? | **Tidak** | Kalau boleh, pemisahan tugas antara penyetuju dan penerbit hilang — justru inti RBAC yang diminta |
| Laporan pelanggaran perlu SLA/reminder? | **Tidak** | Butuh scheduler dan state waktu; di luar cakupan |

Kalau jawaban sebenarnya berbeda, ketiganya adalah perubahan terisolasi
(**Kecil**), bukan perombakan.
