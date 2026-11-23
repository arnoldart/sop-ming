# Plan — Desain layar "Panduan Pengguna" di `sop.fig`

Status: **dikerjakan 2026-11-23**. Layar `11` dan `11b` sudah ada di `sop.fig` (node `1954111115:9` dan `1954111115:121`), item nav "Panduan" sudah ditambahkan ke 12 sidebar lain, export PNG ada di `docs/design-preview/panduan.png` dan `panduan-per-peran.png`.
Ruang lingkup: hanya `sop.fig` (+ export PNG ke `docs/design-preview/`). **Tidak menyentuh kode `client/` maupun `server/`.**

## Catatan penyimpangan dari rencana

- Kartu daftar isi jadi 264×360 (bukan 640) supaya tidak ada ruang kosong 200px di bawah item terakhir.
- Kartu artikel 840×640 tetap; blok "Panduan per peran" (grid 3×2) ditambahkan di bawah untuk mengisi kartu, jadi isinya bukan hanya 3 langkah.
- Warna teks sekunder memakai `#707070` di semua tempat (bukan `#9A9A9A`) — `#9A9A9A` gagal kontras WCAG (2.81:1) dan tidak dipakai layar lama mana pun.
- Border putus-putus pada blok placeholder screenshot di `11b` diimpor sebagai garis solid: tool import SVG di versi OpenPencil yang berjalan tidak meneruskan `stroke-dasharray`, dan tidak ada tool untuk set dash setelahnya.
- Frame uji coba `ZZ unused (hapus manual)` masih ada di kanvas (tersembunyi, di luar area) karena versi OpenPencil yang berjalan belum punya tool hapus node. Hapus manual dengan tombol Delete.

---

## 1. Tujuan

Menambah layar dokumentasi pemakaian (bukan dokumentasi setup) ke dalam file desain, sehingga:

- penilai bisa melihat alur "cara pakai" tanpa membaca markdown;
- desainnya siap dipakai sebagai acuan implementasi halaman `/panduan` nanti.

Bukan tujuan: membangun sistem dokumentasi (CMS, editor, pencarian penuh-teks).

---

## 2. Kondisi file saat ini (hasil pengukuran, bukan asumsi)

`tab-1` → `Page 1` berisi **13 frame** 1440×900, semua di `y = 0`, jarak antar frame **80px**:

| # | Frame | x | Node |
|---|---|---|---|
| 1 | 01 Login | 0 | `0:4` |
| 2 | 02 Dashboard | 1520 | `0:38` |
| 3 | 03 Daftar SOP | 3040 | `0:151` |
| 4 | 04 Detail SOP | 4560 | `0:285` |
| 5 | 05 Editor SOP | 6080 | `0:359` |
| 6 | 06 Audit Log | 7600 | `0:453` |
| 7 | 07 Pengumuman | 9120 | `0:593` |
| 8 | 08 Laporan | 10640 | `0:680` |
| 9 | 09 Pengguna | 12160 | `0:776` |
| 10 | 04b Riwayat Versi | 13680 | `0:925` |
| 11 | 04c Approval | 15200 | `0:997` |
| 12 | 04d Konfirmasi | 16720 | `0:1072` |
| 13 | 10 Akses ditolak | 18240 | `0:1137` |

**Layar baru masuk di `x = 19760`** (18240 + 1440 + 80), `y = 0`.

### Konvensi yang sudah terukur dan wajib dipakai

| Elemen | Nilai | Bukti node |
|---|---|---|
| Latar kanvas | `#FAFAFA` | `0:1137` fills |
| Sidebar | 248×900, putih `#FFFFFF` | `0:594` |
| Topbar | tinggi 56, divider `#EDEDED` | `0:625`, `0:626` |
| Area konten | mulai `x=280`, lebar 1128 | `0:635`, `0:648` |
| Judul halaman | Inter 500, 28px, tracking −0.72, `#171717`, `y=86` | `0:635` |
| Subjudul halaman | Inter 400, 14px, `#707070`, `y=126` | `0:636` |
| Kartu | putih, border 1px `#DFDFDF`, radius 12 | `0:648` |
| Nav item | tinggi 36, ikon 16×16 di `x=24`, label 14px di `x=48` | `0:473`, `0:616`, `0:617` |
| Nav item aktif | pill `#D8F8E9`, radius 6, 224×36 di `x=12` | `0:606` |
| Label grup nav | Inter 500, 11px, tracking +0.4, `#707070` | `0:613` |
| Ritme item nav | 36px tanpa gap (Audit `y=264` → Pengguna `y=300`) | `0:473` |
| Divider sidebar | `y=828`, `#DFDFDF` | `0:620` |
| Token/variabel | **tidak ada** — semua warna hardcoded | `list_variables` → 0 |

Ruang kosong sidebar dari `y=336` sampai `y=828` ≈ 490px, jadi **menambah satu item nav tidak menggeser apa pun**.

