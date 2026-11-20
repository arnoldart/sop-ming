# AI_USAGE — MING SOP Center

> Brief memperbolehkan — bahkan mendorong — penggunaan AI. Dokumen ini mencatat
> **di mana** AI dipakai, **bagaimana** hasilnya diperiksa, dan **apa yang salah**
> lalu tertangkap. Tujuannya bukan membela diri, melainkan membuat prosesnya bisa
> diperiksa ulang.

---

## 1. Prinsip yang saya pegang

1. **AI menulis, saya memutuskan.** Setiap keputusan yang punya konsekuensi
   (skema data, model otorisasi, cakupan, bahasa visual) saya tetapkan lebih
   dulu; AI mengeksekusi.
2. **Klaim harus punya bukti.** "Sudah jalan" hanya boleh ditulis kalau ada
   perintah yang dijalankan dan keluarannya bisa ditunjukkan. Karena itu tes
   otomatis ditulis berbarengan dengan fitur, bukan setelahnya.
3. **AI tidak boleh menilai pekerjaannya sendiri.** Bagian yang paling mudah
   salah — aturan transisi, matriks izin, kepemilikan data — diuji dengan tes
   yang dibuat untuk **gagal**, bukan untuk lulus.
4. **Tidak ada AI di dalam produk.** Brief memperbolehkan AI untuk proses
   pengerjaan, bukan sebagai fitur. Menambahkan "ringkas SOP dengan AI" berarti
   menambah permukaan yang tidak diminta dan tidak bisa diuji dalam timebox.

---

## 2. Alat yang dipakai

| Alat | Peran |
|---|---|
| CodeBuddy Code (agen CLI, model DeepSeek) | Menulis kode, tes, dokumen, dan desain; menjalankan perintah build/tes |
| OpenPencil via MCP | Membuat 9 layar desain di `sop.fig` — bukan mengekspor gambar, tetapi menaruh node asli ke dalam file desain |
| Pratinjau visual (ekspor PNG → pemeriksaan gambar) | Memeriksa hasil desain; menemukan tumpang tindih teks yang tidak terlihat dari kode |

Yang **tidak** dipakai: generator boilerplate otomatis, atau AI untuk menulis
commit message tanpa saya baca.

---

## 3. Pembagian kerja per fase

| Fase | Dikerjakan AI | Dikerjakan / diputuskan saya |
|---|---|---|
| Membaca brief | Menyarikan PDF menjadi ringkasan kebutuhan | Memastikan tidak ada kebutuhan yang terlewat |
| PRD | Menyusun struktur, menulis 10 user story + AC, matriks izin | Menjawab 10 pertanyaan discovery; menolak pemotongan RBAC; menetapkan target 2 hari |
| Skema data | Menulis `schema.prisma` dari keputusan saya | Memutuskan pemisahan `Sop.status` vs `SopVersion.status`; audit tanpa FK |
| Otorisasi | Menulis `policy.ts`, `requirePermission()`, pengecekan kepemilikan | Menetapkan isi matriks 6×14 dan syarat "approver harus satu departemen" |
| Siklus SOP | Menulis `TRANSITION_RULES` dan `transition()` | Menetapkan bahwa versi terbit tidak dapat disunting |
| Tes | Menulis 23 tes | Menetapkan bahwa tes negatif (403/409/422) wajib ada, bukan hanya happy path |
| Desain | Membuat 9 layar di `sop.fig` | Menetapkan bahasa visual Supabase dari `DESIGN.md`, menolak menyentuh frontend sebelum desain disetujui |
| Dokumentasi | Menyusun `ASSUMPTIONS.md`, `PROGRESS.md`, `AI_USAGE.md` | Memastikan isinya jujur — termasuk bagian "belum selesai" |

---

## 4. Prompt yang dipakai

Ini prompt saya yang sebenarnya, bukan versi yang dirapikan setelah hasilnya
bagus. Saya sertakan karena pola yang berhasil (dan yang tidak) lebih berguna
daripada daftar fitur.

### 4.1 Prompt utama, berurutan

