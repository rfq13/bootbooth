// image_effects.cpp - OPTIMIZED untuk HP t620 (Low-Spec)
// Menggunakan STB Image (header-only, zero dependencies)

#define STB_IMAGE_IMPLEMENTATION
#define STBI_ONLY_JPEG  // Hanya support JPEG untuk menghemat memory
#define STBI_NO_FAILURE_STRINGS  // Skip error strings untuk hemat memory
#define STB_IMAGE_WRITE_IMPLEMENTATION
#define STBIW_WINDOWS_UTF8  // Better compatibility
#include "stb_image.h"
#include "stb_image_write.h"

#include "../include/server.h"
#include <cstring>
#include <algorithm> // untuk std::max & std::min

ImageEffects::ImageEffects() : currentEffect(EffectType::NONE) {
    params.intensity = 0.5;
    params.radius = 1.0;
    params.pixelSize = 10;
}

void ImageEffects::setEffect(EffectType effect, const EffectParams& params) {
    std::lock_guard<std::mutex> lock(mutex);
    this->currentEffect = effect;
    this->params = params;
}

std::pair<EffectType, EffectParams> ImageEffects::getEffect() const {
    std::lock_guard<std::mutex> lock(mutex);
    return {currentEffect, params};
}

std::vector<unsigned char> ImageEffects::applyEffect(const std::vector<unsigned char>& jpegData) {
    try {
        // Quick return untuk NONE effect (zero overhead)
        if (currentEffect == EffectType::NONE || jpegData.empty()) {
            return jpegData;
        }
        
        // Decode JPEG
        ImageData rgbData = decodeJPEG(jpegData);
        if (rgbData.data.empty()) {
            std::cerr << "❌ Decode failed, returning original" << std::endl;
            return jpegData;
        }
        
        // Apply effect (in-place untuk hemat memory)
        switch (currentEffect) {
            case EffectType::GRAYSCALE:
                applyGrayscaleEffect(rgbData);
                break;
            case EffectType::SEPIA:
                applySepiaEffect(rgbData);
                break;
            case EffectType::INVERT:
                applyInvertEffect(rgbData);
                break;
            case EffectType::VIGNETTE:
                applyVignetteEffect(rgbData);
                break;
            case EffectType::BLUR:
                applyBlurEffect(rgbData);
                break;
            case EffectType::SHARPEN:
                applySharpenEffect(rgbData);
                break;
            case EffectType::PIXELATE:
                applyPixelateEffect(rgbData);
                break;
            case EffectType::FISHEYE:
                applyFishEyeEffect(rgbData);
                break;
            default:
                break;
        }
        
        // Encode kembali
        return encodeJPEG(rgbData);
    } catch (const std::exception& e) {
        std::cerr << "❌ Error in applyEffect: " << e.what() << std::endl;
        // Return original data on error
        return jpegData;
    } catch (...) {
        std::cerr << "❌ Unknown error in applyEffect" << std::endl;
        // Return original data on error
        return jpegData;
    }
}

// ============ STB IMAGE DECODER (Lightweight) ============
ImageData ImageEffects::decodeJPEG(const std::vector<unsigned char>& jpegData) {
    try {
        ImageData result;
        
        if (jpegData.empty() || jpegData.size() < 2) {
            return result;
        }
        
        int width, height, channels;
        
        // STB Image decode - sangat cepat dan efficient
        unsigned char* imgData = stbi_load_from_memory(
            jpegData.data(),
            static_cast<int>(jpegData.size()),
            &width,
            &height,
            &channels,
            3  // Force RGB output
        );
        
        if (!imgData) {
            std::cerr << "❌ STB decode failed" << std::endl;
            return result;
        }
        
        result.width = width;
        result.height = height;
        
        // Move data (zero-copy jika possible)
        size_t dataSize = width * height * 3;
        result.data.resize(dataSize);
        std::memcpy(result.data.data(), imgData, dataSize);
        
        // Free STB memory
        stbi_image_free(imgData);
        
        return result;
    } catch (const std::exception& e) {
        std::cerr << "❌ Error in decodeJPEG: " << e.what() << std::endl;
        return ImageData(); // Return empty image data on error
    } catch (...) {
        std::cerr << "❌ Unknown error in decodeJPEG" << std::endl;
        return ImageData(); // Return empty image data on error
    }
}

