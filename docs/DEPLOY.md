# Catatan Deploy

Dokumen ini mencatat bentuk deployment yang berjalan saat ini dan langkah rilis ulang. Nilai rahasia (password database, `SESSION_SECRET`) tidak ditulis di sini; keduanya hanya ada di `/opt/sop-center/server/.env` di server.

## Bentuk deployment

| Item | Nilai |
|---|---|
| Host | `43.134.234.66` (Ubuntu 24.04), di belakang proxy Cloudflare |
| URL | <https://sopming.arnoldartworks.my.id> |
| Folder aplikasi | `/opt/sop-center` |
| Port API | `4100` (hanya `127.0.0.1`) |
| Service | `sop-center.service` (systemd, `Restart=always`) |
| Web server | Nginx, menyajikan `client/dist` dan mem-proxy `/api/` |
| Database | PostgreSQL 16 lokal, database `sop_center`, role `sop_center` |
| Sertifikat | Let's Encrypt untuk `sopming.arnoldartworks.my.id`, diperbarui otomatis oleh certbot |

Alasan satu origin: cookie sesi memakai `SameSite=Lax` dan server menolak mutasi yang `Origin`-nya bukan `CLIENT_ORIGIN`. Memisahkan frontend dan API ke dua domain akan membuat login gagal.

Port `4000` sengaja tidak dipakai karena sudah dirujuk konfigurasi situs lain di server yang sama. Aplikasi ini memakai `4100`.

## Cloudflare

- DNS: record `A` dengan nama `sopming` mengarah ke `43.134.234.66`, proxy Cloudflare aktif.
- Mode SSL/TLS saat ini **Flexible**: Cloudflare menerima HTTPS dari browser lalu menghubungi origin lewat HTTP. Karena itu Nginx melayani aplikasi di port 80; blok 443 tetap disiapkan dengan sertifikat Let's Encrypt.
- Konsekuensi: segmen Cloudflare → origin tidak terenkripsi. Untuk pemakaian nyata, ubah mode ke **Full (strict)**; setelah itu redirect 80 → 443 bisa diaktifkan kembali.
- Jangan menambahkan redirect paksa ke HTTPS selama mode masih Flexible — Cloudflare akan meneruskannya bolak-balik dan halaman berakhir `301` berulang.
- Nginx meneruskan `CF-Connecting-IP` sebagai `X-Forwarded-For` (fallback ke `$remote_addr` bila header tidak ada), sehingga audit log mencatat IP pengunjung, bukan IP edge Cloudflare.

## Rilis ulang

Dari mesin lokal, di root repositori:

```bash
# 1. Build ulang client (server hanya type-check, tidak menghasilkan JS)
npm run build

# 2. Kirim source (tanpa node_modules, .git, dan .env)
tar czf - --exclude=node_modules --exclude=.git --exclude=.env --exclude=.env.local --exclude=client/dist . \
  | ssh ubuntu@43.134.234.66 "tar xzf - -C /opt/sop-center"

# 3. Kirim hasil build client
tar czf - -C client dist \
  | ssh ubuntu@43.134.234.66 "tar xzf - -C /opt/sop-center/client"

# 4. Restart API
ssh ubuntu@43.134.234.66 "sudo systemctl restart sop-center"
```

Di server, hanya bila diperlukan:

```bash
cd /opt/sop-center && npm ci --no-audit --no-fund     # jika dependency berubah
cd /opt/sop-center/server && npx prisma migrate deploy --schema prisma/schema.prisma   # jika skema berubah
```

Build client sengaja dilakukan di lokal karena RAM server hanya 1,9 GB dan sudah dipakai beberapa aplikasi lain.

## Verifikasi setelah rilis

```bash
curl -s https://sopming.arnoldartworks.my.id/api/health
# {"ok":true}

curl -s -o /dev/null -w "%{http_code}\n" https://sopming.arnoldartworks.my.id/
# 200

curl -s -o /dev/null -w "%{http_code}\n" https://sopming.arnoldartworks.my.id/sop
# 200 (SPA fallback)

curl -s -c /tmp/jar -X POST https://sopming.arnoldartworks.my.id/api/auth/login \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://sopming.arnoldartworks.my.id' \
  -d '{"email":"hrd@ming.test","password":"password123"}'
# 200 + data user
```

Di server:

```bash
systemctl status sop-center
journalctl -u sop-center -n 50 --no-pager
```

## Perawatan

- **Perpanjangan sertifikat** otomatis lewat timer certbot. Uji dengan `sudo certbot renew --dry-run`.
- **Seed bersifat destruktif**: `npm run db:seed` menghapus seluruh data lalu membuat ulang. Jangan dijalankan bila ada data yang ingin dipertahankan.
- **Backup** manual: `sudo -u postgres pg_dump sop_center > sop_center.sql`.
- **Data demo bersifat publik.** Siapa pun yang tahu URL dapat masuk dengan akun `password123`, termasuk sebagai HRD. Untuk pemakaian nyata, ganti password seluruh akun dan hapus akun demo.
- **Setelah masa asesmen**, ganti password SSH server karena kredensial pernah dibagikan lewat chat.

## Yang tidak diubah di server

Server ini juga menjalankan aplikasi lain (`hospiledger`, `hr-app`, `code-server`, dan lainnya). Deployment ini hanya menambahkan:

- `/opt/sop-center`
- `/etc/systemd/system/sop-center.service`
- `/etc/nginx/sites-available/sop-center` + symlink di `sites-enabled`
- database `sop_center` dan role `sop_center`

Tidak ada konfigurasi Nginx, service, atau database milik aplikasi lain yang diubah.
