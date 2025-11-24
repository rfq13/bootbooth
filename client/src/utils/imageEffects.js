// imageEffects.js - Frontend image effects manager untuk optimasi spek terbatas
// Menggunakan Web Workers untuk non-blocking processing

import {
  PERFORMANCE_CONFIG,
  PerformanceMonitor,
} from "../config/performance.js";

class ImageEffectsManager {
  constructor() {
    this.worker = null;
    this.workerReady = false;
    this.processingQueue = [];
    this.currentProcessing = null;
    this.cache = new Map(); // Cache untuk hasil yang sudah diproses
    this.maxCacheSize = PERFORMANCE_CONFIG.imageProcessing.maxCacheSize; // Limit cache untuk memory management
  }

  // Initialize Web Worker dengan lazy loading
  async initWorker() {
    if (this.workerReady) return true;

    try {
      // Create worker dynamically untuk code splitting
      const workerCode = await import(
        "../workers/imageEffectsWorker.js?worker"
      );
      this.worker = new Worker(
        new URL("../workers/imageEffectsWorker.js", import.meta.url),
        {
          type: "module",
        }
      );

      this.worker.onmessage = (e) => {
        this.handleWorkerMessage(e);
      };

      this.worker.onerror = (error) => {
        console.error("Worker error:", error);
        this.workerReady = false;
      };

      this.workerReady = true;
      console.log("🎨 ImageEffectsWorker initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize worker:", error);
      // Fallback ke main thread processing
      return false;
    }
  }

  // Handle pesan dari worker
  handleWorkerMessage(e) {
    const { success, type, result, processingTime, error } = e.data;

    if (this.currentProcessing) {
      const { resolve, reject, cacheKey } = this.currentProcessing;

      if (success && result) {
        // Cache hasil untuk penggunaan berikutnya
        this.addToCache(cacheKey, result);

        // Convert array kembali ke Uint8ClampedArray
        const processedData = new Uint8ClampedArray(result.data);
        const imageData = new ImageData(
          processedData,
          result.width,
          result.height
        );

        console.log(`✅ ${type} effect processed in ${processingTime}ms`);
        resolve(imageData);
      } else {
        console.error(`❌ ${type} effect failed:`, error);
        reject(new Error(error || "Unknown error"));
      }

      this.currentProcessing = null;
    }

    // Process next in queue
    this.processQueue();
  }

  // Add ke cache dengan LRU eviction
  addToCache(key, data) {
    if (this.cache.size >= this.maxCacheSize) {
      // Hapus entry paling lama (first entry)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, data);
  }

  // Generate cache key
  generateCacheKey(type, imageData, params) {
    // Simple hash berdasarkan type, ukuran gambar, dan params
    const { width, height } = imageData;
    const paramString = JSON.stringify(params);
    return `${type}_${width}x${height}_${paramString}`;
  }

  // Apply effect dengan Web Worker atau fallback ke main thread
  async applyEffect(type, imageData, params = {}) {
    const cacheKey = this.generateCacheKey(type, imageData, params);

    // Check cache dulu
    if (this.cache.has(cacheKey)) {
      console.log(`🎯 Using cached ${type} effect`);
      const cachedData = this.cache.get(cacheKey);
      const processedData = new Uint8ClampedArray(cachedData.data);
      return new ImageData(processedData, cachedData.width, cachedData.height);
    }

    // Downsize untuk preview jika gambar terlalu besar (increased quality)
    const maxPreviewSize =
      PERFORMANCE_CONFIG.imageProcessing.maxPreviewSize || 1920;
    let processedImageData = imageData;

    if (imageData.width > maxPreviewSize || imageData.height > maxPreviewSize) {
      processedImageData = this.downscaleImage(imageData, maxPreviewSize);
      console.log(
        `📏 Image downsized to ${processedImageData.width}x${processedImageData.height} for processing`
      );
    }

    // Try worker processing
    if (await this.initWorker()) {
      return new Promise((resolve, reject) => {
        this.currentProcessing = { resolve, reject, cacheKey };

        this.worker.postMessage({
          type,
          imageData: {
            data: Array.from(processedImageData.data), // Convert ke array untuk transfer
            width: processedImageData.width,
            height: processedImageData.height,
          },
          params,
        });
      });
    } else {
      // Fallback ke main thread processing
      console.log(`⚠️ Falling back to main thread for ${type} effect`);
      return this.applyEffectMainThread(type, processedImageData, params);
    }
  }

  // Main thread fallback processing
  async applyEffectMainThread(type, imageData, params) {
    const startTime = performance.now();

    // Import effect functions dynamically
    const {
      applyFishEye,
      applyGrayscale,
      applySepia,
      applyInvert,
      applyVignette,
      applyBlur,
      applyPixelate,
    } = await import("../workers/imageEffectsWorker.js");

    let result;
    switch (type) {
      case "fisheye":
        result = applyFishEye(imageData, params.intensity || 0.5);
        break;
      case "grayscale":
        result = applyGrayscale(imageData, params.intensity || 1.0);
        break;
      case "sepia":
        result = applySepia(imageData, params.intensity || 1.0);
        break;
      case "invert":
        result = applyInvert(imageData, params.intensity || 1.0);
        break;
      case "vignette":
        result = applyVignette(imageData, params.intensity || 0.5);
        break;
      case "blur":
        result = applyBlur(imageData, params.intensity || 0.5);
        break;
      case "pixelate":
        result = applyPixelate(imageData, params.intensity || 0.5);
        break;
      default:
        throw new Error(`Unknown effect type: ${type}`);
    }

    const processingTime = performance.now() - startTime;
    console.log(
      `✅ ${type} effect processed in main thread in ${Math.round(
        processingTime
      )}ms`
    );

    return result;
  }

  // Downscale image untuk preview processing
  downscaleImage(imageData, maxSize) {
    const { width, height, data } = imageData;

    const scale = Math.min(maxSize / width, maxSize / height, 1);
    if (scale === 1) return imageData;

    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);

    // Create temporary canvas untuk scaling
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Put original image data
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCtx.putImageData(imageData, 0, 0);

    // Scale down
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);