---

## 3. Keputusan desain

### 3.1 Bentuk halaman

| Opsi | Penilaian |
|---|---|
| A. Daftar isi kiri (sticky) + artikel kanan | **Dipilih.** Terasa seperti dokumentasi, muat 6 peran, tetap satu layar. |
| B. Accordion per peran | Semua peran tertutup kecuali satu; isi panjang sulit dipindai saat demo. |
| C. Grid kartu per peran | Bagus untuk landing, tapi tiap kartu jadi pintu ke halaman lain → butuh layar tambahan. |

### 3.2 Posisi menu

Masuk grup **LAINNYA**, item terakhir setelah **Pengguna**, label **Panduan**, ikon buku (lucide `BookOpen`). Alasan: semua peran boleh membuka, jadi tidak boleh di grup yang berisi menu khusus HRD/Auditor.

### 3.3 Jumlah layar

2 frame (mengikuti pola `04`/`04b`/`04c`):

- **11 Panduan Pengguna** — keadaan awal, TOC aktif di "Memulai", artikel umum.
- **11b Panduan — per peran** — TOC aktif di "Karyawan", artikel berisi langkah bernomor + blok screenshot + callout.

Kalau mau lebih hemat, 11b bisa dilewati; keputusan ada di kamu (lihat §7).

---

## 4. Spesifikasi layar `11 Panduan Pengguna`

Frame 1440×900 di `(19760, 0)`, nama `11 Panduan Pengguna`, fill `#FAFAFA`.

### 4.1 Shell (salin dari `07 Pengumuman`)

| Node | Spesifikasi |
|---|---|
| Sidebar | 248×900 putih — salin `0:594`, tambah item nav (lihat §5) |
| Topbar | salin `0:625` + divider `0:626`; search 340×32; ikon notifikasi; avatar 28 |
| Judul | "Panduan Pengguna" di `(280, 86)` — Inter 500 28px, −0.72, `#171717` |
| Subjudul | "Cara memakai MING SOP Center sesuai peran Anda. Panduan ini hanya-baca." di `(280, 126)` — Inter 400 14px, `#707070` |

### 4.2 Kolom kiri — kartu daftar isi

- Posisi `(280, 168)`, ukuran **264×640**, putih, border 1px `#DFDFDF`, radius 12.
- Label "DAFTAR ISI" di `(300, 188)` — Inter 500 11px, tracking +0.4, `#707070`.
- 8 item, tiap item 232×32 di `x=296`, mulai `y=216`, langkah 32px:
  1. Memulai ← **aktif**: pill `#D8F8E9`, radius 6, teks Inter 500 13px `#171717`
  2. Karyawan
  3. PIC SOP
  4. Manager
  5. HRD
  6. Auditor
  7. Manajemen
  8. Status & istilah
- Item non-aktif: Inter 400 13px `#707070`, tanpa fill.

### 4.3 Kolom kanan — kartu artikel

- Posisi `(568, 168)`, ukuran **840×640**, putih, border 1px `#DFDFDF`, radius 12, padding 32.
- Urutan isi dari atas (gap 12/16/24):

| Blok | Spesifikasi |
|---|---|
| Pill peran | "Semua peran" — `#D8F8E9`, radius 9999, teks Inter 500 12px `#171717`, padding 4/10 |
| Judul artikel | "Memulai" — Inter 500 22px, `#171717` |
| Paragraf pembuka | Inter 400 14px, line-height 1.7, `#171717`, maks 2 baris |
| Sub-judul | "Masuk ke aplikasi" — Inter 500 15px, `#171717` |
| Langkah bernomor | 3 baris: angka dalam lingkaran 24px `#FAFAFA` border `#EDEDED`, teks 14px `#171717`, jarak antar baris 12 |
| Callout | 776×64, `#FAFAFA`, radius 8, border 1px `#EDEDED`, teks Inter 400 13px `#707070`: "Lupa password? Hubungi HRD — tidak ada reset mandiri." |
| Catatan kaki | "Panduan ini juga dapat dibuka lewat menu Panduan di sidebar." — Inter 400 12px `#9A9A9A` |

Teks isi memakai kalimat pendek; hindari tabel di dalam kartu (kolom 840 terlalu sempit untuk 4 kolom).

---

## 5. Perubahan sidebar (13 frame lama)

Untuk konsistensi, item **Panduan** ditambahkan ke **semua** sidebar yang sudah ada, bukan hanya layar baru.

Per sidebar, 2 node baru:

| Node | Posisi | Spesifikasi |
|---|---|---|
| Ikon | `(24, 346)` 16×16 | ikon `BookOpen`, warna `#707070` |
| Label | `(48, 343)` | "Panduan", Inter 400 14px, `#707070` |

