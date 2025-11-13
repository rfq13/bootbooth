const express = require("express");
const { spawn } = require("child_process");

class MJPEGServer {
  constructor(port = 8080) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.streamProcess = null;
    this.clients = new Set();
    this.isStreaming = false;

    this.setupRoutes();
  }

  setupRoutes() {
    // CORS
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      next();
    });

    // Endpoint utama untuk MJPEG stream
    this.app.get("/camera", (req, res) => {
      res.writeHead(200, {
        "Content-Type": "multipart/x-mixed-replace; boundary=--frame",
        "Cache-Control": "no-cache",
        Connection: "close",
        Pragma: "no-cache",
        "Access-Control-Allow-Origin": "*",
      });

      this.clients.add(res);
      res.write("--frame\r\n");

      req.on("close", () => {
        this.clients.delete(res);
      });
    });

    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        streaming: this.isStreaming,
        clients: this.clients.size,
      });
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        return reject(new Error("Server sudah berjalan"));
      }

      this.server = this.app.listen(this.port, () => {
        console.log(`✅ MJPEG server berjalan di port ${this.port}`);
        resolve(this.port);
      });

      this.server.on("error", reject);
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.clients.forEach((c) => {
          try {
            c.end();
          } catch {}
        });
        this.clients.clear();

        this.stopStream();

        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  startStream() {
    if (this.isStreaming) {
      return { success: false, error: "Stream sudah aktif" };
    }

    try {
      // Jalankan gphoto2 langsung (tanpa ffmpeg)
      this.streamProcess = spawn("gphoto2", ["--stdout", "--capture-movie"]);

      let frameBuffer = Buffer.alloc(0);

      this.streamProcess.stdout.on("data", (data) => {
        frameBuffer = Buffer.concat([frameBuffer, data]);

        const startMarker = Buffer.from([0xff, 0xd8]); // JPEG start
        const endMarker = Buffer.from([0xff, 0xd9]); // JPEG end

        let startIndex = frameBuffer.indexOf(startMarker);
        while (startIndex !== -1) {
          const endIndex = frameBuffer.indexOf(endMarker, startIndex);
          if (endIndex !== -1) {
            const frame = frameBuffer.slice(startIndex, endIndex + 2);
            this.sendFrameToClients(frame);
            frameBuffer = frameBuffer.slice(endIndex + 2);
            startIndex = frameBuffer.indexOf(startMarker);
          } else break;
        }

        if (frameBuffer.length > 1024 * 1024)
          frameBuffer = frameBuffer.slice(-1024 * 512);
      });

      this.streamProcess.stderr.on("data", (data) => {
        const msg = data.toString();
        if (!msg.includes("Capturing preview frames as movie")) {
          console.error("⚠️ GPhoto2 error:", msg);
        }
      });

      this.streamProcess.on("close", (code) => {
        console.log(`📸 GPhoto2 stopped (code ${code})`);
        this.stopStream();
      });

      this.isStreaming = true;
      console.log("🎥 Streaming dimulai...");
      return { success: true, url: this.getStreamUrl() };
    } catch (error) {
      console.error("Gagal memulai stream:", error);
      return { success: false, error: error.message };
    }
  }

  stopStream() {
    if (!this.isStreaming) return;

    console.log("🛑 Menghentikan stream...");
    this.isStreaming = false;

    if (this.streamProcess) {
      try {
        this.streamProcess.kill("SIGINT");
      } catch {}
      this.streamProcess = null;
    }

    this.clients.forEach((c) => {
      try {
        c.end();
      } catch {}
    });
    this.clients.clear();
  }

  sendFrameToClients(frame) {
    const header = Buffer.from(
      `Content-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`
    );
    const footer = Buffer.from("\r\n--frame\r\n");

    this.clients.forEach((client) => {
      try {
        client.write(header);
        client.write(frame);
        client.write(footer);
      } catch {
        this.clients.delete(client);
      }
    });
  }

  isActive() {
    return this.isStreaming;
  }

  getStreamUrl() {
    return `http://localhost:${this.port}/camera`;
  }

  getClientCount() {
    return this.clients.size;
  }
}

module.exports = MJPEGServer;