    return ctx.getImageData(0, 0, newWidth, newHeight);
  }

  // Process queue untuk worker
  processQueue() {
    if (this.processingQueue.length === 0 || this.currentProcessing) return;

    const nextJob = this.processingQueue.shift();
    // Process next job will be handled by the worker message handler
  }

  // Cleanup resources
  cleanup() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.workerReady = false;
    this.currentProcessing = null;
    this.processingQueue = [];
    this.cache.clear();
  }

  // Get processing statistics
  getStats() {
    return {
      workerReady: this.workerReady,
      queueLength: this.processingQueue.length,
      cacheSize: this.cache.size,
      currentProcessing: !!this.currentProcessing,
    };
  }
}

// Singleton instance
const imageEffectsManager = new ImageEffectsManager();

// Export untuk digunakan di components
export default imageEffectsManager;

// Export class untuk testing
export { ImageEffectsManager };

// Utility functions untuk canvas operations
export const CanvasUtils = {
  // Create canvas dari image data
  createCanvasFromImageData(imageData) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  },

  // Convert canvas ke ImageData
  canvasToImageData(canvas) {
    const ctx = canvas.getContext("2d");
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  },

  // Resize canvas dengan maintain aspect ratio
  resizeCanvas(canvas, maxWidth, maxHeight) {
    const { width, height } = canvas;
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);

    if (scale === 1) return canvas;

    const newCanvas = document.createElement("canvas");
    const newCtx = newCanvas.getContext("2d");
    newCanvas.width = Math.round(width * scale);
    newCanvas.height = Math.round(height * scale);

    newCtx.imageSmoothingEnabled = true;
    newCtx.imageSmoothingQuality = "high";
    newCtx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);

    return newCanvas;
  },

  // Convert ImageData to blob
  imageDataToBlob(imageData, mimeType = "image/jpeg", quality = 0.9) {
    return new Promise((resolve) => {
      const canvas = this.createCanvasFromImageData(imageData);
      canvas.toBlob(resolve, mimeType, quality);
    });
  },

  // Optimize image untuk upload
  async optimizeForUpload(imageData, maxSize = 1920, quality = 0.85) {
    // Downsize jika perlu
    const canvas = this.createCanvasFromImageData(imageData);
    const optimizedCanvas = this.resizeCanvas(canvas, maxSize, maxSize);

    // Convert ke blob dengan compression
    const blob = await new Promise((resolve) => {
      optimizedCanvas.toBlob(resolve, "image/jpeg", quality);
    });

    return blob;
  },
};

// Local performance monitoring utilities (namespace untuk避免冲突)
export const ImageEffectsPerformance = {
  timings: new Map(),

  startTiming(label) {
    this.timings.set(label, performance.now());
  },

  endTiming(label) {
    const startTime = this.timings.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`⏱️ ${label}: ${Math.round(duration)}ms`);
      this.timings.delete(label);
      return duration;
    }
    return 0;
  },

  async measureAsync(label, asyncFn) {
    this.startTiming(label);
    const result = await asyncFn();
    this.endTiming(label);
    return result;
  },
};