- `y=336` untuk baris nav (setelah Pengguna di `y=300`); tidak ada node yang perlu digeser.
- Pada layar `11` sendiri, item ini **aktif**: tambah pill `#D8F8E9` 224×36 di `(12, 336)` radius 6, label jadi Inter 500 `#171717`, dan pill aktif lain di sidebar itu dihapus.
- Pengecualian: layar **01 Login** tidak punya sidebar → tidak disentuh.

Total: 12 sidebar × 2 node = 24 node + 1 pill. Mekanis, tanpa menggeser layout.

---

## 6. Spesifikasi layar `11b Panduan — per peran` (opsional)

Frame 1440×900 di `(21280, 0)`, shell identik dengan §4.1, judul "Panduan Pengguna" tetap.

- TOC: item **Karyawan** aktif (pill), "Memulai" kembali normal.
- Artikel:
  - Pill peran "Karyawan"
  - Judul "Membaca dan mengonfirmasi SOP"
  - Paragraf pembuka 1 baris
  - 4 langkah bernomor: buka Perpustakaan SOP → pilih SOP berstatus Berlaku → baca isi → tekan "Konfirmasi sudah membaca"
  - **Blok screenshot**: 776×220, fill `#FAFAFA`, border 1px **dashed** `#D4D4D4`, radius 8, teks tengah Inter 400 12px `#9A9A9A`: "Screenshot: tombol Konfirmasi di halaman detail SOP"
  - Caption di bawah blok: Inter 400 12px `#9A9A9A`
  - Callout kuning **tidak dipakai** — di luar palet; cukup callout abu `#FAFAFA` seperti §4.3

Blok screenshot sengaja placeholder: gambar asli diisi belakangan oleh implementasi (`client/public/panduan/*.png`), bukan digambar di file desain.

---

## 7. Pertanyaan yang perlu kamu putuskan

1. **Dua layar atau satu?** Rekomendasi: dua (§4 + §6), supaya pola "langkah + screenshot" terlihat. Kalau mau cepat: satu.
2. **Sidebar 12 layar ikut diubah?** Rekomendasi: ya (§5). Kalau tidak, layar Panduan jadi satu-satunya yang punya menu itu dan terlihat janggal saat presentasi.
3. **Label menu:** "Panduan" (rekomendasi) atau "Bantuan"?
4. **Isi artikel:** saya tulis contoh nyata (Karyawan/PIC SOP dst.) atau teks lorem singkat saja karena ini file desain?

---

## 8. Urutan eksekusi (setelah disetujui)

1. `clone_nodes` frame `0:593` (07 Pengumuman) → jadikan `11 Panduan Pengguna`, pindahkan ke `(19760, 0)`.
2. Hapus isi konten lama (compose card + list card) dari hasil salinan; sisakan sidebar + topbar.
3. Ganti judul & subjudul (`set_text`, `set_font`).
4. Buat 2 kartu (`create_shape` + `set_fill`/`set_stroke`/`set_radius`), lalu isi TOC dan artikel blok per blok.
5. Tambah item nav Panduan di sidebar layar baru (aktif) dan di 12 sidebar lain (non-aktif).
6. Kalau disetujui: duplikasi langkah 1–4 untuk `11b` di `(21280, 0)`.
7. Verifikasi (lihat §9).
8. Export PNG: `docs/design-preview/panduan.png` (+ `panduan-per-peran.png`).

Tools MCP yang dipakai: `clone_nodes`, `create_shape`, `set_text`, `set_font`, `set_fill`, `set_stroke`, `set_radius`, `insert_icon`, `reparent_node`, `set_size_limits`, `describe`, `lint`, `export_image`. Tidak ada penulisan langsung ke file `.fig`.

---

## 9. Verifikasi sebelum lapor selesai

- [ ] `describe` pada frame baru: 1440×900, `x=19760`, `y=0`, fill `#FAFAFA`.
- [ ] `describe` pada kedua kartu: 264×640 dan 840×640, radius 12, border `#DFDFDF`.
- [ ] `lint` dokumen bersih (tidak ada teks terpotong / keluar frame / warna di luar palet).
- [ ] Tidak ada teks yang melampaui `y=808` (batas bawah area konten di 900).
- [ ] Semua TEXT memakai `Inter`; tidak ada font lain.
- [ ] Export PNG berhasil dan ukurannya masuk akal (1440×900).
- [ ] Frame lama tidak bergeser: 13 frame lama tetap di `y=0` dengan `x` kelipatan 1520.

---

## 10. Yang sengaja tidak dikerjakan

- Halaman `/panduan` di `client/` — di luar lingkup, menunggu instruksi terpisah.
- Versi mobile (lebar 390) — file desain ini seluruhnya desktop 1440; konsisten dulu.
- Pencarian di dalam panduan, anchor link, tombol "cetak" — tidak ada nilainya untuk demo.
- Gambar screenshot asli di dalam file desain — diganti placeholder (§6).