// ============ STB IMAGE ENCODER (Lightweight) ============
std::vector<unsigned char> ImageEffects::encodeJPEG(const ImageData& rgbData) {
    try {
        std::vector<unsigned char> jpegData;
        
        if (rgbData.data.empty() || rgbData.width == 0 || rgbData.height == 0) {
            return jpegData;
        }
        
        // Reserve untuk menghindari reallocation
        jpegData.reserve(rgbData.width * rgbData.height);
        
        // Write callback
        auto writeFunc = [](void* context, void* data, int size) {
            auto* vec = static_cast<std::vector<unsigned char>*>(context);
            auto* bytes = static_cast<unsigned char*>(data);
            vec->insert(vec->end(), bytes, bytes + size);
        };
        
        // Encode dengan quality 80 (balance antara quality dan size)
        int success = stbi_write_jpg_to_func(
            writeFunc,
            &jpegData,
            rgbData.width,
            rgbData.height,
            3,
            rgbData.data.data(),
            80  // Quality 80 untuk hemat CPU & bandwidth
        );
        
        if (!success) {
            std::cerr << "❌ STB encode failed" << std::endl;
            return std::vector<unsigned char>();
        }
        
        return jpegData;
    } catch (const std::exception& e) {
        std::cerr << "❌ Error in encodeJPEG: " << e.what() << std::endl;
        return std::vector<unsigned char>(); // Return empty data on error
    } catch (...) {
        std::cerr << "❌ Unknown error in encodeJPEG" << std::endl;
        return std::vector<unsigned char>(); // Return empty data on error
    }
}

// ============ LIGHTWEIGHT EFFECTS (Optimized untuk Low-Spec) ============

// GRAYSCALE - Sangat cepat, in-place
void ImageEffects::applyGrayscaleEffect(ImageData& image) {
    try {
        const float intensity = params.intensity;
        const float invIntensity = 1.0f - intensity;
        
        for (size_t i = 0; i < image.data.size(); i += 3) {
            unsigned char r = image.data[i];
            unsigned char g = image.data[i + 1];
            unsigned char b = image.data[i + 2];
            
            // Fast integer grayscale (approximation)
            unsigned char gray = (r * 77 + g * 150 + b * 29) >> 8;
            
            // Blend dengan intensity
            image.data[i] = r * invIntensity + gray * intensity;
            image.data[i + 1] = g * invIntensity + gray * intensity;
            image.data[i + 2] = b * invIntensity + gray * intensity;
        }
    } catch (const std::exception& e) {
        std::cerr << "❌ Error in applyGrayscaleEffect: " << e.what() << std::endl;
        // Don't modify image on error
    } catch (...) {
        std::cerr << "❌ Unknown error in applyGrayscaleEffect" << std::endl;
        // Don't modify image on error
    }
}

// SEPIA - Cepat, in-place
void ImageEffects::applySepiaEffect(ImageData& image) {
    try {
        const float intensity = params.intensity;
        const float invIntensity = 1.0f - intensity;
        
        for (size_t i = 0; i < image.data.size(); i += 3) {
            unsigned char r = image.data[i];
            unsigned char g = image.data[i + 1];
            unsigned char b = image.data[i + 2];
            
            // Sepia transform
            int tr = (r * 393 + g * 769 + b * 189) >> 10;
            int tg = (r * 349 + g * 686 + b * 168) >> 10;
            int tb = (r * 272 + g * 534 + b * 131) >> 10;
            
            // Clamp
            tr = tr > 255 ? 255 : tr;
            tg = tg > 255 ? 255 : tg;
            tb = tb > 255 ? 255 : tb;
            
            // Blend
            image.data[i] = r * invIntensity + tr * intensity;
            image.data[i + 1] = g * invIntensity + tg * intensity;
            image.data[i + 2] = b * invIntensity + tb * intensity;
        }
    } catch (const std::exception& e) {
        std::cerr << "❌ Error in applySepiaEffect: " << e.what() << std::endl;
        // Don't modify image on error
    } catch (...) {
        std::cerr << "❌ Unknown error in applySepiaEffect" << std::endl;
        // Don't modify image on error
    }
}