| # | Prompt (ringkas, sesuai yang saya tulis) | Yang dihasilkan | Cara saya memeriksa |
|---|---|---|---|
| 1 | "Pelajari `docs/Tes Teknis ... .pdf` itu saja, kalau sudah kabari" | Ringkasan kebutuhan + daftar hal yang belum jelas | Membaca ulang PDF dan mencocokkan |
| 2 | "/prd — buatkan PRD-nya dan **jika ada pertanyaan kamu wajib menanyakan**" | `docs/PRD.md` + 10 pertanyaan discovery | Menjawab semua pertanyaan; menolak bagian yang tidak sesuai |
| 3 | "Dari pertanyaan tadi, apakah jawabanku sudah layak dan sangat direkomendasikan?" | Kritik atas jawaban saya sendiri + rekomendasi | Menerima sebagian, menolak sebagian |
| 4 | "Aku ingin selesai dalam 1–2 hari, jadi gimana itu?" | Rencana 6 sesi/21 jam + tabel "kedalaman yang diturunkan" | Memastikan tidak ada fitur yang dihapus |
| 5 | "**Bagian RBAC jangan dipotong**, itu sudah bagus" | Koreksi arah: kedalaman yang dikompresi, bukan cakupan | — |
| 6 | "Buat UI-nya sesuai PRD + `DESIGN.md` + gambar referensi, **tulis di `sop.fig`**, dan **jangan sentuh frontend sama sekali sebelum aku menyuruh**" | 9 layar desain di `sop.fig` | Memeriksa setiap layar lewat ekspor PNG |
| 7 | "Build dulu `@server`, kalau ada error perbaiki" | Perbaikan `tsconfig` + build bersih | Menjalankan `tsc` sendiri |
| 8 | "Cek lagi, masih ada yang merah" (2×) | Diagnosa: cache TS server, bukan isi file | Membuktikan dengan `grep` + `tsc` exit 0 |
| 9 | "Coba test lagi pakai MCP yang benar, **bukan script modifikasi**" | Perpindahan dari skrip buatan sendiri ke tool MCP asli | — |
| 10 | "Pakai MCP **openpencil**, karena `sop.fig` dibuka dengan program OpenPencil" | Perbaikan akar masalah: MCP yang terdaftar menunjuk aplikasi **Pen**, produk berbeda | Membandingkan proses yang berjalan dengan konfigurasi |

### 4.2 Pola prompt yang terbukti

Yang membuat hasilnya bisa dipakai:

- **Memaksa bertanya sebelum menulis.** Kalimat "jika ada pertanyaan kamu wajib
  menanyakan" mengubah PRD dari tebakan menjadi dokumen yang isinya sudah
  disepakati. Tanpa itu, AI akan mengisi kekosongan dengan asumsi yang wajar
  tetapi bukan pilihan saya.
- **Membatasi gerbang, bukan membatasi panjang jawaban.** "Jangan sentuh
  frontend sebelum aku menyuruh" lebih efektif daripada "kerjakan desainnya
  dengan baik" — yang pertama bisa diperiksa benar/salah, yang kedua tidak.
- **Menolak jalan pintas secara eksplisit.** "Jangan pakai script modifikasi,
  pakai MCP" menghentikan solusi yang secara teknis berhasil tetapi bukan yang
  diminta.
- **Meminta bukti, bukan ringkasan.** "Build dulu, kalau ada error perbaiki"
  memaksa perintah dijalankan; ringkasan "sudah beres" tidak bisa diverifikasi.

Yang tidak berhasil:

