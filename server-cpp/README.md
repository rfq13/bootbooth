# Photo Booth Server (C++)

Ini adalah implementasi ulang backend Photo Booth dari Golang ke C++. Backend ini menyediakan semua fungsionalitas yang sama dengan versi Golang asli, termasuk:

- HTTP server dengan REST API
- WebSocket/Socket.IO server untuk komunikasi real-time
- Wrapper untuk gphoto2 untuk mengontrol kamera
- MJPEG server untuk streaming preview kamera
- Image effects untuk memproses foto
- File management untuk upload dan preview

## Fitur

### API Endpoints

- `GET /api/status` - Mendapatkan status koneksi kamera
- `GET /api/photos` - Mendapatkan daftar foto
- `DELETE /api/photos/{filename}` - Menghapus foto
- `GET /api/preview` - Mendapatkan frame preview
- `GET /uploads/{filename}` - Mendapatkan file gambar (dengan dukungan efek)

### WebSocket Events

- `detect-camera` - Mendeteksi kamera
- `start-preview` - Memulai stream preview
- `stop-preview` - Menghentikan stream preview
- `stop-mjpeg` - Menghentikan stream MJPEG
- `capture-photo` - Mengambil foto
- `set-effect` - Mengatur efek gambar
- `get-effect` - Mendapatkan efek gambar saat ini

### Image Effects

- `none` - Tanpa efek
- `fisheye` - Efek fish eye
- `grayscale` - Efek grayscale
- `sepia` - Efek sepia
- `vignette` - Efek vignette
- `blur` - Efek blur
- `sharpen` - Efek sharpen
- `invert` - Efek invert
- `pixelate` - Efek pixelate

## Struktur Folder

```
server-cpp/
├── bin/              # Binary executable
├── obj/              # Object files
├── src/              # Source code
│   ├── main.cpp              # Main entry point
│   ├── http_server.cpp       # HTTP server implementation
│   ├── websocket_server.cpp  # WebSocket server implementation
│   ├── gphoto_wrapper.cpp    # gphoto2 wrapper
│   ├── image_effects.cpp     # Image effects implementation
│   └── mjpeg_server.cpp      # MJPEG server implementation
├── include/          # Header files
│   └── server.h              # Main header with declarations
├── uploads/          # Uploaded photos
├── previews/         # Preview images
├── Makefile          # Build configuration
└── README.md         # This file
```

## Kompilasi

### Prasyarat

- C++17 compatible compiler (g++ 7+, clang 5+)
- libjpeg-dev
- libssl-dev
- gphoto2

### Instalasi Dependensi

#### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y g++ libjpeg-dev libssl-dev gphoto2
```

#### CentOS/RHEL

```bash
sudo yum install -y gcc-c++ libjpeg-turbo-devel openssl-devel gphoto2
```

#### macOS dengan Homebrew

```bash
brew install libjpeg openssl gphoto2
```

### Build

```bash
# Build dengan optimasi default
make

# Build dengan debug symbols
make debug

# Build untuk produksi dengan optimasi maksimal
make release
```

### Membersihkan Build Artifacts

```bash
make clean
```

### Menjalankan Server

```bash
# Build dan jalankan
make run

# Atau jalankan binary langsung
./bin/photobooth-server
```

## Konfigurasi

Server berjalan pada port berikut:

- API Server: 3001
- MJPEG Server: 8080

Port dapat diubah dengan mengedit konstanta di `include/server.h`:

```cpp
const int API_PORT = 3001;
const int MJPEG_PORT = 8080;
```

## Penggunaan

### Mendapatkan Status Kamera

```bash
curl http://localhost:3001/api/status
```

### Mendapatkan Daftar Foto

```bash
curl http://localhost:3001/api/photos
```

### Mengambil Foto

```bash
curl -X POST http://localhost:3001/api/capture
```

### Menghapus Foto

```bash
curl -X DELETE http://localhost:3001/api/photos/photo_1234567890.jpg
```

### Mendapatkan Gambar dengan Efek

```bash
curl "http://localhost:3001/uploads/photo_1234567890.jpg?effect=grayscale&intensity=0.8"
```

### Streaming Preview

MJPEG stream dapat diakses di:

```
http://localhost:8080/camera
```

## Pengembangan

### Format Kode

```bash
make format
```

### Static Analysis

```bash
make cppcheck
```

### Debugging

```bash
# Build dengan debug symbols
make debug

# Jalankan dengan debugger
gdb ./bin/photobooth-server
```

### Logging

Server mencetak log ke stdout/stderr. Untuk menyimpan log ke file:

```bash
./bin/photobooth-server > server.log 2>&1
```

## Troubleshooting

### Kamera Tidak Terdeteksi

1. Pastikan gphoto2 terinstal dengan benar:

   ```bash
   gphoto2 --auto-detect
   ```

2. Pastikan kamera terhubung dan dihidupkan

3. Coba jalankan sebagai root jika ada masalah permission:
   ```bash
   sudo ./bin/photobooth-server
   ```

### Error Saat Kompilasi

1. Pastikan semua dependensi terinstal:

   ```bash
   make install-deps
   ```

2. Cek versi compiler:

   ```bash
   g++ --version
   ```

3. Build dengan verbose output untuk melihat error detail:
   ```bash
   make V=1
   ```

### MJPEG Stream Tidak Berfungsi

1. Pastikan tidak ada proses lain yang menggunakan kamera
2. Coba restart server
3. Periksa log untuk error message

## Performa

Backend C++ ini dirancang untuk performa tinggi dengan:

- Multithreading untuk menangani multiple clients
- Non-blocking I/O untuk network operations
- Efficient memory management
- Optimized image processing algorithms

## Lisensi

Lisensi proyek ini sama dengan proyek asli.

## Kontribusi

Untuk kontribusi, silakan ikuti panduan kontribusi proyek asli.