// INVERT - Sangat cepat, in-place
void ImageEffects::applyInvertEffect(ImageData& image) {
    const float intensity = params.intensity;
    const float invIntensity = 1.0f - intensity;
    
    for (size_t i = 0; i < image.data.size(); ++i) {
        unsigned char val = image.data[i];
        image.data[i] = val * invIntensity + (255 - val) * intensity;
    }
}

// VIGNETTE - Optimized dengan lookup table untuk distance
void ImageEffects::applyVignetteEffect(ImageData& image) {
    const int w = image.width;
    const int h = image.height;
    const int centerX = w / 2;
    const int centerY = h / 2;
    const float maxRadius = std::sqrt(centerX * centerX + centerY * centerY);
    const float strength = params.intensity * 2.0f;
    
    for (int y = 0; y < h; ++y) {
        const int dy = y - centerY;
        for (int x = 0; x < w; ++x) {
            const int dx = x - centerX;
            const float distance = std::sqrt(dx * dx + dy * dy);
            float vignette = 1.0f - (distance / maxRadius) * strength;
            vignette = vignette < 0.0f ? 0.0f : vignette;
            
            const int idx = (y * w + x) * 3;
            image.data[idx] *= vignette;
            image.data[idx + 1] *= vignette;
            image.data[idx + 2] *= vignette;
        }
    }
}

// BLUR - Box blur (lebih cepat dari Gaussian)
void ImageEffects::applyBlurEffect(ImageData& image) {
    const int w = image.width;
    const int h = image.height;
    int radius = static_cast<int>(params.radius * 3.0f);
    if (radius < 1) radius = 1;
    if (radius > 5) radius = 5; // Limit untuk performa
    
    std::vector<unsigned char> temp = image.data;
    
    // Horizontal pass
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            int r = 0, g = 0, b = 0, count = 0;
            
            for (int kx = -radius; kx <= radius; ++kx) {
                int nx = x + kx;
                if (nx >= 0 && nx < w) {
                    int idx = (y * w + nx) * 3;
                    r += temp[idx];
                    g += temp[idx + 1];
                    b += temp[idx + 2];
                    count++;
                }
            }
            
            int idx = (y * w + x) * 3;
            image.data[idx] = r / count;
            image.data[idx + 1] = g / count;
            image.data[idx + 2] = b / count;
        }
    }
    
    // Vertical pass (optional untuk hemat CPU)
    // Skip jika intensity < 0.5
    if (params.intensity < 0.5f) return;
    
    temp = image.data;
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            int r = 0, g = 0, b = 0, count = 0;
            
            for (int ky = -radius; ky <= radius; ++ky) {
                int ny = y + ky;
                if (ny >= 0 && ny < h) {
                    int idx = (ny * w + x) * 3;
                    r += temp[idx];
                    g += temp[idx + 1];
                    b += temp[idx + 2];
                    count++;
                }
            }
            
            int idx = (y * w + x) * 3;
            image.data[idx] = r / count;
            image.data[idx + 1] = g / count;
            image.data[idx + 2] = b / count;
        }
    }
}

// SHARPEN - Optimized 3x3 kernel
void ImageEffects::applySharpenEffect(ImageData& image) {
    const int w = image.width;
    const int h = image.height;
    std::vector<unsigned char> temp = image.data;
    
    // Sharpen kernel: [0,-1,0; -1,5,-1; 0,-1,0]
    for (int y = 1; y < h - 1; ++y) {
        for (int x = 1; x < w - 1; ++x) {
            for (int c = 0; c < 3; ++c) {
                int center = (y * w + x) * 3 + c;
                int top = ((y - 1) * w + x) * 3 + c;
                int bottom = ((y + 1) * w + x) * 3 + c;
                int left = (y * w + (x - 1)) * 3 + c;
                int right = (y * w + (x + 1)) * 3 + c;
                
                int val = temp[center] * 5 - temp[top] - temp[bottom] - temp[left] - temp[right];
                val = val < 0 ? 0 : (val > 255 ? 255 : val);
                
                // Blend dengan original berdasarkan intensity
                image.data[center] = temp[center] * (1.0f - params.intensity) + val * params.intensity;
            }
        }
    }
}

