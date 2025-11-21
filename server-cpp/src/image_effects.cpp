// image_effects.cpp - REVISI TOTAL untuk FISHEYE 1 BOLA MATA IKAN
// Menggunakan STB Image (header-only, zero dependencies)

// Kompabilitas Windows
#ifdef _WIN32
    #define WIN32_LEAN_AND_MEAN
    #include <windows.h>
    #include <winsock2.h>
    #undef min
    #undef max
#endif

#define STB_IMAGE_IMPLEMENTATION
#define STBI_ONLY_JPEG  // Hanya support JPEG untuk menghemat memory
#define STBI_NO_FAILURE_STRINGS  // Skip error strings untuk hemat memory
#define STB_IMAGE_WRITE_IMPLEMENTATION
#define STBIW_WINDOWS_UTF8  // Better compatibility
#include "../include/stb_image.h"
#include "../include/stb_image_write.h"

#include "../include/server.h"
#include <cstring>
#include <algorithm> // untuk std::max & std::min

ImageEffects::ImageEffects() : currentEffect(EffectType::NONE) {
    try {
        std::lock_guard<std::mutex> lock(mutex);
        params.intensity = 0.5;
        params.radius = 1.0;
        params.pixelSize = 10;
    } catch (const std::exception& e) {
        std::cerr << "❌ Exception in ImageEffects constructor: " << e.what() << std::endl;
        // Set default values manually if mutex fails
        params.intensity = 0.5;
        params.radius = 1.0;
        params.pixelSize = 10;
    }
}

void ImageEffects::setEffect(EffectType effect, const EffectParams& params) {
    try {
        std::lock_guard<std::mutex> lock(mutex);
        this->currentEffect = effect;
        this->params = params;
    } catch (const std::exception& e) {
        std::cerr << "❌ Exception in setEffect: " << e.what() << std::endl;
        // Fallback tanpa lock (beresiko race condition tapi lebih aman daripada crash)
        this->currentEffect = effect;
        this->params = params;
    }
}

std::pair<EffectType, EffectParams> ImageEffects::getEffect() const {
    try {
        std::lock_guard<std::mutex> lock(mutex);
        return {currentEffect, params};
    } catch (const std::exception& e) {
        std::cerr << "❌ Exception in getEffect: " << e.what() << std::endl;
        // Fallback tanpa lock
        return {currentEffect, params};
    }
}

