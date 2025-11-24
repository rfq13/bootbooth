// Face Detection Worker untuk ML-Assisted Face Masking
// Note: MediaPipe Face Mesh needs to be loaded in main thread due to browser limitations
// This worker handles image processing and mask generation

let isInitialized = false;

// Initialize worker
function initialize() {
  isInitialized = true;
  console.log("✅ Face detection worker initialized");
  return true;
}

// Generate face mask from contour points
function generateFaceMask(faceContour, expansion = 15, feather = 5) {
  if (!faceContour || faceContour.length === 0) {
    return null;
  }

  // Calculate center point
  const center = faceContour.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  center.x /= faceContour.length;
  center.y /= faceContour.length;

  // Expand contour points
  const expandedContour = faceContour.map((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return point;

    const expansionFactor = 1 + expansion / distance;
    return {
      x: center.x + dx * expansionFactor,
      y: center.y + dy * expansionFactor,
    };
  });

  return {
    type: "face-mask",
    points: expandedContour,
    feather: feather,
    expansion: expansion,
    center: center,
  };
}

// Process image data for face detection
function processImageData(imageData) {
  // This is a placeholder for actual face detection
  // In a real implementation, this would integrate with MediaPipe
  // For now, we'll return a mock face contour for testing
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock face contour points (normalized coordinates)
      const mockFaceContour = [
        { x: 0.3, y: 0.3 },
        { x: 0.4, y: 0.25 },
        { x: 0.5, y: 0.25 },
        { x: 0.6, y: 0.3 },
        { x: 0.65, y: 0.4 },
        { x: 0.65, y: 0.5 },
        { x: 0.6, y: 0.6 },
        { x: 0.5, y: 0.65 },
        { x: 0.4, y: 0.65 },
        { x: 0.3, y: 0.6 },
        { x: 0.25, y: 0.5 },
        { x: 0.25, y: 0.4 },
      ];

      resolve({
        success: true,
        faceContour: mockFaceContour,
        imageWidth: 900,
        imageHeight: 1350,
      });
    }, 1000); // Simulate processing time
  });
}

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case "INITIALIZE":
        const success = initialize();
        self.postMessage({
          type: "INITIALIZED",
          success: success,
        });
        break;

      case "DETECT_FACE":
        const result = await processImageData(data.imageData);

        if (result.success) {
          const mask = generateFaceMask(
            result.faceContour,
            data.expansion || 15,
            data.feather || 5
          );
          self.postMessage({
            type: "FACE_DETECTED",
            result: {
              ...result,
              mask: mask,
            },
          });
        } else {
          self.postMessage({
            type: "FACE_DETECTION_FAILED",
            error: result.error,
          });
        }
        break;

      case "GENERATE_MASK":
        const faceMask = generateFaceMask(
          data.faceContour,
          data.expansion || 15,
          data.feather || 5
        );
        self.postMessage({
          type: "MASK_GENERATED",
          mask: faceMask,
        });
        break;

      default:
        self.postMessage({
          type: "ERROR",
          error: `Unknown message type: ${type}`,
        });
    }
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      error: error.message,
    });
  }
};
