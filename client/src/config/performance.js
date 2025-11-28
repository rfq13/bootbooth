// Konfigurasi performa untuk optimasi photobooth
export const PERFORMANCE_CONFIG = {
  // Device detection
  isLowSpecDevice: () => {
    const memory = navigator.deviceMemory || 4;
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    const isSlowConnection =
      connection &&
      (connection.effectiveType === "slow-2g" ||
        connection.effectiveType === "2g");

    return memory <= 4 || hardwareConcurrency <= 2 || isSlowConnection;
  },

  // Image processing configuration
  imageProcessing: {
    // Maximum image size for processing (width x height)
    maxPreviewSize: 1920,
    maxFinalSize: 3000,

    // JPEG quality for different operations
    previewQuality: 0.8,
    finalQuality: 0.9,
    uploadQuality: 0.85,

    // Web Worker configuration
    workerTimeout: 30000, // 30 seconds
    maxConcurrentWorkers: 2,

    // Cache configuration
    maxCacheSize: 50, // Maximum cached effects
    cacheExpiration: 300000, // 5 minutes

    // Debounce configuration
    renderDebounceMs: 32, // ~30fps untuk low-spec
    effectDebounceMs: 100,
  },

  // Canvas optimization
  canvas: {
    // Use OffscreenCanvas if available
    useOffscreenCanvas: typeof OffscreenCanvas !== "undefined",

    // Anti-aliasing settings
    antialias: true,

    // Pixel ratio handling
    pixelRatio: window.devicePixelRatio || 1,

    // Maximum canvas size for memory safety
    maxCanvasSize: 4096,
  },

  // Memory management
  memory: {
    // Garbage collection hints
    gcInterval: 60000, // 1 minute

    // Memory cleanup thresholds
    cleanupThreshold: 0.8, // 80% of available memory

    // Maximum retained images
    maxRetainedImages: 3,

    // Image cleanup delay
    cleanupDelay: 5000, // 5 seconds
  },

  // Effect processing
  effects: {
    // Enable/disable effects based on device capabilities
    enabledEffects: [
      "none",
      "grayscale",
      "sepia",
      "invert",
      "vignette",
      "blur",
      "pixelate",
      "fisheye",
    ],

    // Effect-specific optimizations
    fisheye: {
      quality: "medium", // 'low', 'medium', 'high'
      samples: 16, // Number of samples for distortion calculation
    },

    blur: {
      radius: { min: 1, max: 10, default: 3 },
    },

    pixelate: {
      pixelSize: { min: 2, max: 20, default: 8 },
    },
  },

  // Lazy loading configuration
  lazyLoading: {
    // Enable lazy loading for components
    enabled: true,

    // Preload nearby components
    preloadDistance: 1,

    // Loading timeout
    loadingTimeout: 10000,

    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000,
  },

  // Network optimization
  network: {
    // Enable request caching
    cacheEnabled: true,

    // Request timeout
    timeout: 15000,

    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000,

    // Batch requests
    batchRequests: true,
    batchSize: 5,
  },

  // Development/Debug configuration
  debug: {
    // Enable performance monitoring
    enabled: process.env.NODE_ENV === "development",

    // Log performance metrics
    logMetrics: true,

    // Show performance overlay
    showOverlay: false,

    // Memory monitoring
    monitorMemory: true,
  },
};

// Performance monitoring utilities
export class PerformanceMonitor {
  static metrics = new Map();
  static observers = [];

  static startTimer(name) {
    if (!PERFORMANCE_CONFIG.debug.enabled) return;

    this.metrics.set(name, {
      startTime: performance.now(),
      startMemory: performance.memory?.usedJSHeapSize || 0,
    });
  }

  static endTimer(name) {
    if (!PERFORMANCE_CONFIG.debug.enabled) return;

    const metric = this.metrics.get(name);
    if (!metric) return;

    const endTime = performance.now();
    const endMemory = performance.memory?.usedJSHeapSize || 0;

    const duration = endTime - metric.startTime;
    const memoryDelta = endMemory - metric.startMemory;

    if (PERFORMANCE_CONFIG.debug.logMetrics) {
      console.log(
        `⏱️ ${name}: ${duration.toFixed(2)}ms (Memory: ${(
          memoryDelta /
          1024 /
          1024
        ).toFixed(2)}MB)`
      );
    }

    this.metrics.delete(name);

    return { duration, memoryDelta };
  }

  static measureAsync(name, asyncFn) {
    if (!PERFORMANCE_CONFIG.debug.enabled) return asyncFn();

    this.startTimer(name);
    return asyncFn().finally(() => {
      this.endTimer(name);
    });
  }

  static startMemoryMonitoring() {
    if (!PERFORMANCE_CONFIG.debug.monitorMemory || !performance.memory) return;

    const monitor = () => {
      const memory = performance.memory;
      const usage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };

      if (PERFORMANCE_CONFIG.debug.logMetrics && usage.percentage > 80) {
        console.warn(`🧠 High memory usage: ${usage.percentage.toFixed(2)}%`);
      }

      // Trigger cleanup if memory usage is high
      if (usage.percentage > PERFORMANCE_CONFIG.memory.cleanupThreshold * 100) {
        this.triggerMemoryCleanup();
      }
    };

    // Monitor every 5 seconds
    const interval = setInterval(monitor, 5000);
    this.observers.push(() => clearInterval(interval));

    // Initial check
    monitor();
  }

  static triggerMemoryCleanup() {
    // Suggest garbage collection if available
    if (window.gc) {
      window.gc();
    }

    // Clear caches
    if (typeof imageEffectsManager !== "undefined") {
      imageEffectsManager.clearCache();
    }

    // Clear image data
    const canvases = document.querySelectorAll("canvas");
    canvases.forEach((canvas) => {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    console.log("🧹 Memory cleanup triggered");
  }

  static cleanup() {
    this.observers.forEach((cleanup) => cleanup());
    this.observers = [];
    this.metrics.clear();
  }
}

// Initialize performance monitoring
if (typeof window !== "undefined") {
  PerformanceMonitor.startMemoryMonitoring();
}

export default PERFORMANCE_CONFIG;