std::vector<unsigned char> ImageEffects::applyEffect(const std::vector<unsigned char>& jpegData) {
    try {
        // Quick return untuk NONE effect (zero overhead)
        if (currentEffect == EffectType::NONE || jpegData.empty()) {
            return jpegData;
        }
        
        // Safety check untuk ukuran data
        if (jpegData.size() > 50000000) { // Max 50MB
            std::cerr << "❌ JPEG data too large: " << jpegData.size() << " bytes" << std::endl;
            return jpegData;
        }
        
        // Decode JPEG dengan error handling yang lebih baik
        ImageData rgbData = decodeJPEG(jpegData);
        if (rgbData.data.empty() || rgbData.width <= 0 || rgbData.height <= 0) {
            std::cerr << "❌ Decode failed or invalid image data, returning original" << std::endl;
            return jpegData;
        }
        
        // Safety check untuk ukuran gambar
        if (rgbData.width > 16384 || rgbData.height > 16384) {
            std::cerr << "❌ Image dimensions too large: " << rgbData.width << "x" << rgbData.height << std::endl;
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
        std::vector<unsigned char> result = encodeJPEG(rgbData);
        
        // Safety check untuk hasil encode
        if (result.empty()) {
            std::cerr << "❌ Encode failed, returning original" << std::endl;
            return jpegData;
        }
        
        return result;
    } catch (const std::exception& e) {
        std::cerr << "❌ Exception in applyEffect: " << e.what() << std::endl;
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
    ImageData result;
    
    try {
        // Safety check untuk input data
        if (jpegData.empty() || jpegData.size() < 2) {
            std::cerr << "❌ Invalid JPEG data" << std::endl;
            return result;
        }
        
        int width = 0, height = 0, channels = 0;
        
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
        
        // Safety check untuk dimensi
        if (width <= 0 || height <= 0 || width > 16384 || height > 16384) {
            std::cerr << "❌ Invalid image dimensions: " << width << "x" << height << std::endl;
            stbi_image_free(imgData);
            return result;
        }
        
        result.width = width;
        result.height = height;
        
        // Calculate data size dengan safety check
        size_t dataSize = static_cast<size_t>(width) * static_cast<size_t>(height) * 3;
        if (dataSize > 100000000) { // Max 100MB
            std::cerr << "❌ Image too large: " << dataSize << " bytes" << std::endl;
            stbi_image_free(imgData);
            return result;
        }
        
        // Move data dengan exception safety
        result.data.resize(dataSize);
        std::memcpy(result.data.data(), imgData, dataSize);
        
        // Free STB memory
        stbi_image_free(imgData);
        
        return result;
    } catch (const std::exception& e) {
        std::cerr << "❌ Exception in decodeJPEG: " << e.what() << std::endl;
        return ImageData(); // Return empty image data on error
    } catch (...) {
        std::cerr << "❌ Unknown error in decodeJPEG" << std::endl;
        return ImageData(); // Return empty image data on error
    }
}

// ============ STB IMAGE ENCODER (Lightweight) ============
std::vector<unsigned char> ImageEffects::encodeJPEG(const ImageData& rgbData) {
    std::vector<unsigned char> jpegData;
    
    try {
        // Safety check untuk input data
        if (rgbData.data.empty() || rgbData.width <= 0 || rgbData.height <= 0) {
            std::cerr << "❌ Invalid image data for encoding" << std::endl;
            return jpegData;
        }
        
        // Safety check untuk ukuran data
        size_t expectedSize = static_cast<size_t>(rgbData.width) * static_cast<size_t>(rgbData.height) * 3;
        if (rgbData.data.size() != expectedSize) {
            std::cerr << "❌ Image data size mismatch. Expected: " << expectedSize << ", Got: " << rgbData.data.size() << std::endl;
            return jpegData;
        }
        
        // Safety check untuk dimensi yang masuk akal
        if (rgbData.width > 16384 || rgbData.height > 16384) {
            std::cerr << "❌ Image dimensions too large: " << rgbData.width << "x" << rgbData.height << std::endl;
            return jpegData;
        }
        
        // Reserve dengan ukuran yang masuk akal
        jpegData.reserve(rgbData.width * rgbData.height);
        
        // Write callback dengan safety checks
        auto writeFunc = [](void* context, void* data, int size) {
            if (!context || !data || size <= 0) return;
            
            auto* vec = static_cast<std::vector<unsigned char>*>(context);
            auto* bytes = static_cast<unsigned char*>(data);
            
            try {
                vec->insert(vec->end(), bytes, bytes + size);
            } catch (const std::exception& e) {
                std::cerr << "❌ Error in write callback: " << e.what() << std::endl;
            }
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
        std::cerr << "❌ Exception in encodeJPEG: " << e.what() << std::endl;
        return std::vector<unsigned char>(); // Return empty data on error
    } catch (...) {
        std::cerr << "❌ Unknown error in encodeJPEG" << std::endl;
        return std::vector<unsigned char>(); // Return empty data on error
    }
}

// ============ LIGHTWEIGHT EFFECTS (Optimized untuk Low-Spec) ============

// GRAYSCALE - Sangat cepat, in-place - DENGAN SAFETY CHECKS
void ImageEffects::applyGrayscaleEffect(ImageData& image) {
    try {
        // Safety check untuk data
        if (image.data.empty() || image.data.size() % 3 != 0) {
            std::cerr << "❌ Invalid image data for grayscale effect" << std::endl;
            return;
        }
        
        const float intensity = params.intensity;
        const float invIntensity = 1.0f - intensity;
        const size_t dataSize = image.data.size();
        
        for (size_t i = 0; i < dataSize; i += 3) {
            // Safety check untuk bounds
            if (i + 2 >= dataSize) {
                std::cerr << "❌ Index out of bounds in grayscale effect" << std::endl;
                break;
            }
            
            unsigned char r = image.data[i];
            unsigned char g = image.data[i + 1];
            unsigned char b = image.data[i + 2];
            
            // Fast integer grayscale (approximation)
            unsigned char gray = (r * 77 + g * 150 + b * 29) >> 8;
            
            // Blend dengan intensity
            image.data[i] = static_cast<unsigned char>(r * invIntensity + gray * intensity);
            image.data[i + 1] = static_cast<unsigned char>(g * invIntensity + gray * intensity);
            image.data[i + 2] = static_cast<unsigned char>(b * invIntensity + gray * intensity);
        }
    } catch (const std::exception& e) {
        std::cerr << "❌ Error in applyGrayscaleEffect: " << e.what() << std::endl;
        // Don't modify image on error
    } catch (...) {
        std::cerr << "❌ Unknown error in applyGrayscaleEffect" << std::endl;
        // Don't modify image on error
    }
}

// SEPIA - Cepat, in-place - DENGAN SAFETY CHECKS
void ImageEffects::applySepiaEffect(ImageData& image) {
    try {
        // Safety check untuk data
        if (image.data.empty() || image.data.size() % 3 != 0) {
            std::cerr << "❌ Invalid image data for sepia effect" << std::endl;
            return;
        }
        
        const float intensity = params.intensity;
        const float invIntensity = 1.0f - intensity;
        const size_t dataSize = image.data.size();
        
        for (size_t i = 0; i < dataSize; i += 3) {
            // Safety check untuk bounds
            if (i + 2 >= dataSize) {
                std::cerr << "❌ Index out of bounds in sepia effect" << std::endl;
                break;
            }
            
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
            
            // Blend dengan clamping
            image.data[i] = static_cast<unsigned char>(r * invIntensity + tr * intensity);
            image.data[i + 1] = static_cast<unsigned char>(g * invIntensity + tg * intensity);
            image.data[i + 2] = static_cast<unsigned char>(b * invIntensity + tb * intensity);
        }
    } catch (const std::exception& e) {
        std::cerr << "❌ Error in applySepiaEffect: " << e.what() << std::endl;
        // Don't modify image on error
    } catch (...) {
        std::cerr << "❌ Unknown error in applySepiaEffect" << std::endl;
        // Don't modify image on error
    }
}

// INVERT - Sangat cepat, in-place - DENGAN SAFETY CHECKS
void ImageEffects::applyInvertEffect(ImageData& image) {
    // Safety check untuk data
    if (image.data.empty()) {
        std::cerr << "❌ Invalid image data for invert effect" << std::endl;
        return;
    }
    
    const float intensity = params.intensity;
    const float invIntensity = 1.0f - intensity;
    const size_t dataSize = image.data.size();
    
    for (size_t i = 0; i < dataSize; ++i) {
        // Safety check untuk bounds
        if (i >= dataSize) {
            std::cerr << "❌ Index out of bounds in invert effect" << std::endl;
            break;
        }
        
        unsigned char val = image.data[i];
        image.data[i] = static_cast<unsigned char>(val * invIntensity + (255 - val) * intensity);
    }
}

// VIGNETTE - Optimized dengan lookup table untuk distance - DENGAN SAFETY CHECKS
void ImageEffects::applyVignetteEffect(ImageData& image) {
    const int w = image.width;
    const int h = image.height;
    
    // Safety check untuk ukuran gambar
    if (w <= 0 || h <= 0 || image.data.empty()) {
        std::cerr << "❌ Invalid image dimensions for vignette effect" << std::endl;
        return;
    }
    
    const int centerX = w / 2;
    const int centerY = h / 2;
    const float maxRadius = std::sqrt(centerX * centerX + centerY * centerY);
    const float strength = params.intensity * 2.0f;
    const size_t dataSize = image.data.size();
    
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            const int dx = x - centerX;
            const int dy = y - centerY;
            const float distance = std::sqrt(dx * dx + dy * dy);
            float vignette = 1.0f - (distance / maxRadius) * strength;
            vignette = vignette < 0.0f ? 0.0f : vignette;
            
            const int idx = (y * w + x) * 3;
            // Safety check untuk index
            if (idx >= 0 && idx + 2 < static_cast<int>(dataSize)) {
                image.data[idx] = static_cast<unsigned char>(image.data[idx] * vignette);
                image.data[idx + 1] = static_cast<unsigned char>(image.data[idx + 1] * vignette);
                image.data[idx + 2] = static_cast<unsigned char>(image.data[idx + 2] * vignette);
            }
        }
    }
}

// BLUR - Box blur (lebih cepat dari Gaussian) - DENGAN SAFETY CHECKS
void ImageEffects::applyBlurEffect(ImageData& image) {
    const int w = image.width;
    const int h = image.height;
    
    // Safety check untuk ukuran gambar
    if (w <= 0 || h <= 0 || image.data.empty()) {
        std::cerr << "❌ Invalid image dimensions for blur effect" << std::endl;
        return;
    }
    
    int radius = static_cast<int>(params.radius * 3.0f);
    if (radius < 1) radius = 1;
    if (radius > 5) radius = 5; // Limit untuk performa
    
    std::vector<unsigned char> temp = image.data;
    const size_t dataSize = temp.size();
    
    // Horizontal pass
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            int r = 0, g = 0, b = 0, count = 0;
            
            for (int kx = -radius; kx <= radius; ++kx) {
                int nx = x + kx;
                if (nx >= 0 && nx < w) {
                    int idx = (y * w + nx) * 3;
                    // Safety check untuk index
                    if (idx >= 0 && idx + 2 < static_cast<int>(dataSize)) {
                        r += temp[idx];
                        g += temp[idx + 1];
                        b += temp[idx + 2];
                        count++;
                    }
                }
            }
            
            if (count > 0) {
                int idx = (y * w + x) * 3;
                // Safety check untuk destination index
                if (idx >= 0 && idx + 2 < static_cast<int>(image.data.size())) {
                    image.data[idx] = r / count;
                    image.data[idx + 1] = g / count;
                    image.data[idx + 2] = b / count;
                }
            }
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
                    // Safety check untuk index
                    if (idx >= 0 && idx + 2 < static_cast<int>(dataSize)) {
                        r += temp[idx];
                        g += temp[idx + 1];
                        b += temp[idx + 2];
                        count++;
                    }
                }
            }
            
            if (count > 0) {
                int idx = (y * w + x) * 3;
                // Safety check untuk destination index
                if (idx >= 0 && idx + 2 < static_cast<int>(image.data.size())) {
                    image.data[idx] = r / count;
                    image.data[idx + 1] = g / count;
                    image.data[idx + 2] = b / count;
                }
            }
        }
    }
}

