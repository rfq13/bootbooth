// imageEffectsWorker.js - Web Worker untuk optimasi efek foto pada spek terbatas
// Menggunakan Canvas API dengan algoritma yang dioptimasi untuk HP T620 Plus

// Fungsi helper untuk clamp nilai
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Fungsi helper untuk bilinear interpolation
function bilinearInterpolate(data, x, y, width, height) {
  const x1 = Math.floor(x);
  const y1 = Math.floor(y);
  const x2 = Math.min(x1 + 1, width - 1);
  const y2 = Math.min(y1 + 1, height - 1);

  const dx = x - x1;
  const dy = y - y1;

  const idx1 = (y1 * width + x1) * 4;
  const idx2 = (y1 * width + x2) * 4;
  const idx3 = (y2 * width + x1) * 4;
  const idx4 = (y2 * width + x2) * 4;

  const interpolate = (v1, v2, v3, v4) => {
    return (
      v1 * (1 - dx) * (1 - dy) +
      v2 * dx * (1 - dy) +
      v3 * (1 - dx) * dy +
      v4 * dx * dy
    );
  };

  return [
    interpolate(data[idx1], data[idx2], data[idx3], data[idx4]),
    interpolate(data[idx1 + 1], data[idx2 + 1], data[idx3 + 1], data[idx4 + 1]),
    interpolate(data[idx1 + 2], data[idx2 + 2], data[idx3 + 2], data[idx4 + 2]),
    data[idx1 + 3], // Alpha channel
  ];
}

// Fish Eye Effect dengan Barrel Distortion - Optimized untuk low-spec
function applyFishEye(imageData, intensity = 0.5) {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);

  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const maxRadius = Math.min(centerX, centerY) * 0.9;
  const strength = clamp(intensity, 0.0, 1.0) * 0.5; // Reduced strength untuk lebih natural

  // Pre-calculate values untuk optimasi
  const invMaxRadius = 1.0 / maxRadius;

  for (let y = 0; y < height; y++) {
    const dy = y - centerY;

    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const dstIdx = (y * width + x) * 4;

      if (distance > maxRadius) {
        // Copy pixel as-is untuk area di luar radius
        const srcIdx = (y * width + x) * 4;
        output[dstIdx] = data[srcIdx];
        output[dstIdx + 1] = data[srcIdx + 1];
        output[dstIdx + 2] = data[srcIdx + 2];
        output[dstIdx + 3] = data[srcIdx + 3];
        continue;
      }

      // Normalized coordinates
      const nx = dx / maxRadius;
      const ny = dy / maxRadius;
      const radius = Math.sqrt(nx * nx + ny * ny);

      // Barrel distortion formula: r' = r * (1 + k * r²)
      const srcR = radius * (1.0 + strength * radius * radius);
      const srcX = centerX + nx * srcR * maxRadius;
      const srcY = centerY + ny * srcR * maxRadius;

      // Bilinear interpolation untuk smooth result
      const [pixelR, pixelG, pixelB, pixelA] = bilinearInterpolate(
        data,
        srcX,
        srcY,
        width,
        height
      );

      output[dstIdx] = pixelR;
      output[dstIdx + 1] = pixelG;
      output[dstIdx + 2] = pixelB;
      output[dstIdx + 3] = pixelA;
    }
  }

  return new ImageData(output, width, height);
}

// Grayscale Effect - Optimized dengan integer math
function applyGrayscale(imageData, intensity = 1.0) {
  const { data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  const invIntensity = 1.0 - intensity;

  // Fast integer weights untuk grayscale (ITU-R BT.709)
  const rWeight = 77;
  const gWeight = 150;
  const bWeight = 29;
  const totalWeight = rWeight + gWeight + bWeight;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Fast integer grayscale calculation
    const gray = (r * rWeight + g * gWeight + b * bWeight) >> 8; // Divide by 256

    // Blend dengan original
    output[i] = clamp(r * invIntensity + gray * intensity, 0, 255);
    output[i + 1] = clamp(g * invIntensity + gray * intensity, 0, 255);
    output[i + 2] = clamp(b * invIntensity + gray * intensity, 0, 255);
    output[i + 3] = data[i + 3]; // Alpha
  }

  return new ImageData(output, imageData.width, imageData.height);
}

// Sepia Effect - Optimized dengan lookup tables
function applySepia(imageData, intensity = 1.0) {
  const { data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  const invIntensity = 1.0 - intensity;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Sepia transform dengan bit shifting untuk speed
    const tr = (r * 393 + g * 769 + b * 189) >> 10; // Divide by 1024
    const tg = (r * 349 + g * 686 + b * 168) >> 10;
    const tb = (r * 272 + g * 534 + b * 131) >> 10;

    // Clamp dengan blending
    output[i] = clamp(r * invIntensity + tr * intensity, 0, 255);
    output[i + 1] = clamp(g * invIntensity + tg * intensity, 0, 255);
    output[i + 2] = clamp(b * invIntensity + tb * intensity, 0, 255);
    output[i + 3] = data[i + 3]; // Alpha
  }

  return new ImageData(output, imageData.width, imageData.height);
}

