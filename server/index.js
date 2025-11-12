const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const http = require("http");
const socketIo = require("socket.io");
const GPhotoWrapper = require("./gphotoWrapper");
const MJPEGServer = require("./mjpegServer");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../server/public")));
app.use("/uploads", express.static(path.join(__dirname, "../server/uploads")));
app.use(
  "/previews",
  express.static(path.join(__dirname, "../server/previews"))
);

// Pastikan folder uploads ada
const ensureUploadsFolder = async () => {
  try {
    await fs.access(path.join(__dirname, "../server/uploads"));
  } catch {
    await fs.mkdir(path.join(__dirname, "../server/uploads"));
  }

  try {
    await fs.access(path.join(__dirname, "../server/previews"));
  } catch {
    await fs.mkdir(path.join(__dirname, "../server/previews"));
  }
};

// Camera controller
let camera = null;
let cameraInitialized = false;
let cameraWrapper = null;
let mjpegServer = null;

const initializeCamera = async () => {
  try {
    // Initialize GPhotoWrapper
    cameraWrapper = new GPhotoWrapper();

    // Initialize MJPEG Server
    mjpegServer = new MJPEGServer(8080);

    // Start MJPEG server
    await mjpegServer.start();

    // Detect camera
    const detectCamera = () => {
      return new Promise((resolve, reject) => {
        cameraWrapper.detectCamera((result) => {
          if (result.success && result.cameras.length > 0) {
            camera = result.cameras[0];
            console.log("Kamera ditemukan:", camera.model);
            cameraInitialized = true;
            resolve(result);
          } else {
            console.log(
              "Tidak ada kamera yang ditemukan, menggunakan mode simulasi"
            );
            cameraInitialized = false;
            resolve(result);
          }
        });
      });
    };

    const result = await detectCamera();
  } catch (error) {
    console.log("Terjadi error dengan kamera, menggunakan mode simulasi");
    console.error("Error:", error.message);

    // Reset camera state
    camera = null;
    cameraInitialized = false;
    cameraWrapper = null;
    mjpegServer = null;
  }
};

// Routes
app.get("/api/status", (req, res) => {
  res.json({
    cameraConnected: cameraInitialized,
    message: cameraInitialized
      ? "Kamera terhubung"
      : "Kamera tidak terhubung (mode simulasi)",
  });
});

app.post("/api/capture", async (req, res) => {
  try {
    if (!cameraInitialized || !cameraWrapper) {
      // Mode simulasi - buat gambar dummy
      const timestamp = Date.now();
      const filename = `photo_${timestamp}.jpg`;
      const filepath = path.join(__dirname, "../server/uploads", filename);

      // Buat gambar dummy sederhana
      const sharp = require("sharp");
      await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 100, g: 150, b: 200 },
        },
      })
        .jpeg()
        .toFile(filepath);

      // Kirim notifikasi ke client
      io.emit("photoCaptured", {
        filename,
        path: `/uploads/${filename}`,
        timestamp,
      });

      return res.json({
        success: true,
        filename,
        path: `/uploads/${filename}`,
        timestamp,
        simulated: true,
      });
    }

    // Mode kamera nyata
    cameraWrapper.captureImage((result) => {
      if (result.success) {
        // Kirim notifikasi ke client
        io.emit("photoCaptured", {
          filename: result.filename,
          path: result.url,
          timestamp: result.timestamp,
        });

        res.json({
          success: true,
          filename: result.filename,
          path: result.url,
          timestamp: result.timestamp,
          simulated: false,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan server",
    });
  }
});

app.get("/api/photos", async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, "../server/uploads");
    const files = await fs.readdir(uploadsDir);

    const photos = files
      .filter((file) => file.endsWith(".jpg") || file.endsWith(".jpeg"))
      .map((file) => ({
        filename: file,
        path: `/uploads/${file}`,
        timestamp: file.split("_")[1]?.replace(".jpg", "") || Date.now(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({ photos });
  } catch (error) {
    console.error("Error mengambil daftar foto:", error);
    res.json({ photos: [] });
  }
});

app.delete("/api/photos/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, "../server/uploads", filename);

    await fs.unlink(filepath);

    io.emit("photoDeleted", { filename });

    res.json({ success: true });
  } catch (error) {
    console.error("Error menghapus foto:", error);
    res.status(500).json({
      success: false,
      error: "Gagal menghapus foto",
    });
  }
});