// SHARPEN - Optimized 3x3 kernel - DENGAN SAFETY CHECKS
void ImageEffects::applySharpenEffect(ImageData& image) {
    const int w = image.width;
    const int h = image.height;
    
    // Safety check untuk ukuran gambar
    if (w <= 0 || h <= 0 || image.data.empty()) {
        std::cerr << "❌ Invalid image dimensions for sharpen effect" << std::endl;
        return;
    }
    
    // Minimum size check untuk 3x3 kernel
    if (w < 3 || h < 3) {
        std::cerr << "❌ Image too small for sharpen effect" << std::endl;
        return;
    }
    
    std::vector<unsigned char> temp = image.data;
    const size_t dataSize = temp.size();
    
    // Sharpen kernel: [0,-1,0; -1,5,-1; 0,-1,0]
    for (int y = 1; y < h - 1; ++y) {
        for (int x = 1; x < w - 1; ++x) {
            for (int c = 0; c < 3; ++c) {
                int center = (y * w + x) * 3 + c;
                int top = ((y - 1) * w + x) * 3 + c;
                int bottom = ((y + 1) * w + x) * 3 + c;
                int left = (y * w + (x - 1)) * 3 + c;
                int right = (y * w + (x + 1)) * 3 + c;
                
                // Safety check untuk semua indices
                if (center < 0 || center >= static_cast<int>(dataSize) ||
                    top < 0 || top >= static_cast<int>(dataSize) ||
                    bottom < 0 || bottom >= static_cast<int>(dataSize) ||
                    left < 0 || left >= static_cast<int>(dataSize) ||
                    right < 0 || right >= static_cast<int>(dataSize)) {
                    continue;
                }
                
                int val = temp[center] * 5 - temp[top] - temp[bottom] - temp[left] - temp[right];
                val = val < 0 ? 0 : (val > 255 ? 255 : val);
                
                // Safety check untuk destination
                if (center >= 0 && center < static_cast<int>(image.data.size())) {
                    // Blend dengan original berdasarkan intensity
                    image.data[center] = static_cast<unsigned char>(
                        temp[center] * (1.0f - params.intensity) + val * params.intensity
                    );
                }
            }
        }
    }
}

