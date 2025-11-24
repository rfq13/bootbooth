// Face Masking Utility dengan BodyPix Person Segmentation
import * as bodySegmentation from "@tensorflow-models/body-segmentation";
import "@tensorflow/tfjs-backend-webgl";
let faceWorker = null;
function ensureFaceWorker() {
  if (faceWorker) return faceWorker;
  try {
    faceWorker = new Worker(new URL("../workers/faceDetectionWorker.js", import.meta.url), { type: "module" });
  } catch (_) {}
  return faceWorker;
}

export class FaceMaskingUtils {
  constructor() {
    this.segmenter = null;
    this.isModelLoaded = false;
    this.isProcessing = false;
    this.faceWorkerReady = false;
  }

  // Load BodyPix model untuk person segmentation
  async loadModel() {
    if (this.isModelLoaded) return true;

    try {
      // Load BodyPix model (ringan ~3MB, optimal untuk T620)
      const model = bodySegmentation.SupportedModels.BodyPix;
      this.segmenter = await bodySegmentation.createSegmenter(model, {
        architecture: "MobileNetV1",
        outputStride: 16,
        multiplier: 0.5, // Low spec optimization
        quantBytes: 2,
      });

      this.isModelLoaded = true;
      console.log("✅ BodyPix model loaded successfully");
      return true;
    } catch (error) {
      console.error("Model load failed:", error);
      throw error;
    }
  }

