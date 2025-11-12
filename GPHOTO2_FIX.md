# Perbaikan GPhoto2 Stream Error

## Masalah yang Diperbaiki

Error `GPhoto2 stream error: Capturing preview frames as movie to 'stdout'. Press Ctrl-C to abort.` terjadi karena:

1. **Penanganan error yang tidak tepat** - Pesan "Capturing preview frames as movie" sebenarnya adalah pesan normal dari GPhoto2, bukan error
2. **Proses tidak dihentikan dengan benar** - Menggunakan `SIGTERM` saja tidak cukup untuk GPhoto2
3. **Parameter perintah tidak optimal** - Kurangnya parameter yang jelas untuk output

## Perbaikan yang Dilakukan

### 1. File `server/mjpegServer.js`

**Sebelum:**

```javascript
this.streamProcess = spawn("gphoto2", ["--capture-movie", "--stdout"], {
  stdio: ["pipe", "pipe", "pipe"],
});
```

**Sesudah:**

```javascript
this.streamProcess = spawn(
  "gphoto2",
  [
    "--capture-movie",
    "--stdout",
    "--force-overwrite",
    "--filename=-", // Output ke stdout secara eksplisit
  ],
  {
    stdio: ["pipe", "pipe", "pipe"],
  }
);
```

**Perbaikan Error Handling:**

```javascript
this.streamProcess.stderr.on("data", (data) => {
  const errorMsg = data.toString();
  console.error("GPhoto2 stream error:", errorMsg);

  // Jika error adalah pesan normal, ignore
  if (errorMsg.includes("Capturing preview frames as movie")) {
    return; // Ini adalah pesan normal, bukan error
  }

  // Jika ada error serius, stop stream
  if (errorMsg.includes("ERROR") || errorMsg.includes("Failed")) {
    this.stopStream();
  }
});
```

**Perbaikan Proses Stop:**

```javascript
if (this.streamProcess) {
  try {
    // Kirim sinyal SIGINT (Ctrl-C) untuk menghentikan gphoto2 dengan graceful
    this.streamProcess.kill("SIGINT");

    // Tunggu sebentar agar proses bisa cleanup
    setTimeout(() => {
      if (this.streamProcess && !this.streamProcess.killed) {
        // Jika masih berjalan, force kill
        this.streamProcess.kill("SIGKILL");
      }
    }, 1000);
  } catch (error) {
    console.error("Error stopping stream process:", error);
  }

  this.streamProcess = null;
}
```

### 2. File `server/mjpegStreamer.js`

Perbaikan serupa diterapkan pada `mjpegStreamer.js` dengan penambahan:

- Parameter `--force-overwrite` dan `--filename=-`
- Error handling yang memfilter pesan normal
- Proses stop yang menggunakan `SIGINT` sebelum `SIGKILL`

### 3. File `server/gphotoWrapper.js`

**Perbaikan Capture Preview:**

```javascript
// Handle stderr yang bukan error (pesan normal dari gphoto2)
if (stderr && stderr.includes("Capturing preview frame")) {
  // Ini adalah pesan normal, bukan error
  console.log("GPhoto2 preview message:", stderr.trim());
}
```

**Perbaikan Capture Image:**

- Menambahkan timeout 10 detik untuk capture foto
- Menambahkan error handling untuk stderr yang bukan error
- Menghapus `cd uploads` yang tidak perlu

## Perintah yang Diperbaiki

### Perintah Stream yang Benar:

```bash
gphoto2 --capture-movie --stdout --force-overwrite --filename=-
```

### Perintah Preview yang Benar:

```bash
gphoto2 --capture-preview --force-overwrite --filename="path/to/file.jpg"
```

### Perintah Capture Foto yang Benar:

```bash
gphoto2 --capture-image-and-download --filename="path/to/file.jpg" --skip-existing
```

## Testing

Untuk menguji perbaikan, jalankan:

```bash
cd server
node test-gphoto.js
```

## Penjelasan Teknis

1. **SIGINT vs SIGTERM**: GPhoto2 merespons lebih baik terhadap `SIGINT` (sinyal Ctrl-C) daripada `SIGTERM`
2. **Filter Pesan Normal**: Pesan "Capturing preview frames as movie" adalah informasi normal, bukan error
3. **Graceful Shutdown**: Memberikan waktu 1 detik untuk cleanup sebelum force kill
4. **Parameter Eksplisit**: Menggunakan `--filename=-` memastikan output ke stdout secara eksplisit

## Hasil yang Diharapkan

- Stream MJPEG berjalan tanpa error yang membingungkan
- Proses stop berfungsi dengan benar
- Pesan normal dari GPhoto2 difilter dengan tepat
- Tidak ada proses zombie yang tertinggal

## Troubleshooting

Jika masih mengalami masalah:

1. Pastikan GPhoto2 terinstall dengan benar: `gphoto2 --version`
2. Pastikan kamera terdeteksi: `gphoto2 --auto-detect`
3. Coba dengan koneksi USB yang berbeda
4. Restart server setelah menerapkan perbaikan