// Preview endpoints
app.get("/api/preview", (req, res) => {
  if (!cameraInitialized || !cameraWrapper) {
    return res.json({
      success: false,
      error: "Kamera tidak terhubung",
    });
  }

  cameraWrapper.capturePreviewFrame((result) => {
    res.json(result);
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client terhubung:", socket.id);

  // Detect camera
  socket.on("detect-camera", () => {
    if (cameraWrapper) {
      cameraWrapper.detectCamera((result) => {
        socket.emit("camera-detected", result);
      });
    } else {
      socket.emit("camera-detected", {
        success: false,
        cameras: [],
        count: 0,
      });
    }
  });

  // Start live preview
  socket.on("start-preview", (data) => {
    if (!cameraInitialized || !cameraWrapper) {
      socket.emit("preview-started", {
        success: false,
        error: "Kamera tidak terhubung",
      });
      return;
    }

    // Use MJPEG server if available, fallback to frame-by-frame
    if (mjpegServer && !mjpegServer.isActive()) {
      const result = mjpegServer.startStream();
      if (result.success) {
        socket.emit("mjpeg-stream-started", {
          success: true,
          streamUrl: result.streamUrl,
          port: result.port,
        });
      } else {
        console.error("MJPEG stream failed to start:", result.error);
        // Fallback to frame-by-frame preview
        const fps = data?.fps || 2;
        const fallbackResult = cameraWrapper.startPreviewStream(socket, fps);
        socket.emit("preview-started", fallbackResult);
      }
    } else if (mjpegServer && mjpegServer.isActive()) {
      socket.emit("mjpeg-stream-started", {
        success: true,
        streamUrl: mjpegServer.getStreamUrl(),
        active: true,
      });
    } else {
      // Fallback to frame-by-frame preview
      const fps = data?.fps || 2;
      const result = cameraWrapper.startPreviewStream(socket, fps);
      if (result.success) {
        socket.emit("preview-started", result);
      } else {
        socket.emit("preview-error", {
          success: false,
          error: result.error || "Failed to start preview",
        });
      }
    }
  });

  // Stop live preview
  socket.on("stop-preview", () => {
    if (mjpegServer && mjpegServer.isActive()) {
      const result = mjpegServer.stopStream();
      socket.emit("mjpeg-stream-stopped", result);
    }

    if (cameraWrapper) {
      const result = cameraWrapper.stopPreviewStream();
      socket.emit("preview-stopped", result);
    }
  });

  // Capture photo
  socket.on("capture-photo", async () => {
    console.log("📸 Capture photo requested");

    let streamWasActive = false;

    // ✅ 1️⃣ Stop MJPEG stream jika sedang aktif
    if (mjpegServer && mjpegServer.isActive()) {
      streamWasActive = true;
      console.log("⏹️ Stopping MJPEG stream for photo capture...");
      mjpegServer.stopStream();
      socket.emit("mjpeg-stream-stopped", { success: true });
    }

    // ✅ 2️⃣ Tunggu proses stream benar-benar mati (USB released)
    const waitUntilStreamStopped = async () => {
      const timeout = 3000; // bisa ubah ke 2000 kalau cepat
      console.log(`🕐 Waiting ${timeout}ms for gphoto2 stream to stop...`);
      await new Promise((resolve) => setTimeout(resolve, timeout));
    };

    // Jalankan proses async terpisah
    (async () => {
      await waitUntilStreamStopped();

      // ✅ 3️⃣ Ambil foto
      cameraWrapper.captureImage(async (result) => {
        if (!result.success) {
          console.error("❌ Error capturing photo:", result.error || result);
          socket.emit("photo-captured", result);
          return;
        }

        console.log("✅ Photo captured successfully:", result.filename);

        // Kirim notifikasi ke semua client
        socket.emit("photo-captured", result);
        io.emit("photoCaptured", {
          filename: result.filename,
          path: result.url,
          timestamp: result.timestamp,
        });

        // ✅ 4️⃣ Restart preview stream setelah capture
        // if (streamWasActive && mjpegServer && !mjpegServer.isActive()) {
        //   console.log("♻️ Restarting MJPEG stream after photo capture...");
        //   await new Promise((resolve) => setTimeout(resolve, 1000)); // tunggu 1 detik sebelum restart

        //   const restartResult = mjpegServer.startStream();
        //   if (restartResult.success) {
        //     socket.emit("mjpeg-stream-started", {
        //       success: true,
        //       streamUrl: restartResult.streamUrl,
        //       port: restartResult.port,
        //     });
        //     console.log("🎥 MJPEG stream restarted successfully.");
        //   } else {
        //     console.error(
        //       "⚠️ Failed to restart MJPEG stream:",
        //       restartResult.error
        //     );
        //   }
        // }
      });
    })();
  });

  socket.on("disconnect", () => {
    console.log("Client terputus:", socket.id);
    if (cameraWrapper) {
      cameraWrapper.stopPreviewStream();
    }
    if (mjpegServer && mjpegServer.isActive()) {
      mjpegServer.stopStream();
    }
  });
});

// Initialize server
const startServer = async () => {
  await ensureUploadsFolder();
  await initializeCamera();

  server.listen(PORT, () => {
    console.log(`Server berjalan pada http://localhost:${PORT}`);
    console.log(`Mode: ${cameraInitialized ? "Kamera Nyata" : "Simulasi"}`);
  });
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Menutup kamera...");
  if (cameraWrapper) {
    cameraWrapper.stopPreviewStream();
  }
  if (mjpegServer && mjpegServer.isActive()) {
    mjpegServer.stopStream();
  }
  if (mjpegServer) {
    await mjpegServer.stop();
  }
  process.exit(0);
});

startServer().catch(console.error);