// PIXELATE - Fast averaging
void ImageEffects::applyPixelateEffect(ImageData& image) {
    const int w = image.width;
    const int h = image.height;
    int blockSize = params.pixelSize;
    if (blockSize < 2) blockSize = 2;
    if (blockSize > 50) blockSize = 50; // Limit
    
    std::vector<unsigned char> temp = image.data;
    
    for (int y = 0; y < h; y += blockSize) {
        for (int x = 0; x < w; x += blockSize) {
            int r = 0, g = 0, b = 0, count = 0;
            
            // Average block
            for (int dy = 0; dy < blockSize && y + dy < h; ++dy) {
                for (int dx = 0; dx < blockSize && x + dx < w; ++dx) {
                    int idx = ((y + dy) * w + (x + dx)) * 3;
                    r += temp[idx];
                    g += temp[idx + 1];
                    b += temp[idx + 2];
                    count++;
                }
            }
            
            r /= count;
            g /= count;
            b /= count;
            
            // Fill block
            for (int dy = 0; dy < blockSize && y + dy < h; ++dy) {
                for (int dx = 0; dx < blockSize && x + dx < w; ++dx) {
                    int idx = ((y + dy) * w + (x + dx)) * 3;
                    image.data[idx] = r;
                    image.data[idx + 1] = g;
                    image.data[idx + 2] = b;
                }
            }
        }
    }
}

// Replace your applyFishEyeEffect function in image_effects.cpp with this:

