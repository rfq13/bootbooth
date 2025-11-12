const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

class GPhotoWrapper {
  constructor() {
    this.outputDir = path.join(__dirname, "../server/uploads");
    this.previewDir = path.join(__dirname, "../server/previews");
    this.isPreviewActive = false;
    this.previewInterval = null;

    // Create directories
    [this.outputDir, this.previewDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  _parseAutoDetect(output) {
    const lines = output.split("\n").filter((line) => line.trim());
    const cameras = [];

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(.+?)\s{2,}(.+)$/);
      if (match) {
        cameras.push({
          model: match[1].trim(),
          port: match[2].trim(),
        });
      }
    }

    return cameras;
  }

  detectCamera(callback) {
    exec("gphoto2 --auto-detect", (error, stdout, stderr) => {
      if (error) {
        return callback({
          success: false,
          error: error.message,
          cameras: [],
        });
      }

      const cameras = this._parseAutoDetect(stdout);

      callback({
        success: true,
        cameras: cameras,
        count: cameras.length,
      });
    });
  }

  // Capture single preview frame
  capturePreviewFrame(callback) {
    const timestamp = Date.now();
    const filename = `preview_${timestamp}.jpg`;
    const filepath = path.join(this.previewDir, filename);

    exec(
      `gphoto2 --capture-preview --force-overwrite --filename="${filepath}"`,
      { timeout: 5000 }, // 5 second timeout
      (error, stdout, stderr) => {
        // Handle stderr yang bukan error (pesan normal dari gphoto2)
        if (stderr && stderr.includes("Capturing preview frame")) {
          // Ini adalah pesan normal, bukan error
          console.log("GPhoto2 preview message:", stderr.trim());
        }

        if (error) {
          return callback({
            success: false,
            error: error.message,
          });
        }

        // Read file as base64
        if (fs.existsSync(filepath)) {
          const imageBuffer = fs.readFileSync(filepath);
          const base64Image = imageBuffer.toString("base64");

          // Delete old preview files (keep only last 3)
          this._cleanupPreviews(3);

          callback({
            success: true,
            image: `data:image/jpeg;base64,${base64Image}`,
            timestamp: timestamp,
          });
        } else {
          callback({
            success: false,
            error: "Preview file not created",
          });
        }
      }
    );
  }

  // Start continuous preview stream
  startPreviewStream(socket, fps = 2) {
    if (this.isPreviewActive) {
      return { success: false, error: "Preview already active" };
    }

    this.isPreviewActive = true;
    const intervalMs = 1000 / fps;

    this.previewInterval = setInterval(() => {
      if (!this.isPreviewActive) {
        clearInterval(this.previewInterval);
        return;
      }

      this.capturePreviewFrame((result) => {
        if (result.success) {
          socket.emit("preview-frame", result);
        } else {
          socket.emit("preview-error", result);
        }
      });
    }, intervalMs);

    return { success: true, fps: fps };
  }

  // Stop preview stream
  stopPreviewStream() {
    this.isPreviewActive = false;
    if (this.previewInterval) {
      clearInterval(this.previewInterval);
      this.previewInterval = null;
    }
    return { success: true };
  }

  // Cleanup old preview files
  _cleanupPreviews(keepLast = 3) {
    try {
      const files = fs
        .readdirSync(this.previewDir)
        .filter((f) => f.startsWith("preview_"))
        .map((f) => ({
          name: f,
          path: path.join(this.previewDir, f),
          time: fs.statSync(path.join(this.previewDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time);

      // Delete all except the last N files
      files.slice(keepLast).forEach((file) => {
        fs.unlinkSync(file.path);
      });
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  }

  // Capture final photo
  captureImage(callback) {
    const timestamp = Date.now();
    const filename = `photo_${timestamp}.jpg`;
    const filepath = path.join(this.outputDir, filename);
    const command = `gphoto2 --capture-image-and-download --filename="${filepath}" --skip-existing`;
    console.log({ command });

    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      // Handle stderr yang bukan error (pesan normal dari gphoto2)
      if (stderr && !stderr.includes("ERROR") && !stderr.includes("Failed")) {
        console.log("GPhoto2 capture message:", stderr.trim());
      }

      if (error) {
        return callback({
          success: false,
          error: error.message,
        });
      }

      // Find created files
      const allFiles = fs.readdirSync(this.outputDir);
      const matchingFiles = allFiles.filter(
        (f) =>
          f.startsWith(`photo_${timestamp}`) &&
          (f.endsWith(".jpg") || f.endsWith(".JPG"))
      );

      if (matchingFiles.length > 0) {
        const actualFilepath = path.join(this.outputDir, matchingFiles[0]);
        callback({
          success: true,
          filepath: actualFilepath,
          filename: matchingFiles[0],
          url: `/uploads/${matchingFiles[0]}`,
          size: fs.statSync(actualFilepath).size,
          timestamp: timestamp,
        });
      } else {
        callback({
          success: false,
          error: "Photo file not found",
        });
      }
    });
  }
}

module.exports = GPhotoWrapper;
