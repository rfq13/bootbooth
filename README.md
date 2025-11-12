# BootBooth - Photobooth Application

Aplikasi photobooth modern yang dibangun dengan Node.js, Preact, dan Tailwind CSS. Aplikasi ini menggunakan library `node-gphoto2` untuk mengakses kamera digital secara langsung.

## Fitur

- 📸 **Capture Foto**: Ambil foto langsung dari kamera digital
- 🖼️ **Galeri Foto**: Lihat dan kelola foto yang sudah diambil
- 🔄 **Real-time Update**: Update real-time menggunakan Socket.IO
- 📹 **Live Preview**: Preview langsung dari kamera sebelum mengambil foto
- 📱 **Responsive Design**: Tampilan yang optimal di berbagai perangkat
- 🎨 **Modern UI**: Interface yang menarik dengan Tailwind CSS
- ⚡ **Mode Simulasi**: Bisa berjalan tanpa kamera untuk testing

## Teknologi

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **node-gphoto2** - Kamera control library
- **Sharp** - Image processing

### Frontend

- **Preact** - Lightweight React alternative
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.IO Client** - Real-time client

## Persyaratan Sistem

### Untuk Mode Kamera Nyata:

- Linux/macOS (node-gphoto2 tidak mendukung Windows)
- Kamera digital yang kompatibel dengan gPhoto2
- Library gPhoto2 terinstall:

  ```bash
  # Ubuntu/Debian
  sudo apt-get install libgphoto2-dev

  # macOS
  brew install gphoto2
  ```

### Untuk Mode Simulasi:

- Tidak ada persyaratan khusus

## Instalasi

1. **Clone repository**

   ```bash
   git clone <repository-url>
   cd bootbooth
   ```

2. **Install dependencies**

   ```bash
   npm run install-all
   ```

3. **Jalankan aplikasi**
   ```bash
   npm run dev
   ```

Aplikasi akan berjalan pada:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Cara Penggunaan

### Mode Simulasi (Tanpa Kamera)

1. Buka http://localhost:5173
2. Klik tombol "Ambil Foto"
3. Aplikasi akan membuat foto dummy untuk testing

### Mode Kamera Nyata

1. Pastikan kamera terhubung ke komputer
2. Buka http://localhost:5173
3. Status kamera akan menunjukkan "Terhubung"
4. Klik tombol "Ambil Foto" untuk capture foto dari kamera

## API Endpoints

### GET /api/status

Check status kamera dan koneksi

### POST /api/capture

Ambil foto dari kamera

### GET /api/photos

Dapatkan daftar semua foto

### DELETE /api/photos/:filename

Hapus foto tertentu

## Socket.IO Events

### Client Events

- `connect` - Terhubung ke server
- `disconnect` - Terputus dari server

### Server Events

- `photoCaptured` - Foto berhasil diambil
- `photoDeleted` - Foto berhasil dihapus

## Struktur Proyek

```
bootbooth/
├── client/                 # Frontend Preact
│   ├── src/
│   │   ├── components/     # Komponen UI
│   │   ├── App.jsx        # Komponen utama
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Global styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/                # Backend Node.js
│   └── index.js          # Server utama
├── uploads/              # Folder penyimpanan foto
├── package.json          # Root package.json
└── README.md
```

## Troubleshooting

### Kamera Tidak Terdeteksi

1. Pastikan kamera terhubung dan dalam mode transfer
2. Coba jalankan `gphoto2 --auto-detect` di terminal
3. Install driver kamera jika diperlukan

### Permission Issues (Linux)

```bash
# Tambahkan user ke group plugdev
sudo usermod -a -G plugdev $USER

# Restart atau logout/login
```

### Port Already in Use

```bash
# Kill process pada port 3001
lsof -ti:3001 | xargs kill -9

# Kill process pada port 5173
lsof -ti:5173 | xargs kill -9
```

## Kontribusi

1. Fork repository
2. Buat feature branch
3. Commit changes
4. Push ke branch
5. Buat Pull Request

## License

MIT License - lihat file LICENSE untuk detail

## Support

Jika ada masalah atau pertanyaan, silakan buat issue di repository.