// PIXELATE - Fast averaging - DENGAN SAFETY CHECKS
void ImageEffects::applyPixelateEffect(ImageData& image) {
    const int w = image.width;
    const int h = image.height;
    
    // Safety check untuk ukuran gambar
    if (w <= 0 || h <= 0 || image.data.empty()) {
        std::cerr << "❌ Invalid image dimensions for pixelate effect" << std::endl;
        return;
    }
    
    int blockSize = params.pixelSize;
    if (blockSize < 2) blockSize = 2;
    if (blockSize > 50) blockSize = 50; // Limit
    
    std::vector<unsigned char> temp = image.data;
    const size_t dataSize = temp.size();
    
    for (int y = 0; y < h; y += blockSize) {
        for (int x = 0; x < w; x += blockSize) {
            int r = 0, g = 0, b = 0, count = 0;
            
            // Average block dengan boundary checks
            for (int dy = 0; dy < blockSize && y + dy < h; ++dy) {
                for (int dx = 0; dx < blockSize && x + dx < w; ++dx) {
                    int idx = ((y + dy) * w + (x + dx)) * 3;
                    // Safety check untuk index
                    if (idx >= 0 && idx + 2 < static_cast<int>(dataSize)) {
                        r += temp[idx];
                        g += temp[idx + 1];
                        b += temp[idx + 2];
                        count++;
                    }
                }
            }
            
            if (count > 0) {
                r /= count;
                g /= count;
                b /= count;
                
                // Fill block dengan safety checks
                for (int dy = 0; dy < blockSize && y + dy < h; ++dy) {
                    for (int dx = 0; dx < blockSize && x + dx < w; ++dx) {
                        int idx = ((y + dy) * w + (x + dx)) * 3;
                        // Safety check untuk destination index
                        if (idx >= 0 && idx + 2 < static_cast<int>(image.data.size())) {
                            image.data[idx] = static_cast<unsigned char>(std::max(0, std::min(255, r)));
                            image.data[idx + 1] = static_cast<unsigned char>(std::max(0, std::min(255, g)));
                            image.data[idx + 2] = static_cast<unsigned char>(std::max(0, std::min(255, b)));
                        }
                    }
                }
            }
        }
    }
}