void ImageEffects::applyFishEyeEffect(ImageData& image) {
    const int w = image.width;
    const int h = image.height;
    
    std::cout << "🐟 Applying Canon EF 15mm f/2.8 Fisheye (Equidistant Projection)" << std::endl;
    
    // ============ CANON EF 15mm PARAMETERS ============
    const float k1 = 0.22f;     // Second-order radial distortion
    const float k2 = 0.17f;     // Fourth-order radial distortion
    const float caRed = 0.003f;   // Chromatic aberration for red
    const float caBlue = -0.003f; // Chromatic aberration for blue
    // Fisheye effect tidak menggunakan intensitas; gunakan nilai tetap untuk vignette
    const float vignetteStrength = 0.6f;
    
    // Center and focal length
    const float cx = w * 0.5f;
    const float cy = h * 0.5f;
    const float diagonalPixels = std::sqrt(cx * cx + cy * cy);
    const float maxTheta = M_PI * 0.5f; // 90° (half of 180° diagonal FOV)
    
    // Pre-calculate for optimization
    const float invDiagonal = 1.0f / diagonalPixels;
    
    // Backup original data
    std::vector<unsigned char> original = image.data;
    
    // ============ MAIN DISTORTION LOOP ============
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            // Normalize coordinates
            float nx = (x - cx) * invDiagonal;
            float ny = (y - cy) * invDiagonal;
            float r = std::sqrt(nx * nx + ny * ny);
            
            
            // Early exit for center (no distortion needed)
            if (r < 0.001f) {
                continue;
            }
            
            // ============ EQUIDISTANT PROJECTION ============
            // Calculate angle θ
            float theta = r * maxTheta;
            
            // Apply Canon's radial distortion: r' = f·θ·(1 + k1·θ² + k2·θ⁴)
            float theta2 = theta * theta;
            float theta4 = theta2 * theta2;
            float distortionFactor = 1.0f + k1 * theta2 + k2 * theta4;
            
            // Calculate distorted radius
            float rDistorted = theta * distortionFactor;
            
            // Scale factor (intensity tidak dipakai untuk fisheye)
            float scale = rDistorted / r; // intensity tidak diterapkan
            
            // ============ APPLY DISTORTION ============
            float dx = nx * scale;
            float dy = ny * scale;
            
            // Map to source coordinates (with chromatic aberration)
            float srcX_g = dx * diagonalPixels + cx;
            float srcY_g = dy * diagonalPixels + cy;
            
            // Chromatic aberration offsets
            float srcX_r = dx * (1.0f + caRed) * diagonalPixels + cx;
            float srcY_r = dy * (1.0f + caRed) * diagonalPixels + cy;
            float srcX_b = dx * (1.0f + caBlue) * diagonalPixels + cx;
            float srcY_b = dy * (1.0f + caBlue) * diagonalPixels + cy;
            
             // Clamp source coordinates to valid image bounds
             // This prevents out‑of‑range reads that previously caused the pixel to be skipped,
             // ensuring the fisheye effect is applied across the whole image.
             srcX_g = std::max(0.0f, std::min(srcX_g, static_cast<float>(w - 2)));
             srcY_g = std::max(0.0f, std::min(srcY_g, static_cast<float>(h - 2)));
             srcX_r = std::max(0.0f, std::min(srcX_r, static_cast<float>(w - 2)));
             srcY_r = std::max(0.0f, std::min(srcY_r, static_cast<float>(h - 2)));
             srcX_b = std::max(0.0f, std::min(srcX_b, static_cast<float>(w - 2)));
             srcY_b = std::max(0.0f, std::min(srcY_b, static_cast<float>(h - 2)));
            
            // ============ BILINEAR SAMPLING ============
            auto sampleBilinear = [&](float sx, float sy, int ch) -> unsigned char {
                if (sx < 0 || sx >= w - 1 || sy < 0 || sy >= h - 1) {
                    return 0;
                }
                
                int x0 = static_cast<int>(sx);
                int y0 = static_cast<int>(sy);
                int x1 = x0 + 1;
                int y1 = y0 + 1;
                
                float fx = sx - x0;
                float fy = sy - y0;
                
                // Get pixel indices
                int idx00 = (y0 * w + x0) * 3 + ch;
                int idx01 = (y0 * w + x1) * 3 + ch;
                int idx10 = (y1 * w + x0) * 3 + ch;
                int idx11 = (y1 * w + x1) * 3 + ch;
                
                // Bilinear interpolation
                float val = original[idx00] * (1.0f - fx) * (1.0f - fy) +
                           original[idx01] * fx * (1.0f - fy) +
                           original[idx10] * (1.0f - fx) * fy +
                           original[idx11] * fx * fy;
                
                return static_cast<unsigned char>(val > 255.0f ? 255 : (val < 0.0f ? 0 : val));
            };
            
            int dstIdx = (y * w + x) * 3;
            
            // Sample each channel with chromatic aberration
            unsigned char rVal = sampleBilinear(srcX_r, srcY_r, 0);
            unsigned char gVal = sampleBilinear(srcX_g, srcY_g, 1);
            unsigned char bVal = sampleBilinear(srcX_b, srcY_b, 2);
            
            // ============ VIGNETTING (cos⁴ falloff) ============
            if (theta > 0.0f) {
                float cosTheta = std::cos(theta);
                float vignette = cosTheta * cosTheta;
                vignette = vignette * vignette; // cos⁴
                
                // Blend with strength
                vignette = 1.0f - (1.0f - vignette) * vignetteStrength;
                
                rVal = static_cast<unsigned char>(rVal * vignette);
                gVal = static_cast<unsigned char>(gVal * vignette);
                bVal = static_cast<unsigned char>(bVal * vignette);
            }
            
            // Write to output
            image.data[dstIdx] = rVal;
            image.data[dstIdx + 1] = gVal;
            image.data[dstIdx + 2] = bVal;
        }
    }
    
    std::cout << "✅ Canon EF 15mm fisheye applied (k1=" << k1 << ", k2=" << k2 << ")" << std::endl;
}
// Static helper methods
std::vector<unsigned char> ImageEffects::applyFishEye(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::FISHEYE, effects.params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applyGrayscale(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::GRAYSCALE, effects.params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applySepia(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::SEPIA, effects.params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applyVignette(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::VIGNETTE, effects.params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applyBlur(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::BLUR, effects.params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applySharpen(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::SHARPEN, effects.params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applyInvert(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::INVERT, effects.params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applyPixelate(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::PIXELATE, effects.params);
    return effects.applyEffect(imageData);
}