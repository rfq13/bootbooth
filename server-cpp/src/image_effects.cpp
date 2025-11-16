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

// FISHEYE EFFECT - CANON STYLE dengan distorsi kuat dan barrel distortion
void ImageEffects::applyFishEyeEffect(ImageData& image) {
    const int w = image.width;
    const int h = image.height;
    
    // Safety check untuk ukuran gambar
    if (w <= 0 || h <= 0 || image.data.empty()) {
        std::cerr << "❌ Invalid image dimensions or empty data" << std::endl;
        return;
    }
    
    const float cx = w * 0.5f;
    const float cy = h * 0.5f;
    const float scaleX = cx;
    const float scaleY = cy;
    if (scaleX <= 0.0f || scaleY <= 0.0f) {
        std::cerr << "❌ Invalid scales" << std::endl;
        return;
    }
    
    // Parameter fisheye Canon-style (distorsi lebih kuat)
    const float intensity = static_cast<float>(params.intensity);
    const float distortionStrength = (intensity < 0.0f) ? 0.0f : (intensity > 1.0f) ? 1.0f : intensity;
    // Canon fisheye memiliki vignette yang lebih kuat di pinggir
    const float vignetteStrength = 0.3f * distortionStrength;
    
    std::vector<unsigned char> original = image.data;
    const size_t dataSize = original.size();
    
    // Loop utama - PROSES SELURUH GAMBAR dengan distorsi Canon-style
    for (int y = 0; y < h; ++y) {
        const float ny = (y - cy) / scaleY;
        const float ny2 = ny * ny;
        
        for (int x = 0; x < w; ++x) {
            // Normalisasi koordinat ke [-1, 1] relatif terhadap pusat
            const float nx = (x - cx) / scaleX;
            const float nx2 = nx * nx;
            
            // Hitung jarak dari pusat (dari 0 di tengah sampai 1 di sudut)
            const float r2 = nx2 + ny2;
            const float r = std::sqrt(r2);
            
            // Safety check untuk menghindari division by zero
            if (r < 1e-6f) {
                // Di tengah persis, tidak perlu distorsi
                continue;
            }
            
            // Canon-style fisheye dengan distorsi lebih kuat
            // Menggunakan model barrel distortion yang lebih kuat
            const float k1 = 1.5f * distortionStrength;  // Koefisien barrel distortion primer
            const float k2 = 0.5f * distortionStrength;  // Koefisien barrel distortion sekunder
            const float k3 = 0.2f * distortionStrength;  // Koefisien barrel distortion tersier
            
            // Model distorsi Canon-style: r' = r * (1 + k1*r² + k2*r⁴ + k3*r⁶)
            const float r4 = r2 * r2;
            const float r6 = r4 * r2;
            const float distortionFactor = 1.0f + k1 * r2 + k2 * r4 + k3 * r6;
            
            // Semakin jauh dari pusat, semakin kuat distorsi
            const float srcR = r * distortionFactor;
            const float factor = srcR / r;
            
            // Koordinat sumber dengan distorsi
            const float srcX = nx * factor * scaleX + cx;
            const float srcY = ny * factor * scaleY + cy;
            
            // Safety clamp koordinat (pastikan dalam batas gambar)
            const float clampedSrcX = std::max(0.0f, std::min(srcX, static_cast<float>(w - 1)));
            const float clampedSrcY = std::max(0.0f, std::min(srcY, static_cast<float>(h - 1)));
            
            // Koordinat integer untuk interpolasi
            const int sx0 = static_cast<int>(clampedSrcX);
            const int sy0 = static_cast<int>(clampedSrcY);
            const int sx1 = std::min(sx0 + 1, w - 1);
            const int sy1 = std::min(sy0 + 1, h - 1);
            
            // Faktor interpolasi
            const float fx = clampedSrcX - sx0;
            const float fy = clampedSrcY - sy0;
            
            // Index untuk interpolasi dengan boundary checks
            const int idx00 = (sy0 * w + sx0) * 3;
            const int idx01 = (sy0 * w + sx1) * 3;
            const int idx10 = (sy1 * w + sx0) * 3;
            const int idx11 = (sy1 * w + sx1) * 3;
            
            const int dstIdx = (y * w + x) * 3;
            
            // Safety check untuk destination index
            if (dstIdx < 0 || dstIdx + 2 >= static_cast<int>(dataSize)) {
                continue;
            }
            
            // Safety check untuk source indices
            if (idx00 < 0 || idx00 + 2 >= static_cast<int>(dataSize) ||
                idx01 < 0 || idx01 + 2 >= static_cast<int>(dataSize) ||
                idx10 < 0 || idx10 + 2 >= static_cast<int>(dataSize) ||
                idx11 < 0 || idx11 + 2 >= static_cast<int>(dataSize)) {
                continue;
            }
            
            // Vignetting effect khas lensa Canon fisheye
            float vignette = 1.0f;
            if (vignetteStrength > 0.0f) {
                // Vignetting yang lebih kuat di pinggir (eksponensial untuk efek lebih natural)
                const float edgeDistance = r; // 0 di tengah, 1 di sudut
                vignette = 1.0f - std::pow(edgeDistance, 2.5f) * vignetteStrength;
                vignette = std::max(0.2f, std::min(1.0f, vignette)); // Batasi minimum vignette
            }
            
            // Interpolasi bilinear untuk semua channel sekaligus
            for (int c = 0; c < 3; ++c) {
                // Interpolasi bilinear dengan safety checks
                const float val00 = static_cast<float>(original[idx00 + c]);
                const float val01 = static_cast<float>(original[idx01 + c]);
                const float val10 = static_cast<float>(original[idx10 + c]);
                const float val11 = static_cast<float>(original[idx11 + c]);
                
                const float interpolated = val00 * (1.0f - fx) * (1.0f - fy) +
                                        val01 * fx * (1.0f - fy) +
                                        val10 * (1.0f - fx) * fy +
                                        val11 * fx * fy;
                
                // Hasil akhir dengan clamping dan vignette
                const float finalVal = interpolated * vignette;
                image.data[dstIdx + c] = static_cast<unsigned char>(
                    std::max(0.0f, std::min(255.0f, finalVal))
                );
            }
        }
    }
    
    std::cout << "✅ Canon-style Fisheye applied (strength=" << distortionStrength << ")" << std::endl;
}