void ImageEffects::applyFishEyeEffect(ImageData& image) {
    const int w = image.width;
    const int h = image.height;

    const float intensity = static_cast<float>(params.intensity);
    float strength = (intensity < 0.0f) ? 0.0f : (intensity > 1.0f) ? 1.0f : intensity;
    
    if (w <= 0 || h <= 0 || image.data.empty()) return;
    
    // Backup original
    std::vector<unsigned char> original = image.data;
    
    // Pusat dan radius lingkaran fisheye (Canon 8mm menghasilkan circular pada full-frame)
    float cx = w * 0.5f;
    float cy = h * 0.5f;
    
    // Radius maksimum lingkaran gambar (biasanya sedikit lebih kecil dari setengah diagonal)
    float maxRadius = std::min(cx, cy) * 0.98f;  // hampir penuh tapi tidak sampai tepi
    
    // Strength dari 0.0 sampai 1.0 (1.0 = full Canon 8mm look)
    strength = std::clamp(strength, 0.0f, 1.0f);
    float fovScale = 1.0f + strength * 1.8f;  // makin besar = makin lebar FoV
    
    for (int y = 0; y < h; ++y) {
        float ny = (y - cy) / maxRadius;
        float ny2 = ny * ny;
        
        for (int x = 0; x < w; ++x) {
            float nx = (x - cx) / maxRadius;
            float r = std::sqrt(nx*nx + ny*ny);  // jarak normal dari pusat (0..~1.41)
            
            int dstIdx = (y * w + x) * 3;
            
            // === BAGIAN PALING PENTING: STEREOGRAPHIC PROJECTION (rahasia Canon fisheye) ===
            float src_r;
            if (r < 1e-6f) {
                src_r = 0.0f;
            } else {
                // Stereographic: r_dst = 2 * tan(θ/2)  →  θ = 2 * arctan(r_dst / 2)
                // Kita balik: theta = 2 * arctan(r / (2 * scale)), lalu r_src = tan(theta)
                float theta = 2.0f * std::atan(r / (2.0f * fovScale));
                src_r = std::tan(theta);
            }
            
            // Jika di luar lingkaran gambar → hitam total (circular fisheye)
            if (r > 1.0f) {
                image.data[dstIdx + 0] = 0;
                image.data[dstIdx + 1] = 0;
                image.data[dstIdx + 2] = 0;
                continue;
            }
            
            // Hitung koordinat sumber
            float srcX = cx + nx * src_r * maxRadius;
            float srcY = cy + ny * src_r * maxRadius;
            
            // Clamp ke batas gambar
            int sx = static_cast<int>(std::clamp(srcX, 0.0f, static_cast<float>(w-1)));
            int sy = static_cast<int>(std::clamp(srcY, 0.0f, static_cast<float>(h-1)));
            
            int srcIdx = (sy * w + sx) * 3;
            
            // Ambil pixel (bisa diganti bilinear kalau mau lebih halus)
            for (int c = 0; c < 3; ++c) {
                image.data[dstIdx + c] = original[srcIdx + c];
            }
            
            // === Vignetting super kuat khas Canon fisheye ===
            float vignette = 1.0f;
            if (strength > 0.0f) {
                // Semakin mendekati tepi lingkaran, semakin gelap (power 4–6)
                float edgeFalloff = 1.0f - r;  // 1 di tengah, 0 di tepi lingkaran
                vignette = std::pow(edgeFalloff, 4.0f + strength * 3.0f);
                vignette = std::max(0.0f, vignette);
                
                for (int c = 0; c < 3; ++c) {
                    float val = image.data[dstIdx + c] * vignette;
                    image.data[dstIdx + c] = static_cast<unsigned char>(std::clamp(val, 0.0f, 255.0f));
                }
            }
        }
    }
    
    std::cout << "Canon Circular Fisheye (stereographic) applied — mirip EF 8-15mm @8mm" << std::endl;
}