  // Segment person dari background dengan improved quality
  async segmentPerson(imageDataUrl, options = {}) {
    if (!this.isModelLoaded) {
      await this.loadModel();
    }

    if (this.isProcessing) {
      throw new Error("Person segmentation already in progress");
    }

    this.isProcessing = true;

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageDataUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // PENTING: Gunakan config yang lebih agresif untuk better separation
      const segmentation = await this.segmenter.segmentPeople(img, {
        multiSegmentation: false,
        segmentBodyParts: false,
        flipHorizontal: false,
        // TAMBAHAN: Threshold untuk better separation
        scoreThreshold: options.scoreThreshold || 0.5, // Adjust 0.3-0.7
        nmsRadius: options.nmsRadius || 20,
        enableDenoising: true,
      });

      if (!segmentation || segmentation.length === 0) {
        throw new Error("Tidak dapat mendeteksi person");
      }

      // Extract mask data
      const mask = segmentation[0].mask;
      const maskData = {
        mask: mask.data,
        width: mask.width,
        height: mask.height,
        original: img,
      };

      // POST-PROCESSING: Clean up mask dengan morphological operations
      const cleanedMask = this.cleanMask(maskData, {
        erode: options.erode || 2, // Kurangi tepi
        dilate: options.dilate || 3, // Kembalikan dengan smooth
      });

      const result = {
        mask: cleanedMask,
        width: mask.width,
        height: mask.height,
        original: img,
      };

      console.log("✅ Person segmented successfully with morphological ops");
      return result;
    } catch (error) {
      console.error("Segmentation failed:", error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  async initFaceWorker() {
    if (this.faceWorkerReady) return true;
    const w = ensureFaceWorker();
    if (!w) return false;
    return new Promise((resolve) => {
      const onMsg = (e) => {
        if (e.data?.type === "INITIALIZED" && e.data?.success) {
          this.faceWorkerReady = true;
          w.removeEventListener("message", onMsg);
          resolve(true);
        }
      };
      w.addEventListener("message", onMsg);
      w.postMessage({ type: "INITIALIZE" });
    });
  }

  async segmentFaceWithWorker(imageDataUrl, options = {}) {
    await this.initFaceWorker();
    const w = ensureFaceWorker();
    if (!w) throw new Error("Face worker not available");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageDataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const faceResult = await new Promise((resolve, reject) => {
      const onMsg = (e) => {
        const d = e.data;
        if (d?.type === "FACE_DETECTED") {
          w.removeEventListener("message", onMsg);
          resolve(d.result);
        } else if (d?.type === "FACE_DETECTION_FAILED") {
          w.removeEventListener("message", onMsg);
          reject(new Error(d.error || "Face detection failed"));
        }
      };
      w.addEventListener("message", onMsg);
      w.postMessage({
        type: "DETECT_FACE",
        data: {
          imageData,
          expansion: options.expansion || 15,
          feather: options.feather || 5,
        },
      });
    });
    const faceMask = this.createFaceMaskFromContour(
      faceResult.faceContour,
      faceResult.imageWidth,
      faceResult.imageHeight,
      {
        feather: options.feather || 3,
      }
    );
    return {
      mask: faceMask,
      width: faceResult.imageWidth,
      height: faceResult.imageHeight,
      original: img,
    };
  }

  createFaceMaskFromContour(contour, width, height, options = {}) {
    if (!contour || !contour.length) return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    const first = contour[0];
    ctx.moveTo(first.x * width, first.y * height);
    for (let i = 1; i < contour.length; i++) {
      const p = contour[i];
      ctx.lineTo(p.x * width, p.y * height);
    }
    ctx.closePath();
    ctx.fillStyle = "#fff";
    ctx.fill();
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const a = imgData.data[i * 4 + 3];
      data[i] = a > 0 ? 1 : 0;
    }
    const cleaned = this.cleanMask({ mask: data, width, height }, {
      erode: 0,
      dilate: options.feather || 3,
    });
    return cleaned;
  }

  // Cleanup mask untuk hasil lebih bersih dengan morphological operations
  cleanMask(maskData, options = {}) {
    const { mask, width, height } = maskData;
    const data = new Uint8Array(mask);

    // Simple erosion untuk buang noise di edge
    if (options.erode > 0) {
      for (let i = 0; i < options.erode; i++) {
        this.erosion(data, width, height);
      }
    }

    // Dilation untuk smooth edge
    if (options.dilate > 0) {
      for (let i = 0; i < options.dilate; i++) {
        this.dilation(data, width, height);
      }
    }

    return data;
  }

  // Morphological erosion untuk remove noise
  erosion(data, width, height) {
    const temp = new Uint8Array(data);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        // If any neighbor is 0, set to 0
        if (
          temp[i - 1] === 0 ||
          temp[i + 1] === 0 ||
          temp[i - width] === 0 ||
          temp[i + width] === 0
        ) {
          data[i] = 0;
        }
      }
    }
  }

  // Morphological dilation untuk smooth edges
  dilation(data, width, height) {
    const temp = new Uint8Array(data);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        // If any neighbor is 1, set to 1
        if (
          temp[i - 1] === 1 ||
          temp[i + 1] === 1 ||
          temp[i - width] === 1 ||
          temp[i + width] === 1
        ) {
          data[i] = 1;
        }
      }
    }
  }

  // Extract person dari original image menggunakan mask dengan feathering
  extractPersonLayer(maskData, options = {}) {
    const { mask, width: maskWidth, height: maskHeight, original } = maskData;

    // VALIDASI: Pastikan width dan height adalah integer yang valid
    const canvasWidth = Math.floor(Math.max(1, maskWidth || 1));
    const canvasHeight = Math.floor(Math.max(1, maskHeight || 1));

    console.log("🔍 ExtractPersonLayer Debug:", {
      maskWidth,
      maskHeight,
      canvasWidth,
      canvasHeight,
      maskLength: mask?.length,
      originalImageSize: `${original?.width}x${original?.height}`,
    });

    // Create high-res canvas dengan ukuran yang valid
    const personCanvas = document.createElement("canvas");
    personCanvas.width = canvasWidth;
    personCanvas.height = canvasHeight;
    const ctx = personCanvas.getContext("2d");

    // Draw original dengan ukuran yang valid
    ctx.drawImage(original, 0, 0, canvasWidth, canvasHeight);

    // Get pixels dengan parameter yang valid
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const pixels = imageData.data;

    // Apply mask dengan feathering untuk smooth edge
    const feather = options.feather || 3;

    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const i = y * canvasWidth + x;
        const pixelIndex = i * 4;

        // Pastikan mask index valid
        if (i < mask.length) {
          if (mask[i] === 0) {
            // Background - set fully transparent
            pixels[pixelIndex + 3] = 0;
          } else {
            // Foreground - check edge untuk feathering
            let edgeDistance = this.getEdgeDistance(
              mask,
              x,
              y,
              canvasWidth,
              canvasHeight
            );

            if (edgeDistance < feather) {
              // Feather edge
              const alpha = (edgeDistance / feather) * 255;
              pixels[pixelIndex + 3] = Math.min(pixels[pixelIndex + 3], alpha);
            }
          }
        } else {
          // Jika mask index tidak valid, treat as background
          pixels[pixelIndex + 3] = 0;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return personCanvas;
  }

  // Calculate distance to nearest background pixel untuk feathering
  getEdgeDistance(mask, x, y, width, height) {
    let minDist = Infinity;
    const checkRadius = 5;

    for (let dy = -checkRadius; dy <= checkRadius; dy++) {
      for (let dx = -checkRadius; dx <= checkRadius; dx++) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const i = ny * width + nx;
          if (mask[i] === 0) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            minDist = Math.min(minDist, dist);
          }
        }
      }
    }

    return minDist;
  }

  // Create 4-layer composite untuk Vogue effect
  createVogueComposite(originalImage, maskData, template, options = {}) {
    const W = 900;
    const H = 1350;

    // Create final canvas
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // ========== LAYER 0: Background Color ==========
    ctx.fillStyle = template.backgroundColor || "#1a1a1a";
    ctx.fillRect(0, 0, W, H);

    // ========== LAYER 1: Text "VOGUE" (behind face) ==========
    const vogueLogo = template.text?.find((t) => t.content === "VOGUE");
    if (vogueLogo) {
      ctx.fillStyle = vogueLogo.color || "#fff";
      ctx.font = `${vogueLogo.size || 180}px ${
        vogueLogo.font || "Playfair Display"
      }`;
      ctx.textBaseline = "top";
      ctx.fillText(
        vogueLogo.content,
        vogueLogo.position?.x || 120,
        vogueLogo.position?.y || 140
      );
    }

    // ========== LAYER 2: Person (TRANSPARANT BACKGROUND!) ==========
    if (originalImage && maskData) {
      try {
        // Extract person dengan background REMOVED
        const personLayer = this.extractPersonLayer(maskData, {
          feather: options.feather || 3, // Smooth edge
        });

        // Calculate position to center
        const ratio = Math.min(W / personLayer.width, H / personLayer.height);
        const w = personLayer.width * ratio;
        const h = personLayer.height * ratio;
        const x = (W - w) / 2;
        const y = (H - h) / 2;

        // PENTING: Set composite mode untuk transparency
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(personLayer, x, y, w, h);
        ctx.restore();
      } catch (error) {
        console.error("Failed to render person layer:", error);
        // Fallback: draw original image without segmentation
        const ratio = Math.min(
          W / originalImage.width,
          H / originalImage.height
        );
        const w = originalImage.width * ratio;
        const h = originalImage.height * ratio;
        const x = (W - w) / 2;
        const y = (H - h) / 2;
        ctx.drawImage(originalImage, x, y, w, h);
      }
    }

    // ========== LAYER 3: Subtitle Text (on top) ==========
    const subtitle = template.text?.find((t) => t.content !== "VOGUE");
    if (subtitle) {
      ctx.fillStyle = subtitle.color || "#f0eae4";
      ctx.font = `${subtitle.size || 48}px ${subtitle.font || "Cormorant"}`;
      ctx.textBaseline = "top";
      ctx.fillText(
        subtitle.content,
        subtitle.position?.x || 120,
        subtitle.position?.y || 360
      );
    }

    return canvas;
  }

  mergeMasks(base, refine) {
    if (!base) return refine;
    if (!refine) return base;
    const w = Math.min(base.length, refine.length);
    const out = new Uint8Array(w);
    for (let i = 0; i < w; i++) {
      out[i] = base[i] || refine[i] ? 1 : 0;
    }
    return out;
  }

  // Cleanup resources
  cleanup() {
    if (this.segmenter) {
      this.segmenter.dispose();
      this.segmenter = null;
    }
    this.isModelLoaded = false;
    this.isProcessing = false;
    if (faceWorker) {
      faceWorker.terminate();
      faceWorker = null;
      this.faceWorkerReady = false;
    }
  }
}

// Singleton instance
export const faceMaskingUtils = new FaceMaskingUtils();