// Invert Effect - Super fast
function applyInvert(imageData, intensity = 1.0) {
  const { data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  const invIntensity = 1.0 - intensity;

  for (let i = 0; i < data.length; i += 4) {
    output[i] = clamp(
      data[i] * invIntensity + (255 - data[i]) * intensity,
      0,
      255
    );
    output[i + 1] = clamp(
      data[i + 1] * invIntensity + (255 - data[i + 1]) * intensity,
      0,
      255
    );
    output[i + 2] = clamp(
      data[i + 2] * invIntensity + (255 - data[i + 2]) * intensity,
      0,
      255
    );
    output[i + 3] = data[i + 3]; // Alpha
  }

  return new ImageData(output, imageData.width, imageData.height);
}

// Vignette Effect - Optimized dengan distance calculation
function applyVignette(imageData, intensity = 0.5) {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);

  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
  const strength = intensity * 2.0;

  for (let y = 0; y < height; y++) {
    const dy = y - centerY;

    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const distance = Math.sqrt(dx * dx + dy * dy);
      let vignette = 1.0 - (distance / maxRadius) * strength;
      vignette = Math.max(0.0, vignette);

      const idx = (y * width + x) * 4;
      output[idx] = clamp(data[idx] * vignette, 0, 255);
      output[idx + 1] = clamp(data[idx + 1] * vignette, 0, 255);
      output[idx + 2] = clamp(data[idx + 2] * vignette, 0, 255);
      output[idx + 3] = data[idx + 3]; // Alpha
    }
  }

  return new ImageData(output, width, height);
}

// Blur Effect - Optimized box blur
function applyBlur(imageData, intensity = 0.5) {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);

  let radius = Math.max(1, Math.floor(intensity * 3.0));
  radius = Math.min(radius, 3); // Limit untuk performa

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;

      for (let kx = -radius; kx <= radius; kx++) {
        const nx = x + kx;
        if (nx >= 0 && nx < width) {
          const idx = (y * width + nx) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
      }

      const dstIdx = (y * width + x) * 4;
      output[dstIdx] = r / count;
      output[dstIdx + 1] = g / count;
      output[dstIdx + 2] = b / count;
      output[dstIdx + 3] = a / count;
    }
  }

  // Vertical pass (skip untuk hemat CPU jika intensity rendah)
  if (intensity < 0.5) {
    return new ImageData(output, width, height);
  }

  const temp = new Uint8ClampedArray(output);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        const ny = y + ky;
        if (ny >= 0 && ny < height) {
          const idx = (ny * width + x) * 4;
          r += temp[idx];
          g += temp[idx + 1];
          b += temp[idx + 2];
          a += temp[idx + 3];
          count++;
        }
      }

      const dstIdx = (y * width + x) * 4;
      output[dstIdx] = r / count;
      output[dstIdx + 1] = g / count;
      output[dstIdx + 2] = b / count;
      output[dstIdx + 3] = a / count;
    }
  }

  return new ImageData(output, width, height);
}

// Pixelate Effect - Fast averaging
function applyPixelate(imageData, intensity = 0.5) {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);

  let blockSize = Math.max(2, Math.floor(intensity * 20));
  blockSize = Math.min(blockSize, 20); // Limit

  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;

      // Average block
      for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
      }

      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        a = Math.round(a / count);

        // Fill block
        for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
          for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            output[idx] = r;
            output[idx + 1] = g;
            output[idx + 2] = b;
            output[idx + 3] = a;
          }
        }
      }
    }
  }

  return new ImageData(output, width, height);
}

// Message handler dari main thread
self.onmessage = function (e) {
  const { type, imageData, params } = e.data;

  if (!imageData || !imageData.data) {
    self.postMessage({
      error: "Invalid image data",
      type,
    });
    return;
  }

  let result;
  const startTime = performance.now();

  try {
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

    self.postMessage({
      success: true,
      type,
      result: {
        data: Array.from(result.data), // Convert to regular array for transfer
        width: result.width,
        height: result.height,
      },
      processingTime: Math.round(processingTime * 100) / 100, // Round to 2 decimal places
    });
  } catch (error) {
    self.postMessage({
      success: false,
      type,
      error: error.message,
    });
  }
};

// Error handling
self.onerror = function (error) {
  self.postMessage({
    success: false,
    error: `Worker error: ${error.message}`,
  });
};