- Prompt panjang berisi banyak tujuan sekaligus ("buat PRD, desain, dan
  frontend") membuat AI mengerjakan yang paling mudah lebih dulu. Dipecah per
  gerbang hasilnya jauh lebih terkendali.
- Membiarkan AI memilih stack tanpa constraint menghasilkan pilihan yang wajar
  tetapi tidak sesuai preferensi saya; karena itu stack ditetapkan lebih dulu
  lewat pertanyaan berstruktur.

---

## 5. Kesalahan AI yang tertangkap

Bagian ini yang paling penting. Semua bug di bawah ini ditulis AI, dan semuanya
tertangkap **sebelum** dianggap selesai.

| # | Kesalahan | Bagaimana tertangkap | Perbaikan |
|---|---|---|---|
| 1 | `include: { approvals }` dipasang di model `Sop`, padahal relasinya ada di `SopVersion` | Tes integrasi gagal dengan `PrismaClientValidationError` | Query `SopApproval` terpisah |
| 2 | Approve ditolak karena "catatan wajib" | Tes siklus penuh gagal di langkah approve | Catatan hanya wajib untuk `REJECT` |
| 3 | Login 500 `env is not defined` | Tes login gagal | Impor `env` yang hilang |
| 4 | Seluruh suite gagal 429 | Rate limit mengunci tesnya sendiri | Rate limit dilewati saat `NODE_ENV=test` |
| 5 | Tes saling menabrak dengan 409 | Kode SOP sama di semua tes | Counter modul-level |
| 6 | Nama aksi audit tidak konsisten (`SOP_APPROVE` vs `SOP_APPROVED`) | Tes audit gagal | Peta `AUDIT_ACTION`, satu sumber untuk service dan seed |
| 7 | Menyarankan `"ignoreDeprecations": "6.0"` untuk meredam peringatan TS | TS 5.9 hanya menerima `"5.0"`; saran itu akan menimbulkan error baru | `baseUrl` dihapus dan path dibuat relatif |
| 8 | Menyimpulkan `tsconfig` masih error padahal file di disk sudah bersih | Saya melaporkan squiggle merah; `tsc` keluar dengan kode 0 dan `grep baseUrl` kosong | Didiagnosis sebagai cache TS server — solusinya restart TS server, bukan mengubah file |
| 9 | Menulis skrip JSON-RPC sendiri untuk menggerakkan desain | Saya menolak: "pakai MCP yang benar, bukan script" | Berpindah ke tool MCP asli |
| 10 | Mencoba menghubungkan MCP yang salah (aplikasi Pen, bukan OpenPencil) | Gagal berulang dengan "transport not connected to app: desktop" | Memeriksa proses & konfigurasi, mendaftarkan server `open-pencil` |

Pelajaran dari #8: AI cenderung mempercayai kesimpulan sebelumnya daripada
menguji ulang. Ketika saya menekan "cek lagi", hasilnya berubah — itu tanda
pemeriksaan pertama tidak benar-benar dilakukan.

Pelajaran dari #9–#10: AI akan memilih jalan yang **bisa** ditempuhnya sendiri
alih-alih jalan yang **diminta**. Ini bukan kecurangan, tetapi menghasilkan
deliverable yang salah bentuk: skrip bisa membuat gambar, tetapi tidak menaruh
node asli ke dalam `sop.fig` seperti yang diminta.

---

## 6. Yang saya tidak serahkan ke AI

- **Keputusan cakupan.** Modul mana yang masuk, mana yang jadi non-goal, dan
  kapan berhenti menambah fitur.
- **Isi matriks izin.** AI mengusulkan; saya yang menetapkan siapa boleh apa.
- **Penilaian akhir kelayakan.** "Apakah ini cukup untuk dikumpulkan?" — saya
  putuskan dengan membaca ulang brief, bukan dengan bertanya ke AI.
- **Kebenaran dokumen ini.** Saya yang memastikan bagian "belum selesai" tetap
  ada, karena itu bagian yang paling mudah dihapus kalau diserahkan ke AI.

---

## 7. Pernyataan

Saya memakai AI secara luas untuk menulis kode, tes, dokumen, dan desain dalam
tugas ini. Struktur, keputusan arsitektur, cakupan, dan verifikasi adalah
pekerjaan saya. Setiap klaim "selesai" di `PROGRESS.md` punya bukti yang bisa
dijalankan ulang dengan `npm test`, dan setiap bagian yang belum selesai
disebutkan apa adanya.

Kalau ada bagian yang ingin diperiksa lebih dalam, bagian yang paling layak
dilihat adalah `server/src/policy.ts` (apakah matriksnya masuk akal) dan
`server/src/services/sopService.ts` (apakah `transition()` benar-benar menjadi
satu-satunya pintu perubahan status).
