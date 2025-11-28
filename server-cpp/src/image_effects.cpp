// image_effects.cpp - SIMPLIFIED VERSION - Efek dipindahkan ke frontend
// NOTE: File ini hanya untuk backward compatibility, tidak ada processing efek

// Kompabilitas Windows
#ifdef _WIN32
    #define WIN32_LEAN_AND_MEAN
    #include <windows.h>
    #include <winsock2.h>
    #undef min
    #undef max
#endif

#define STB_IMAGE_IMPLEMENTATION
#define STB_IMAGE_WRITE_IMPLEMENTATION
#define STBI_NO_FAILURE_STRINGS
#define STBIW_WINDOWS_UTF8
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
        std::cout << "📝 NOTE: Effect set to " << static_cast<int>(effect) << " but processing moved to frontend" << std::endl;
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
    // NOTE: EFEX TELAH DIPINDAHKAN KE FRONTEND
    // Function ini sekarang hanya return original data tanpa processing
    try {
        if (currentEffect != EffectType::NONE) {
            std::cout << "📝 NOTE: Effect " << static_cast<int>(currentEffect) << " requested but processing moved to frontend" << std::endl;
        }
        
        // Safety check untuk ukuran data
        if (jpegData.empty()) {
            return jpegData;
        }
        
        if (jpegData.size() > 50000000) { // Max 50MB
            std::cerr << "❌ JPEG data too large: " << jpegData.size() << " bytes" << std::endl;
            return jpegData;
        }
        
        // Return original data tanpa processing
        return jpegData;
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

// ============ NOTE: SEMUA EFFECT IMPLEMENTATIONS TELAH DIPINDAHKAN KE FRONTEND ============
// Untuk performa yang lebih baik pada spek terbatas, semua processing efek sekarang dilakukan di frontend
// menggunakan Canvas API dan Web Workers

// Placeholder methods untuk backward compatibility (tidak melakukan apa-apa)
void ImageEffects::applyGrayscaleEffect(ImageData& image) {
    std::cout << "📝 NOTE: Grayscale effect moved to frontend" << std::endl;
}

void ImageEffects::applySepiaEffect(ImageData& image) {
    std::cout << "📝 NOTE: Sepia effect moved to frontend" << std::endl;
}

void ImageEffects::applyInvertEffect(ImageData& image) {
    std::cout << "📝 NOTE: Invert effect moved to frontend" << std::endl;
}

void ImageEffects::applyVignetteEffect(ImageData& image) {
    std::cout << "📝 NOTE: Vignette effect moved to frontend" << std::endl;
}

void ImageEffects::applyBlurEffect(ImageData& image) {
    std::cout << "📝 NOTE: Blur effect moved to frontend" << std::endl;
}

void ImageEffects::applySharpenEffect(ImageData& image) {
    std::cout << "📝 NOTE: Sharpen effect moved to frontend" << std::endl;
}

void ImageEffects::applyPixelateEffect(ImageData& image) {
    std::cout << "📝 NOTE: Pixelate effect moved to frontend" << std::endl;
}

void ImageEffects::applyFishEyeEffect(ImageData& image) {
    std::cout << "📝 NOTE: Fish Eye effect moved to frontend" << std::endl;
}

void ImageEffects::applyWideAngleEffect(ImageData& image) {
    std::cout << "📝 NOTE: Wide Angle effect moved to frontend" << std::endl;
}

// ============ GENERIC FILE IO (JPEG/PNG/BMP) ============
ImageData ImageEffects::decodeFile(const std::string& filePath) {
    ImageData out;
    int w=0,h=0,c=0;
    unsigned char* data = stbi_load(filePath.c_str(), &w, &h, &c, 3);
    if (!data || w<=0 || h<=0) return out;
    out.width = w; out.height = h; out.data.resize(static_cast<size_t>(w)*h*3);
    std::memcpy(out.data.data(), data, out.data.size());
    stbi_image_free(data);
    return out;
}

bool ImageEffects::encodeFile(const std::string& filePath, const ImageData& image) {
    if (image.data.empty() || image.width<=0 || image.height<=0) return false;
    auto toLower = [](char ch){ return static_cast<char>(std::tolower(static_cast<unsigned char>(ch))); };
    auto endsWith = [&](const std::string& ext){
        if (filePath.size() < ext.size()) return false;
        for (size_t i=0;i<ext.size();++i) {
            if (toLower(filePath[filePath.size()-ext.size()+i]) != toLower(ext[i])) return false;
        }
        return true;
    };
    if (endsWith(".png")) {
        return stbi_write_png(filePath.c_str(), image.width, image.height, 3, image.data.data(), image.width*3) != 0;
    } else if (endsWith(".bmp")) {
        return stbi_write_bmp(filePath.c_str(), image.width, image.height, 3, image.data.data()) != 0;
    } else {
        return stbi_write_jpg(filePath.c_str(), image.width, image.height, 3, image.data.data(), 85) != 0;
    }
}