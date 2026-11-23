export type PanduanBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'image'; src: string; alt: string; caption?: string }
  | { type: 'callout'; text: string }
  | { type: 'terms'; items: { term: string; text: string }[] }
  | { type: 'statusTable'; rows: { status: string; meaning: string; actor: string }[] };

export interface PanduanSection {
  id: string;
  label: string;
  badge: string;
  title: string;
  blocks: PanduanBlock[];
}

/**
 * Isi halaman /panduan. Satu sumber untuk daftar isi dan artikel, supaya
 * menambah bagian tidak perlu menyentuh dua tempat.
 *
 * Aturan isi: sebut label tombol persis seperti di layar, dan jangan menulis
 * fitur yang belum ada (lihat docs/plan/PLAN-PANDUAN-PENGGUNA.md §4).
 */
export const PANDUAN: PanduanSection[] = [
  {
    id: 'memulai',
    label: 'Memulai',
    badge: 'Semua peran',
    title: 'Memulai',
    blocks: [
      {
        type: 'paragraph',
        text: 'Panduan ini menjelaskan cara memakai MING SOP Center. Isinya menyesuaikan peran Anda, jadi bagian yang tidak relevan boleh dilewati.',
      },
      { type: 'heading', text: 'Masuk ke aplikasi' },
      {
        type: 'steps',
        items: [
          'Buka alamat aplikasi, lalu masukkan email perusahaan dan password Anda.',
          'Setelah masuk, Anda langsung diarahkan ke Dashboard.',
          'Menu di sidebar menyesuaikan peran; menu yang tidak menjadi hak Anda tidak ditampilkan.',
        ],
      },
      {
        type: 'callout',
        text: 'Lupa password? Hubungi HRD. Di aplikasi ini tidak ada reset password mandiri.',
      },
      { type: 'image', src: '/panduan/login.png', alt: 'Halaman masuk MING SOP Center' },
      { type: 'heading', text: 'Mengenal layar utama' },
      {
        type: 'paragraph',
        text: 'Dashboard merangkum pekerjaan yang menunggu Anda, kepatuhan konfirmasi, dan pengumuman terbaru. Kotak pencarian di header mencari SOP lewat judul, kode, atau kata kunci.',
      },
      { type: 'image', src: '/panduan/dashboard.png', alt: 'Dashboard setelah masuk' },
      {
        type: 'callout',
        text: 'Kalau sebuah menu tidak terlihat, berarti peran Anda tidak memiliki akses ke sana. Server tetap menolak akses langsung lewat alamat, bukan hanya menyembunyikan tombol.',
      },
    ],
  },
  {
    id: 'karyawan',
    label: 'Karyawan',
    badge: 'Karyawan',
    title: 'Membaca dan mengonfirmasi SOP',
    blocks: [
      {
        type: 'paragraph',
        text: 'SOP yang berlaku wajib dibaca. Konfirmasi Anda tercatat di audit log atas nama Anda sendiri.',
      },
      {
        type: 'steps',
        items: [
          'Buka Perpustakaan SOP dari sidebar.',
          'Saring status Terbit untuk melihat SOP yang berlaku di departemen Anda.',
          'Buka SOP yang dibutuhkan. Tab Riwayat Versi menampilkan versi sebelumnya.',
          'Tekan Konfirmasi baca di kanan atas halaman detail.',
        ],
      },
      {
        type: 'image',
        src: '/panduan/daftar-berlaku.png',
        alt: 'Daftar SOP yang disaring ke status Terbit',
      },
      {
        type: 'image',
        src: '/panduan/detail-konfirmasi.png',
        alt: 'Tombol Konfirmasi baca pada halaman detail SOP',
      },
      {
        type: 'paragraph',
        text: 'Setelah dikonfirmasi, tombol berganti menjadi keterangan bahwa Anda sudah mengonfirmasi versi tersebut. Konfirmasi hanya dihitung sekali per versi.',
      },
      {
        type: 'image',
        src: '/panduan/setelah-konfirmasi.png',
        alt: 'Keadaan halaman setelah konfirmasi tersimpan',
      },
      { type: 'heading', text: 'Melaporkan dugaan pelanggaran' },
      {
        type: 'steps',
        items: [
          'Buka Laporan, lalu tekan Buat laporan.',
          'Pilih SOP terkait bila ada, lalu tulis deskripsi minimal 20 karakter: kejadian, waktu, dan lokasi.',
          'Aktifkan Kirim sebagai anonim bila identitas Anda tidak ingin disimpan.',
          'Tekan Kirim laporan.',
        ],
      },
      {
        type: 'image',
        src: '/panduan/dialog-laporan.png',
        alt: 'Dialog Buat laporan dengan pilihan anonim',
      },
      {
        type: 'callout',
        text: 'Laporan anonim tidak dapat Anda lihat kembali setelah dikirim, karena identitas pelapor tidak disimpan.',
      },
      { type: 'heading', text: 'Membaca pengumuman' },
      {
        type: 'paragraph',
        text: 'Menu Pengumuman menampilkan pengumuman untuk semua departemen dan pengumuman yang ditujukan ke departemen Anda.',
      },
      { type: 'image', src: '/panduan/pengumuman-karyawan.png', alt: 'Daftar pengumuman' },
      {
        type: 'callout',
        text: 'Belum ada notifikasi saat SOP baru terbit. Buka aplikasi untuk melihat SOP terbaru.',
      },
    ],
  },
  {
    id: 'pic-sop',
    label: 'PIC SOP',
    badge: 'PIC SOP',
    title: 'Menyusun SOP dan mengajukan review',
    blocks: [
      {
        type: 'paragraph',
        text: 'PIC SOP adalah satu-satunya peran yang dapat menyusun dan mengajukan SOP untuk departemennya.',
      },
      { type: 'heading', text: 'Membuat SOP baru' },
      {
        type: 'steps',
        items: [
          'Buka Perpustakaan SOP, lalu tekan Buat SOP di kanan atas.',
          'Isi kode SOP dengan pola SOP-XXX-001. Kode harus unik; kode yang sudah dipakai ditolak.',
          'Isi judul, ringkasan, dan periode tinjau ulang. Centang Wajib konfirmasi baca bila karyawan harus mengonfirmasi.',
          'Tulis isi SOP dalam Markdown. Pratinjau di panel kanan ikut berubah saat Anda mengetik.',
          'Pilih Simpan untuk menyimpan sebagai Draft, atau Ajukan review untuk langsung mengirim ke Manager.',
        ],
      },
      { type: 'image', src: '/panduan/pic-daftar.png', alt: 'Tombol Buat SOP pada daftar SOP' },
      { type: 'image', src: '/panduan/form-sop.png', alt: 'Form SOP baru beserta pratinjau' },
      { type: 'heading', text: 'Mengubah SOP yang sudah terbit' },
      {
        type: 'steps',
        items: [
          'Buka SOP yang berstatus Terbit, lalu tekan Buat versi baru.',
          'Isi ringkasan perubahan minimal 10 karakter. Versi draft baru langsung terbentuk.',
          'Sunting isi draft, lalu tekan Ajukan review.',
          'Setelah Manager menyetujui dan HRD menerbitkan, versi lama otomatis berstatus Digantikan.',
        ],
      },
      {
        type: 'image',
        src: '/panduan/pic-detail-buat-versi.png',
        alt: 'Tombol Buat versi baru pada SOP yang sudah terbit',
      },
      {
        type: 'callout',
        text: 'SOP berstatus Terbit tidak bisa disunting langsung. Perubahan selalu lewat versi baru, dan konfirmasi karyawan dihitung ulang saat versi baru terbit.',
      },
    ],
  },
  {
    id: 'manager',
    label: 'Manager',
    badge: 'Manager',
    title: 'Meninjau dan menyetujui SOP',
    blocks: [
      {
        type: 'paragraph',
        text: 'Manager memutuskan SOP departemennya sendiri: meneruskan ke HRD atau mengembalikannya ke PIC SOP.',
      },
      {
        type: 'steps',
        items: [
          'Dashboard menampilkan SOP departemen Anda yang berstatus Menunggu persetujuan.',
          'Buka SOP, lalu baca isi dan tab Riwayat Versi sebelum memutuskan.',
          'Tekan Setujui untuk meneruskan ke HRD, atau Tolak dengan alasan minimal 10 karakter.',
          'SOP yang ditolak kembali ke Draft. PIC SOP dapat memperbaiki lalu mengajukan ulang.',
        ],
      },
      {
        type: 'image',
        src: '/panduan/manager-detail-review.png',
        alt: 'Tombol Setujui dan Tolak pada SOP yang menunggu persetujuan',
      },
      {
        type: 'image',
        src: '/panduan/manager-dialog-tolak.png',
        alt: 'Dialog penolakan dengan alasan wajib',
      },
      {
        type: 'callout',
        text: 'Manager hanya dapat menyetujui SOP dari departemennya sendiri. SOP departemen lain tidak muncul di antrean Anda.',
      },
      {
        type: 'paragraph',
        text: 'Manager juga dapat menindaklanjuti laporan pelanggaran. Langkahnya sama dengan yang dijelaskan pada bagian HRD.',
      },
    ],
  },
  {
    id: 'hrd',
    label: 'HRD',
    badge: 'HRD',
    title: 'Menerbitkan SOP dan menindaklanjuti laporan',
    blocks: [
      { type: 'heading', text: 'Menerbitkan SOP' },
      {
        type: 'steps',
        items: [
          'Buka SOP yang berstatus Siap terbit.',
          'Tekan Terbitkan, lalu pilih Tanggal berlaku.',
          'Konfirmasi. Status berubah menjadi Terbit, dan tanggal tinjau ulang dihitung dari tanggal berlaku.',
        ],
      },
      {
        type: 'image',
        src: '/panduan/hrd-detail-terbitkan.png',
        alt: 'Tombol Terbitkan pada SOP berstatus Siap terbit',
      },
      {
        type: 'image',
        src: '/panduan/hrd-dialog-terbit.png',
        alt: 'Dialog penerbitan dengan tanggal berlaku',
      },
      { type: 'heading', text: 'Menerbitkan pengumuman' },
      {
        type: 'paragraph',
        text: 'Buka Pengumuman, isi judul dan isi pengumuman, pilih sasaran (semua departemen atau satu departemen), lalu tekan Terbitkan.',
      },
      { type: 'image', src: '/panduan/hrd-pengumuman.png', alt: 'Form pengumuman untuk HRD' },
      { type: 'heading', text: 'Menindaklanjuti laporan' },
      {
        type: 'steps',
        items: [
          'Buka Laporan, lalu pilih laporan di daftar kiri.',
          'Pilih status baru: OPEN, TRIAGED, INVESTIGATING, RESOLVED, atau CLOSED.',
          'Tulis catatan minimal 5 karakter, lalu tekan Simpan tindak lanjut.',
          'Setiap perubahan tersimpan sebagai riwayat baru dan tercatat di audit log.',
        ],
      },
      { type: 'image', src: '/panduan/laporan.png', alt: 'Panel tindak lanjut laporan' },
      {
        type: 'callout',
        text: 'Belum ada modul Surat Peringatan. Keputusan sanksi dicatat sebagai catatan tindak lanjut, bukan sebagai data terstruktur.',
      },
    ],
  },
  {
    id: 'auditor',
    label: 'Auditor',
    badge: 'Auditor',
    title: 'Menelusuri riwayat dan temuan',
    blocks: [
      {
        type: 'paragraph',
        text: 'Auditor memeriksa jejak keputusan tanpa mengubah data apa pun.',
      },
      {
        type: 'steps',
        items: [
          'Buka Audit Log, lalu saring berdasarkan aksi, jenis entitas, atau pelaku.',
          'Klik satu baris untuk melihat nilai sebelum dan sesudah perubahan.',
          'Buka Pengguna untuk melihat daftar akun, peran, dan departemen.',
        ],
      },
      { type: 'image', src: '/panduan/audit-log.png', alt: 'Audit log dengan filter aksi' },
      { type: 'image', src: '/panduan/pengguna.png', alt: 'Daftar pengguna' },
      {
        type: 'callout',
        text: 'Audit log tidak dapat diubah atau dihapus dari aplikasi, termasuk oleh HRD.',
      },
      {
        type: 'paragraph',
        text: 'Auditor tidak dapat mengonfirmasi baca, menyetujui, menerbitkan, atau menindaklanjuti laporan. Halaman yang bukan hak Anda menampilkan Akses ditolak.',
      },
      { type: 'image', src: '/panduan/akses-ditolak.png', alt: 'Halaman Akses ditolak' },
    ],
  },
  {
    id: 'manajemen',
    label: 'Manajemen',
    badge: 'Manajemen',
    title: 'Membaca ringkasan dan pekerjaan tertunda',
    blocks: [
      {
        type: 'paragraph',
        text: 'Manajemen memakai aplikasi untuk membaca kondisi kepatuhan dan isi SOP, tanpa mengubah data.',
      },
      {
        type: 'steps',
        items: [
          'Dashboard menampilkan jumlah SOP terbit, kepatuhan konfirmasi, dan pengumuman terbaru.',
          'Buka Perpustakaan SOP untuk membaca isi SOP, atau gunakan pencarian di header.',
          'Bagian Kepatuhan terendah menunjukkan SOP yang paling sedikit dikonfirmasi.',
        ],
      },
      { type: 'image', src: '/panduan/dashboard.png', alt: 'Dashboard ringkasan' },
      { type: 'image', src: '/panduan/daftar-sop.png', alt: 'Daftar SOP' },
      {
        type: 'callout',
        text: 'Manajemen bersifat hanya-baca: tidak ada tombol setujui, terbitkan, atau konfirmasi. Kartu Menunggu tindakan dan Perlu konfirmasi tidak relevan untuk peran ini.',
      },
    ],
  },
  {
    id: 'status-istilah',
    label: 'Status & istilah',
    badge: 'Semua peran',
    title: 'Status & istilah',
    blocks: [
      {
        type: 'paragraph',
        text: 'Status SOP mengikuti alur yang sama untuk semua departemen. Satu SOP hanya berstatus satu dari kemungkinan berikut.',
      },
      {
        type: 'statusTable',
        rows: [
          { status: 'Draft', meaning: 'Sedang disusun PIC SOP, belum diajukan.', actor: 'PIC SOP' },
          {
            status: 'Menunggu persetujuan',
            meaning: 'Sudah diajukan dan menunggu keputusan Manager.',
            actor: 'Manager',
          },
          {
            status: 'Siap terbit',
            meaning: 'Disetujui Manager, menunggu penerbitan HRD.',
            actor: 'HRD',
          },
          { status: 'Terbit', meaning: 'Berlaku dan dapat dibaca karyawan.', actor: '—' },
          {
            status: 'Digantikan',
            meaning: 'Versi lama setelah versi baru terbit.',
            actor: 'Otomatis',
          },
          {
            status: 'Diarsipkan',
            meaning: 'Tidak berlaku lagi. Belum ada tombolnya di aplikasi.',
            actor: 'HRD',
          },
        ],
      },
      { type: 'heading', text: 'Istilah' },
      {
        type: 'terms',
        items: [
          {
            term: 'Versi',
            text: 'Setiap penerbitan menghasilkan nomor versi baru. Isi versi lama tidak pernah ditimpa.',
          },
          {
            term: 'Konfirmasi baca',
            text: 'Pernyataan karyawan bahwa ia sudah membaca versi yang berlaku. Dihitung sekali per versi.',
          },
          {
            term: 'Kepatuhan',
            text: 'Persentase karyawan departemen yang sudah mengonfirmasi, dibanding jumlah karyawan aktif di luar Auditor dan Manajemen.',
          },
          {
            term: 'Audit log',
            text: 'Catatan tindakan penting: siapa, kapan, dan apa yang berubah.',
          },
          {
            term: 'PIC SOP',
            text: 'Pemilik SOP di departemen. Satu-satunya peran yang dapat menyusun SOP.',
          },
        ],
      },
      {
        type: 'callout',
        text: 'Status Diarsipkan sudah ada di data, tetapi belum ada tombol untuk mengarsipkan SOP di aplikasi.',
      },
    ],
  },
];
