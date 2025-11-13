# Menambahkan Photobooth ke Autostart pada Linux

Aplikasi ini berbasis web dan dijalankan di browser Chrome dalam mode kiosk. Berikut langkah‑langkah untuk membuatnya otomatis berjalan saat sistem pertama kali boot.

## Prasyarat

- Sistem operasi Linux dengan desktop environment yang mendukung file `.desktop` (misalnya GNOME, KDE, XFCE).
- Google Chrome terinstall (`google-chrome-stable`).
- Aplikasi Photobooth sudah dapat diakses di `http://localhost` (misalnya dijalankan dengan `npm run dev` atau server Go).

## Langkah‑langkah

1. **Buat folder autostart (jika belum ada)**

```bash
mkdir -p ~/.config/autostart
```

2. **Buat file desktop**

```bash
nano ~/.config/autostart/photobooth.desktop
```

Salin isi berikut ke dalam file tersebut:

```ini
[Desktop Entry]
Version=1.3
Terminal=false
Type=Application
Name=Photobooth
Exec=google-chrome-stable --kiosk http://localhost --noerrdialogs --disable-infobars --disable-features=Translate --no-first-run --check-for-update-interval=31536000 --touch-events=enabled --password-store=basic
Icon=/var/www/html/resources/img/favicon-96x96.png
StartupNotify=false
```

3. **Pastikan file memiliki izin eksekusi**

```bash
chmod +x ~/.config/autostart/photobooth.desktop
```

4. **Uji coba**

Logout dari sesi desktop Anda, kemudian login kembali atau reboot sistem. Photobooth seharusnya otomatis terbuka dalam mode kiosk.

## Catatan tambahan

- Jika Chrome terinstall di lokasi berbeda, sesuaikan path pada baris `Exec`.
- Untuk menonaktifkan autostart, hapus file `photobooth.desktop` dari `~/.config/autostart`.
- Pada beberapa distro, direktori autostart dapat berada di `/etc/xdg/autostart` untuk semua pengguna.

Selamat mencoba!
