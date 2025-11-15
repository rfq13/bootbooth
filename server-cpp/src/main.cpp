#include "../include/server.h"
#include <iostream>
#include <csignal>
#include <cstring>
#include <sys/stat.h>
#include <unistd.h>
#include <thread>
#include <chrono>
#include <sstream>
#include <fstream>
#include <filesystem>
#include <cstdio>
#include <cstdlib>
#include <algorithm>

// Global server instance for signal handling
PhotoBoothServer* globalServer = nullptr;

// Signal handler for graceful shutdown
void signalHandler(int signum) {
    std::cout << "\nReceived signal " << signum << ", shutting down server..." << std::endl;
    if (globalServer) {
        globalServer->stop();
    }
    exit(signum);
}

// Utility function implementations
std::string getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()).count();
    return std::to_string(timestamp);
}

bool createDirectories(const std::string& path) {
    struct stat info;
    if (stat(path.c_str(), &info) != 0) {
        // Directory doesn't exist, create it
        if (mkdir(path.c_str(), 0755) != 0) {
            std::cerr << "Error creating directory: " << path << std::endl;
            return false;
        }
        return true;
    } else if (info.st_mode & S_IFDIR) {
        // Directory exists
        return true;
    } else {
        // Path exists but is not a directory
        std::cerr << "Path exists but is not a directory: " << path << std::endl;
        return false;
    }
}

std::vector<std::string> splitString(const std::string& s, char delimiter) {
    std::vector<std::string> tokens;
    std::string token;
    std::istringstream tokenStream(s);
    while (std::getline(tokenStream, token, delimiter)) {
        tokens.push_back(token);
    }
    return tokens;
}

void parseJsonObject(const std::string& jsonStr, std::map<std::string, std::string>& result, const std::string& prefix) {
    std::cout << "🔍 Parsing JSON object with prefix: " << prefix << std::endl;
    
    size_t pos = 0;
    while (pos < jsonStr.length()) {
        // Find key
        size_t keyStart = jsonStr.find("\"", pos);
        if (keyStart == std::string::npos) break;
        
        size_t keyEnd = jsonStr.find("\"", keyStart + 1);
        if (keyEnd == std::string::npos) break;
        
        std::string key = jsonStr.substr(keyStart + 1, keyEnd - keyStart - 1);
        std::string fullKey = prefix.empty() ? key : prefix + "." + key;
        
        // Find colon
        size_t colonPos = jsonStr.find(":", keyEnd);
        if (colonPos == std::string::npos) break;
        
        // Skip whitespace
        size_t valueStart = colonPos + 1;
        while (valueStart < jsonStr.length() && (jsonStr[valueStart] == ' ' || jsonStr[valueStart] == '\t')) {
            valueStart++;
        }
        
        if (valueStart >= jsonStr.length()) break;
        
        // Check value type
        char valueChar = jsonStr[valueStart];
        
        if (valueChar == '{') {
            // Nested object
            size_t nestedStart = valueStart;
            int braceCount = 1;
            size_t nestedEnd = nestedStart + 1;
            
            while (nestedEnd < jsonStr.length() && braceCount > 0) {
                if (jsonStr[nestedEnd] == '{') braceCount++;
                else if (jsonStr[nestedEnd] == '}') braceCount--;
                nestedEnd++;
            }
            
            if (braceCount == 0) {
                std::string nestedObj = jsonStr.substr(nestedStart, nestedEnd - nestedStart);
                parseJsonObject(nestedObj, result, fullKey);
                pos = nestedEnd;
            } else {
                break;
            }
        } else if (valueChar == '[') {
            // Array - skip for now
            size_t arrayStart = valueStart;
            int bracketCount = 1;
            size_t arrayEnd = arrayStart + 1;
            
            while (arrayEnd < jsonStr.length() && bracketCount > 0) {
                if (jsonStr[arrayEnd] == '[') bracketCount++;
                else if (jsonStr[arrayEnd] == ']') bracketCount--;
                arrayEnd++;
            }
            
            if (bracketCount == 0) {
                std::string arrayValue = jsonStr.substr(arrayStart, arrayEnd - arrayStart);
                result[fullKey] = arrayValue;
                std::cout << "🔑 Parsed array: " << fullKey << " = " << arrayValue << std::endl;
                pos = arrayEnd;
            } else {
                break;
            }
        } else if (valueChar == '"') {
            // String value
            size_t valueEnd = jsonStr.find("\"", valueStart + 1);
            if (valueEnd != std::string::npos) {
                std::string value = jsonStr.substr(valueStart + 1, valueEnd - valueStart - 1);
                result[fullKey] = value;
                std::cout << "🔑 Parsed string: " << fullKey << " = " << value << std::endl;
                pos = valueEnd + 1;
            } else {
                break;
            }
        } else {
            // Number or boolean value
            size_t valueEnd = valueStart;
            while (valueEnd < jsonStr.length() &&
                   jsonStr[valueEnd] != ',' &&
                   jsonStr[valueEnd] != '}' &&
                   jsonStr[valueEnd] != ']' &&
                   jsonStr[valueEnd] != ' ' &&
                   jsonStr[valueEnd] != '\t') {
                valueEnd++;
            }
            
            std::string value = jsonStr.substr(valueStart, valueEnd - valueStart);
            result[fullKey] = value;
            std::cout << "🔑 Parsed value: " << fullKey << " = " << value << std::endl;
            pos = valueEnd;
        }
        
        // Find comma or closing brace
        while (pos < jsonStr.length() &&
               (jsonStr[pos] == ',' ||
                jsonStr[pos] == ' ' ||
                jsonStr[pos] == '\t' ||
                jsonStr[pos] == '\n' ||
                jsonStr[pos] == '\r')) {
            pos++;
        }
        
        if (pos < jsonStr.length() && jsonStr[pos] == '}') {
            break;
        }
    }
}

std::string urlEncode(const std::string& str) {
    std::string encoded;
    for (char c : str) {
        if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
            encoded += c;
        } else {
            char buf[4];
            snprintf(buf, sizeof(buf), "%%%02X", (unsigned char)c);
            encoded += buf;
        }
    }
    return encoded;
}

// ImageEffects implementation
ImageEffects::ImageEffects() : currentEffect(EffectType::NONE) {
    params.intensity = 0.5;
    params.radius = 1.0;
    params.pixelSize = 10;
}

void ImageEffects::setEffect(EffectType effect, const EffectParams& params) {
    mutex.lock();
    this->currentEffect = effect;
    this->params = params;
    mutex.unlock();
}

std::pair<EffectType, EffectParams> ImageEffects::getEffect() const {
    mutex.lock();
    auto result = std::make_pair(currentEffect, params);
    mutex.unlock();
    return result;
}

std::vector<unsigned char> ImageEffects::applyEffect(const std::vector<unsigned char>& jpegData) {
    if (currentEffect == EffectType::NONE) {
        return jpegData;
    }
    
    // Decode JPEG to RGB
    ImageData rgbData = decodeJPEG(jpegData);
    if (rgbData.data.empty() || rgbData.width == 0 || rgbData.height == 0) {
        std::cerr << "Failed to decode JPEG, returning original data" << std::endl;
        return jpegData;
    }
    
    // Apply effect
    switch (currentEffect) {
        case EffectType::FISHEYE:
            applyFishEyeEffect(rgbData);
            break;
        case EffectType::GRAYSCALE:
            applyGrayscaleEffect(rgbData);
            break;
        case EffectType::SEPIA:
            applySepiaEffect(rgbData);
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
        case EffectType::INVERT:
            applyInvertEffect(rgbData);
            break;
        case EffectType::PIXELATE:
            applyPixelateEffect(rgbData);
            break;
        default:
            break;
    }
    
    // Encode back to JPEG
    return encodeJPEG(rgbData);
}

// JPEG decoding function (simplified)
ImageData ImageEffects::decodeJPEG(const std::vector<unsigned char>& jpegData) {
    ImageData result;
    
    // For now, create a simple RGB buffer from JPEG data
    // In a real implementation, we would use a JPEG library like libjpeg
    
    // Check if JPEG data is valid (starts with FF D8)
    if (jpegData.size() < 2 || jpegData[0] != 0xFF || jpegData[1] != 0xD8) {
        std::cerr << "❌ Invalid JPEG data" << std::endl;
        return result;
    }
    
    // Simple approach: assume JPEG is valid and create a dummy RGB buffer
    // This is a placeholder - real implementation would decode JPEG properly
    result.width = 640;  // Default width
    result.height = 480; // Default height
    result.data.resize(result.width * result.height * 3);
    
    // Copy JPEG data as RGB (simplified approach)
    // In a real implementation, we would properly decode JPEG to RGB
    size_t jpegSize = jpegData.size();
    size_t rgbSize = result.data.size();
    
    // Simple conversion - this is not correct JPEG decoding but works for our placeholder
    for (size_t i = 0; i < rgbSize && i < jpegSize; i += 3) {
        // Extract some color information from JPEG data
        size_t jpegIndex = (i * jpegSize) / rgbSize; // Scale to JPEG size
        
        if (jpegIndex + 2 < jpegSize) {
            // Use JPEG data as RGB (not correct but works for placeholder)
            result.data[i] = jpegData[jpegIndex];         // R
            result.data[i + 1] = jpegData[jpegIndex + 1]; // G
            result.data[i + 2] = jpegData[jpegIndex + 2]; // B
        } else {
            // Default gray color
            result.data[i] = 128;     // R
            result.data[i + 1] = 128; // G
            result.data[i + 2] = 128; // B
        }
    }
    
    std::cout << "🖼️ Decoded JPEG to RGB: " << result.width << "x" << result.height << std::endl;
    return result;
}

// JPEG encoding function (simplified)
std::vector<unsigned char> ImageEffects::encodeJPEG(const ImageData& rgbData) {
    // For now, create a simple JPEG from RGB data
    // In a real implementation, we would use a JPEG library like libjpeg
    
    std::vector<unsigned char> jpegData;
    
    // JPEG file signature
    jpegData.push_back(0xFF);
    jpegData.push_back(0xD8);
    jpegData.push_back(0xFF);
    jpegData.push_back(0xE0);
    
    // Add some basic JPEG markers (placeholder)
    jpegData.push_back(0x00);
    jpegData.push_back(0x10);
    jpegData.push_back('J');
    jpegData.push_back('F');
    jpegData.push_back('I');
    jpegData.push_back('F');
    jpegData.push_back(0x00);
    jpegData.push_back(0x01);
    jpegData.push_back(0x01);
    jpegData.push_back(0x01);
    jpegData.push_back(0x48);
    jpegData.push_back(0x48);
    jpegData.push_back(0x00);
    jpegData.push_back(0x00);
    
    // Add image data (simplified)
    // In a real implementation, we would properly encode RGB to JPEG
    for (size_t i = 0; i < rgbData.data.size(); i += 3) {
        jpegData.push_back(rgbData.data[i]);     // R
        jpegData.push_back(rgbData.data[i + 1]); // G
        jpegData.push_back(rgbData.data[i + 2]); // B
    }
    
    // JPEG end marker
    jpegData.push_back(0xFF);
    jpegData.push_back(0xD9);
    
    std::cout << "🖼️ Encoded RGB to JPEG: " << rgbData.width << "x" << rgbData.height << std::endl;
    return jpegData;
}

// Real effect implementations
void ImageEffects::applyFishEyeEffect(ImageData& image) {
    int width = image.width;
    int height = image.height;
    int centerX = width / 2;
    int centerY = height / 2;
    double radius = std::min(width, height) / 2.0;
    double strength = params.intensity * 2.0;
    
    std::cout << "🐟 Applying FishEye effect with intensity: " << params.intensity << std::endl;
    
    std::vector<unsigned char> originalData = image.data;
    
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            double dx = x - centerX;
            double dy = y - centerY;
            double distance = std::sqrt(dx * dx + dy * dy);
            
            if (distance < radius) {
                double percent = (radius - distance) / radius;
                double theta = percent * percent * strength;
                double sourceX = centerX + dx * std::cos(theta) - dy * std::sin(theta);
                double sourceY = centerY + dx * std::sin(theta) + dy * std::cos(theta);
                
                if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
                    int srcX = static_cast<int>(sourceX);
                    int srcY = static_cast<int>(sourceY);
                    int srcIndex = (srcY * width + srcX) * 3;
                    int dstIndex = (y * width + x) * 3;
                    
                    if (srcIndex >= 0 && srcIndex < static_cast<int>(originalData.size()) - 2 &&
                        dstIndex >= 0 && dstIndex < static_cast<int>(image.data.size()) - 2) {
                        image.data[dstIndex] = originalData[srcIndex];
                        image.data[dstIndex + 1] = originalData[srcIndex + 1];
                        image.data[dstIndex + 2] = originalData[srcIndex + 2];
                    }
                }
            }
        }
    }
}

void ImageEffects::applyGrayscaleEffect(ImageData& image) {
    std::cout << "⚫ Applying Grayscale effect with intensity: " << params.intensity << std::endl;
    
    for (size_t i = 0; i < image.data.size(); i += 3) {
        unsigned char r = image.data[i];
        unsigned char g = image.data[i + 1];
        unsigned char b = image.data[i + 2];
        
        // Calculate grayscale value
        unsigned char gray = static_cast<unsigned char>(0.299 * r + 0.587 * g + 0.114 * b);
        
        // Apply grayscale with intensity
        image.data[i] = static_cast<unsigned char>(r * (1.0 - params.intensity) + gray * params.intensity);
        image.data[i + 1] = static_cast<unsigned char>(g * (1.0 - params.intensity) + gray * params.intensity);
        image.data[i + 2] = static_cast<unsigned char>(b * (1.0 - params.intensity) + gray * params.intensity);
    }
}

void ImageEffects::applySepiaEffect(ImageData& image) {
    std::cout << "🟤 Applying Sepia effect with intensity: " << params.intensity << std::endl;
    
    for (size_t i = 0; i < image.data.size(); i += 3) {
        unsigned char r = image.data[i];
        unsigned char g = image.data[i + 1];
        unsigned char b = image.data[i + 2];
        
        // Calculate sepia values
        int tr = static_cast<int>(0.393 * r + 0.769 * g + 0.189 * b);
        int tg = static_cast<int>(0.349 * r + 0.686 * g + 0.168 * b);
        int tb = static_cast<int>(0.272 * r + 0.534 * g + 0.131 * b);
        
        // Clamp values
        tr = std::min(255, tr);
        tg = std::min(255, tg);
        tb = std::min(255, tb);
        
        // Apply sepia with intensity
        image.data[i] = static_cast<unsigned char>(r * (1.0 - params.intensity) + tr * params.intensity);
        image.data[i + 1] = static_cast<unsigned char>(g * (1.0 - params.intensity) + tg * params.intensity);
        image.data[i + 2] = static_cast<unsigned char>(b * (1.0 - params.intensity) + tb * params.intensity);
    }
}

void ImageEffects::applyVignetteEffect(ImageData& image) {
    int width = image.width;
    int height = image.height;
    int centerX = width / 2;
    int centerY = height / 2;
    double maxRadius = std::sqrt(centerX * centerX + centerY * centerY);
    double vignetteStrength = params.intensity * 2.0;
    
    std::cout << "🌑 Applying Vignette effect with intensity: " << params.intensity << std::endl;
    
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            double dx = x - centerX;
            double dy = y - centerY;
            double distance = std::sqrt(dx * dx + dy * dy);
            double vignette = 1.0 - (distance / maxRadius) * vignetteStrength;
            vignette = std::max(0.0, std::min(1.0, vignette));
            
            int index = (y * width + x) * 3;
            if (index < static_cast<int>(image.data.size()) - 2) {
                image.data[index] = static_cast<unsigned char>(image.data[index] * vignette);
                image.data[index + 1] = static_cast<unsigned char>(image.data[index + 1] * vignette);
                image.data[index + 2] = static_cast<unsigned char>(image.data[index + 2] * vignette);
            }
        }
    }
}

void ImageEffects::applyBlurEffect(ImageData& image) {
    int width = image.width;
    int height = image.height;
    int kernelSize = static_cast<int>(params.radius * 5.0);
    if (kernelSize < 3) kernelSize = 3;
    if (kernelSize % 2 == 0) kernelSize++; // Make odd
    
    std::cout << "🌫️ Applying Blur effect with radius: " << params.radius << " and intensity: " << params.intensity << std::endl;
    
    std::vector<unsigned char> originalData = image.data;
    
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            double r = 0, g = 0, b = 0;
            int count = 0;
            
            for (int ky = -kernelSize/2; ky <= kernelSize/2; ++ky) {
                for (int kx = -kernelSize/2; kx <= kernelSize/2; ++kx) {
                    int nx = x + kx;
                    int ny = y + ky;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        int index = (ny * width + nx) * 3;
                        if (index < static_cast<int>(originalData.size()) - 2) {
                            r += originalData[index];
                            g += originalData[index + 1];
                            b += originalData[index + 2];
                            count++;
                        }
                    }
                }
            }
            
            if (count > 0) {
                int index = (y * width + x) * 3;
                if (index < static_cast<int>(image.data.size()) - 2) {
                    image.data[index] = static_cast<unsigned char>(r / count * params.intensity + originalData[index] * (1.0 - params.intensity));
                    image.data[index + 1] = static_cast<unsigned char>(g / count * params.intensity + originalData[index + 1] * (1.0 - params.intensity));
                    image.data[index + 2] = static_cast<unsigned char>(b / count * params.intensity + originalData[index + 2] * (1.0 - params.intensity));
                }
            }
        }
    }
}

void ImageEffects::applySharpenEffect(ImageData& image) {
    int width = image.width;
    int height = image.height;
    std::vector<unsigned char> originalData = image.data;
    
    // Sharpen kernel
    double kernel[3][3] = {
        {0, -1, 0},
        {-1, 5, -1},
        {0, -1, 0}
    };
    
    std::cout << "🔪 Applying Sharpen effect with intensity: " << params.intensity << std::endl;
    
    for (int y = 1; y < height - 1; ++y) {
        for (int x = 1; x < width - 1; ++x) {
            double r = 0, g = 0, b = 0;
            
            for (int ky = -1; ky <= 1; ++ky) {
                for (int kx = -1; kx <= 1; ++kx) {
                    int nx = x + kx;
                    int ny = y + ky;
                    int index = (ny * width + nx) * 3;
                    
                    if (index < static_cast<int>(originalData.size()) - 2) {
                        double weight = kernel[ky + 1][kx + 1] * params.intensity;
                        if (ky == 0 && kx == 0) {
                            weight = 1.0 + (weight - 1.0) * params.intensity;
                        }
                        r += originalData[index] * weight;
                        g += originalData[index + 1] * weight;
                        b += originalData[index + 2] * weight;
                    }
                }
            }
            
            int index = (y * width + x) * 3;
            if (index < static_cast<int>(image.data.size()) - 2) {
                image.data[index] = static_cast<unsigned char>(std::max(0, std::min(255, static_cast<int>(r))));
                image.data[index + 1] = static_cast<unsigned char>(std::max(0, std::min(255, static_cast<int>(g))));
                image.data[index + 2] = static_cast<unsigned char>(std::max(0, std::min(255, static_cast<int>(b))));
            }
        }
    }
}

void ImageEffects::applyInvertEffect(ImageData& image) {
    std::cout << "🔄 Applying Invert effect with intensity: " << params.intensity << std::endl;
    
    for (size_t i = 0; i < image.data.size(); i += 3) {
        image.data[i] = static_cast<unsigned char>(image.data[i] * (1.0 - params.intensity) + (255 - image.data[i]) * params.intensity);
        image.data[i + 1] = static_cast<unsigned char>(image.data[i + 1] * (1.0 - params.intensity) + (255 - image.data[i + 1]) * params.intensity);
        image.data[i + 2] = static_cast<unsigned char>(image.data[i + 2] * (1.0 - params.intensity) + (255 - image.data[i + 2]) * params.intensity);
    }
}

void ImageEffects::applyPixelateEffect(ImageData& image) {
    int width = image.width;
    int height = image.height;
    int pixelSize = std::max(1, params.pixelSize);
    
    std::cout << "🎮 Applying Pixelate effect with pixelSize: " << params.pixelSize << " and intensity: " << params.intensity << std::endl;
    
    std::vector<unsigned char> originalData = image.data;
    
    for (int y = 0; y < height; y += pixelSize) {
        for (int x = 0; x < width; x += pixelSize) {
            // Calculate average color for this pixel block
            double r = 0, g = 0, b = 0;
            int count = 0;
            
            for (int dy = 0; dy < pixelSize && y + dy < height; ++dy) {
                for (int dx = 0; dx < pixelSize && x + dx < width; ++dx) {
                    int index = ((y + dy) * width + (x + dx)) * 3;
                    if (index < static_cast<int>(originalData.size()) - 2) {
                        r += originalData[index];
                        g += originalData[index + 1];
                        b += originalData[index + 2];
                        count++;
                    }
                }
            }
            
            if (count > 0) {
                r /= count;
                g /= count;
                b /= count;
                
                // Apply average color to all pixels in block
                for (int dy = 0; dy < pixelSize && y + dy < height; ++dy) {
                    for (int dx = 0; dx < pixelSize && x + dx < width; ++dx) {
                        int index = ((y + dy) * width + (x + dx)) * 3;
                        if (index < static_cast<int>(image.data.size()) - 2) {
                            image.data[index] = static_cast<unsigned char>(originalData[index] * (1.0 - params.intensity) + r * params.intensity);
                            image.data[index + 1] = static_cast<unsigned char>(originalData[index + 1] * (1.0 - params.intensity) + g * params.intensity);
                            image.data[index + 2] = static_cast<unsigned char>(originalData[index + 2] * (1.0 - params.intensity) + b * params.intensity);
                        }
                    }
                }
            }
        }
    }
}

// Placeholder effect implementations for backward compatibility
std::vector<unsigned char> ImageEffects::applyFishEye(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::FISHEYE, params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applyGrayscale(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::GRAYSCALE, params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applySepia(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::SEPIA, params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applyVignette(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::VIGNETTE, params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applyBlur(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::BLUR, params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applySharpen(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::SHARPEN, params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applyInvert(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::INVERT, params);
    return effects.applyEffect(imageData);
}

std::vector<unsigned char> ImageEffects::applyPixelate(const std::vector<unsigned char>& imageData) {
    ImageEffects effects;
    effects.setEffect(EffectType::PIXELATE, params);
    return effects.applyEffect(imageData);
}

// GPhotoWrapper implementation
GPhotoWrapper::GPhotoWrapper(const std::string& outputDir, const std::string& previewDir)
    : outputDir(outputDir), previewDir(previewDir), isPreviewActive(false) {
    // Create directories if they don't exist
    createDirectories(outputDir);
    createDirectories(previewDir);
}

GPhotoWrapper::~GPhotoWrapper() {
    if (isPreviewActive) {
        stopPreviewStream();
    }
}

std::vector<Camera> GPhotoWrapper::detectCamera() {
    std::vector<Camera> cameras;
    
    // Execute gphoto2 --auto-detect command
    std::string result = executeCommand("gphoto2 --auto-detect");
    
    // Parse the output to extract camera information
    std::vector<std::string> lines = splitString(result, '\n');
    
    // Skip header lines (first 2 lines)
    for (size_t i = 2; i < lines.size(); ++i) {
        std::string line = lines[i];
        if (line.empty()) continue;
        
        // Parse camera model and port
        std::vector<std::string> parts;
        std::string current;
        bool inSpace = false;
        
        for (char c : line) {
            if (c == ' ' || c == '\t') {
                if (!inSpace && !current.empty()) {
                    parts.push_back(current);
                    current.clear();
                }
                inSpace = true;
            } else {
                current += c;
                inSpace = false;
            }
        }
        
        if (!current.empty()) {
            parts.push_back(current);
        }
        
        if (parts.size() >= 2) {
            Camera camera;
            camera.model = parts[0];
            camera.port = parts[1];
            cameras.push_back(camera);
        }
    }
    
    return cameras;
}

std::map<std::string, std::string> GPhotoWrapper::capturePreviewFrame() {
    std::map<std::string, std::string> result;
    
    // Generate filename with timestamp
    std::string timestamp = getCurrentTimestamp();
    std::string filename = "preview_" + timestamp + ".jpg";
    std::string path = previewDir + "/" + filename;
    
    // Execute gphoto2 --capture-preview command
    std::string command = "gphoto2 --capture-preview --force-overwrite --filename " + path;
    std::string cmdResult = executeCommand(command);
    
    // Check if the preview file was created
    std::vector<unsigned char> imageData = readImageFile(path);
    if (imageData.empty()) {
        result["success"] = "false";
        result["error"] = "Preview file not created";
        return result;
    }
    
    // Apply effects if any
    std::vector<unsigned char> processedData = effects.applyEffect(imageData);
    
    // Clean up old preview files
    cleanupPreviews(3);
    
    // Convert to base64 for JSON response
    std::string base64Image = "data:image/jpeg;base64," + base64Encode(processedData);
    
    result["success"] = "true";
    result["image"] = base64Image;
    result["timestamp"] = timestamp;
    
    return result;
}

std::map<std::string, std::string> GPhotoWrapper::startPreviewStream(
    std::function<void(const std::string&, const std::map<std::string, std::string>&)> emit, 
    int fps) {
    std::map<std::string, std::string> result;
    
    if (isPreviewActive) {
        result["success"] = "false";
        result["error"] = "Preview already active";
        return result;
    }
    
    isPreviewActive = true;
    
    // Start preview thread
    std::thread previewThread([this, emit, fps]() {
        int interval = 1000 / fps; // Interval in milliseconds
        
        while (isPreviewActive) {
            auto frame = capturePreviewFrame();
            if (frame["success"] == "true") {
                emit("previewFrame", frame);
            } else {
                emit("preview-error", frame);
            }
            
            std::this_thread::sleep_for(std::chrono::milliseconds(interval));
        }
    });
    
    previewThread.detach(); // Detach the thread to run independently
    
    result["success"] = "true";
    result["fps"] = std::to_string(fps);
    
    return result;
}

std::map<std::string, std::string> GPhotoWrapper::stopPreviewStream() {
    std::map<std::string, std::string> result;
    
    if (isPreviewActive) {
        isPreviewActive = false;
        result["success"] = "true";
    } else {
        result["success"] = "false";
        result["error"] = "Preview not active";
    }
    
    return result;
}

std::map<std::string, std::string> GPhotoWrapper::captureImage() {
    std::map<std::string, std::string> result;
    
    // Generate filename with timestamp
    std::string timestamp = getCurrentTimestamp();
    std::string filename = "photo_" + timestamp + ".jpg";
    std::string path = outputDir + "/" + filename;
    
    // Execute gphoto2 --capture-image-and-download command
    std::string command = "gphoto2 --capture-image-and-download --filename " + path + " --skip-existing";
    std::string cmdResult = executeCommand(command);
    
    // Check if the image file was created
    std::vector<unsigned char> imageData = readImageFile(path);
    if (imageData.empty()) {
        result["success"] = "false";
        result["error"] = "Photo file not created";
        return result;
    }
    
    // Apply effects if any
    std::vector<unsigned char> processedData = effects.applyEffect(imageData);
    if (!processedData.empty()) {
        writeImageFile(path, processedData);
    }
    
    result["success"] = "true";
    result["filename"] = filename;
    result["filepath"] = path;
    result["url"] = "/uploads/" + filename;
    result["timestamp"] = timestamp;
    
    return result;
}

void GPhotoWrapper::cleanupPreviews(int keepLast) {
    // Simple implementation - just remove old preview files
    // In a real implementation, this would be more sophisticated
}

void GPhotoWrapper::setEffect(EffectType effect, const EffectParams& params) {
    effects.setEffect(effect, params);
}

std::pair<EffectType, EffectParams> GPhotoWrapper::getCurrentEffect() const {
    return effects.getEffect();
}

std::string GPhotoWrapper::executeCommand(const std::string& command) {
    std::string result;
    
    // Open pipe to command
    FILE* pipe = popen(command.c_str(), "r");
    if (!pipe) {
        std::cerr << "Error executing command: " << command << std::endl;
        return "";
    }
    
    // Read output
    char buffer[128];
    while (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
        result += buffer;
    }
    
    // Close pipe
    int exitCode = pclose(pipe);
    
    return result;
}

std::vector<unsigned char> GPhotoWrapper::readImageFile(const std::string& filePath) {
    std::vector<unsigned char> data;
    
    std::ifstream file(filePath, std::ios::binary);
    if (!file) {
        std::cerr << "Error opening file for reading: " << filePath << std::endl;
        return data;
    }
    
    // Get file size
    file.seekg(0, std::ios::end);
    size_t fileSize = file.tellg();
    file.seekg(0, std::ios::beg);
    
    // Read file content
    data.resize(fileSize);
    if (!file.read(reinterpret_cast<char*>(data.data()), fileSize)) {
        std::cerr << "Error reading file: " << filePath << std::endl;
        data.clear();
    }
    
    return data;
}

bool GPhotoWrapper::writeImageFile(const std::string& filePath, const std::vector<unsigned char>& data) {
    std::ofstream file(filePath, std::ios::binary);
    if (!file) {
        std::cerr << "Error opening file for writing: " << filePath << std::endl;
        return false;
    }
    
    // Write file content
    if (!file.write(reinterpret_cast<const char*>(data.data()), data.size())) {
        std::cerr << "Error writing file: " << filePath << std::endl;
        return false;
    }
    
    return true;
}

std::string GPhotoWrapper::base64Encode(const std::vector<unsigned char>& data) {
    const std::string base64Chars = 
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz"
        "0123456789+/";
    
    std::string result;
    int i = 0;
    int j = 0;
    unsigned char charArray3[3];
    unsigned char charArray4[4];
    
    for (unsigned char c : data) {
        charArray3[i++] = c;
        if (i == 3) {
            charArray4[0] = (charArray3[0] & 0xfc) >> 2;
            charArray4[1] = ((charArray3[0] & 0x03) << 4) + ((charArray3[1] & 0xf0) >> 4);
            charArray4[2] = ((charArray3[1] & 0x0f) << 2) + ((charArray3[2] & 0xc0) >> 6);
            charArray4[3] = charArray3[2] & 0x3f;
            
            for (i = 0; i < 4; i++) {
                result += base64Chars[charArray4[i]];
            }
            i = 0;
        }
    }
    
    if (i) {
        for (j = i; j < 3; j++) {
            charArray3[j] = '\0';
        }
        
        charArray4[0] = (charArray3[0] & 0xfc) >> 2;
        charArray4[1] = ((charArray3[0] & 0x03) << 4) + ((charArray3[1] & 0xf0) >> 4);
        charArray4[2] = ((charArray3[1] & 0x0f) << 2) + ((charArray3[2] & 0xc0) >> 6);
        charArray4[3] = charArray3[2] & 0x3f;
        
        for (j = 0; j < i + 1; j++) {
            result += base64Chars[charArray4[j]];
        }
        
        while (i++ < 3) {
            result += '=';
        }
    }
    
    return result;
}

// MJPEGServer implementation
MJPEGServer::MJPEGServer(int port) 
    : port(port), isStreaming(false), serverSocket(-1), streamProcessPid(-1), stdoutFd(-1), stderrFd(-1) {
    // Initialize frame buffer
    frameBuffer.reserve(1024 * 512); // 512KB initial capacity
}

MJPEGServer::~MJPEGServer() {
    stop();
}

bool MJPEGServer::start() {
    if (serverSocket != -1) {
        std::cout << "⚠️ MJPEG server already started on port " << port << std::endl;
        return true; // Already started
    }
    
    std::cout << "🚀 Starting MJPEG server on port " << port << std::endl;
    
    // Create socket
    serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSocket < 0) {
        std::cerr << "❌ Error creating MJPEG server socket: " << strerror(errno) << std::endl;
        return false;
    }
    
    // Set socket options
    int opt = 1;
    if (setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        std::cerr << "❌ Error setting MJPEG server socket options: " << strerror(errno) << std::endl;
        close(serverSocket);
        serverSocket = -1;
        return false;
    }
    
    // Bind socket to port
    struct sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(port);
    
    if (bind(serverSocket, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        std::cerr << "❌ Error binding MJPEG server socket to port " << port << ": " << strerror(errno) << std::endl;
        close(serverSocket);
        serverSocket = -1;
        return false;
    }
    
    // Listen for connections
    if (listen(serverSocket, 10) < 0) {
        std::cerr << "❌ Error listening on MJPEG server socket: " << strerror(errno) << std::endl;
        close(serverSocket);
        serverSocket = -1;
        return false;
    }
    
    // Start server thread
    std::thread serverThread([this]() {
        this->setupRoutes();
    });
    serverThread.detach();
    
    std::cout << "✅ MJPEG server started successfully on port " << port << std::endl;
    return true;
}

bool MJPEGServer::stop() {
    if (serverSocket == -1) {
        return true; // Already stopped
    }
    
    // Stop streaming if active
    stopStream();
    
    // Close all client connections
    closeAllClients();
    
    // Close server socket
    close(serverSocket);
    serverSocket = -1;
    
    std::cout << "MJPEG server stopped" << std::endl;
    return true;
}

std::tuple<bool, std::string, std::string> MJPEGServer::startStream() {
    if (isStreaming) {
        std::cout << "⚠️ MJPEG stream already active" << std::endl;
        return std::make_tuple(false, "Stream sudah aktif", "");
    }
    
    std::cout << "🚀 Starting MJPEG stream..." << std::endl;
    
    // Clear old frame buffer
    frameBuffer.clear();
    frameBuffer.reserve(1024 * 512); // 512KB initial capacity
    
    int outPipe[2];
    int errPipe[2];
    if (pipe(outPipe) < 0 || pipe(errPipe) < 0) {
        std::cerr << "❌ Error creating pipes for gphoto2" << std::endl;
        return std::make_tuple(false, "Gagal membuat pipe", "");
    }
    
    pid_t pid = fork();
    if (pid < 0) {
        std::cerr << "❌ Error forking gphoto2 process" << std::endl;
        close(outPipe[0]); close(outPipe[1]);
        close(errPipe[0]); close(errPipe[1]);
        return std::make_tuple(false, "Gagal fork proses", "");
    }
    
    if (pid == 0) {
        // Child: redirect stdout/stderr and exec gphoto2
        dup2(outPipe[1], STDOUT_FILENO);
        dup2(errPipe[1], STDERR_FILENO);
        close(outPipe[0]); close(outPipe[1]);
        close(errPipe[0]); close(errPipe[1]);
        
        std::cout << "📷 Executing gphoto2 --stdout --capture-movie" << std::endl;
        execlp("gphoto2", "gphoto2", "--stdout", "--capture-movie", (char*)nullptr);
        // If exec fails
        std::cerr << "❌ Failed to execute gphoto2" << std::endl;
        _exit(127);
    }
    
    // Parent
    close(outPipe[1]);
    close(errPipe[1]);
    stdoutFd = outPipe[0];
    stderrFd = errPipe[0];
    streamProcessPid = pid;
    
    // Set non-blocking reads
    int flagsOut = fcntl(stdoutFd, F_GETFL, 0);
    fcntl(stdoutFd, F_SETFL, flagsOut | O_NONBLOCK);
    int flagsErr = fcntl(stderrFd, F_GETFL, 0);
    fcntl(stderrFd, F_SETFL, flagsErr | O_NONBLOCK);
    
    isStreaming = true;
    
    // Consume stderr to avoid blocking
    std::thread errThread([this]() {
        char buf[4096];
        while (isStreaming && stderrFd != -1) {
            ssize_t n = read(stderrFd, buf, sizeof(buf));
            if (n > 0) {
                std::string msg(buf, buf + n);
                if (msg.find("Capturing preview frames as movie") == std::string::npos &&
                    msg.find("NEW folder") == std::string::npos) {
                    std::cerr << "⚠️ GPhoto2 error: " << msg << std::endl;
                }
            } else {
                std::this_thread::sleep_for(std::chrono::milliseconds(10));
            }
        }
    });
    errThread.detach();
    
    // Read stdout, parse JPEG frames and broadcast
    std::thread outThread([this]() {
        const unsigned char startMarker[2] = {0xFF, 0xD8};
        const unsigned char endMarker[2] = {0xFF, 0xD9};
        std::vector<unsigned char> readBuf(64 * 1024);
        int frameCount = 0;
        
        while (isStreaming && stdoutFd != -1) {
            ssize_t n = read(stdoutFd, readBuf.data(), readBuf.size());
            if (n > 0) {
                frameBuffer.insert(frameBuffer.end(), readBuf.begin(), readBuf.begin() + n);
                // Cap buffer size to ~1MB, keep last 512KB
                if (frameBuffer.size() > 1024 * 1024) {
                    frameBuffer.erase(frameBuffer.begin(), frameBuffer.end() - (1024 * 512));
                }
                // Extract frames
                for (;;) {
                    auto itStart = std::search(frameBuffer.begin(), frameBuffer.end(), startMarker, startMarker + 2);
                    if (itStart == frameBuffer.end()) break;
                    auto itEnd = std::search(itStart + 2, frameBuffer.end(), endMarker, endMarker + 2);
                    if (itEnd == frameBuffer.end()) break;
                    std::vector<unsigned char> frame(itStart, itEnd + 2);
                    
                    // Apply effects before sending
                    std::vector<unsigned char> processedFrame = effects.applyEffect(frame);
                    
                    sendFrameToClients(processedFrame);
                    frameBuffer.erase(frameBuffer.begin(), itEnd + 2);
                    
                    frameCount++;
                    if (frameCount % 30 == 0) {
                        std::cout << "📹 Sent " << frameCount << " MJPEG frames" << std::endl;
                    }
                }
            } else {
                std::this_thread::sleep_for(std::chrono::milliseconds(10));
            }
        }
    });
    outThread.detach();
    
    std::cout << "✅ MJPEG stream started successfully on port " << port << std::endl;
    return std::make_tuple(true, "", getStreamURL());
}

void MJPEGServer::stopStream() {
    if (!isStreaming) {
        return;
    }
    
    std::cout << "Stopping MJPEG stream..." << std::endl;
    isStreaming = false;
    
    // Try to gracefully stop the gphoto2 process
    if (streamProcessPid > 0) {
        kill(streamProcessPid, SIGINT);
        int status = 0;
        int waitMs = 0;
        while (waitMs < 2000) { // wait up to 2s
            pid_t res = waitpid(streamProcessPid, &status, WNOHANG);
            if (res == streamProcessPid) break;
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            waitMs += 50;
        }
        // If still running, force kill
        if (waitpid(streamProcessPid, &status, WNOHANG) == 0) {
            std::cerr << "⚠️ Stream process timeout, killing..." << std::endl;
            kill(streamProcessPid, SIGKILL);
            (void)waitpid(streamProcessPid, &status, 0);
        }
        streamProcessPid = -1;
    }
    
    // Close pipes
    if (stdoutFd != -1) { close(stdoutFd); stdoutFd = -1; }
    if (stderrFd != -1) { close(stderrFd); stderrFd = -1; }
    
    // Clear frame buffer
    frameBuffer.clear();
    
    // Close all client connections
    closeAllClients();
    
    std::cout << "MJPEG stream stopped" << std::endl;
}

bool MJPEGServer::isActive() const {
    return isStreaming;
}

std::string MJPEGServer::getStreamURL() const {
    return "http://localhost:" + std::to_string(port) + "/camera";
}

int MJPEGServer::getClientCount() const {
    std::lock_guard<std::mutex> lock(clientsMutex);
    return clientSockets.size();
}

void MJPEGServer::setEffect(EffectType effect, const EffectParams& params) {
    effects.setEffect(effect, params);
    std::cout << "MJPEG effect set" << std::endl;
}

std::pair<EffectType, EffectParams> MJPEGServer::getCurrentEffect() const {
    return effects.getEffect();
}

void MJPEGServer::setupRoutes() {
    std::cout << "🌐 MJPEG server setupRoutes started, waiting for connections on port " << port << std::endl;
    
    while (serverSocket != -1) {
        // Accept client connection
        struct sockaddr_in clientAddr;
        socklen_t clientAddrLen = sizeof(clientAddr);
        
        int clientSocket = accept(serverSocket, (struct sockaddr*)&clientAddr, &clientAddrLen);
        if (clientSocket < 0) {
            if (serverSocket != -1) {
                std::cerr << "❌ Error accepting MJPEG client connection" << std::endl;
            }
            continue;
        }
        
        // Get client IP address for logging
        char clientIP[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &(clientAddr.sin_addr), clientIP, INET_ADDRSTRLEN);
        std::cout << "🔗 MJPEG client connected from " << clientIP << ":" << ntohs(clientAddr.sin_port) << std::endl;
        
        // Handle client in a separate thread
        std::thread clientThread([this, clientSocket, clientIP]() {
            this->handleClient(clientSocket);
        });
        clientThread.detach();
    }
    
    std::cout << "🛑 MJPEG server setupRoutes ended" << std::endl;
}

void MJPEGServer::handleClient(int clientSocket) {
    // Read initial HTTP request
    char reqBuf[4096];
    ssize_t n = recv(clientSocket, reqBuf, sizeof(reqBuf) - 1, 0);
    if (n <= 0) {
        std::cerr << "❌ Failed to read HTTP request from client" << std::endl;
        close(clientSocket);
        return;
    }
    
    reqBuf[n] = 0;
    std::string request(reqBuf);
    std::istringstream iss(request);
    std::string method, path, version;
    iss >> method >> path >> version;
    
    // Extract path without query parameters
    size_t queryPos = path.find('?');
    if (queryPos != std::string::npos) {
        path = path.substr(0, queryPos);
    }
    
    std::cout << "📋 MJPEG HTTP request: " << method << " " << path << " " << version << std::endl;
    
    if (method == "GET" && path == "/camera") {
        std::cout << "✅ Serving MJPEG stream to client" << std::endl;
        
        // Write MJPEG multipart response headers
        std::string header =
            "HTTP/1.1 200 OK\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept\r\n"
            "Content-Type: multipart/x-mixed-replace; boundary=--frame\r\n"
            "Cache-Control: no-cache, no-store, must-revalidate\r\n"
            "Pragma: no-cache\r\n"
            "Expires: 0\r\n"
            "Connection: close\r\n\r\n";
        
        if (send(clientSocket, header.c_str(), header.length(), 0) < 0) {
            std::cerr << "❌ Failed to send MJPEG headers to client" << std::endl;
            close(clientSocket);
            return;
        }
        
        // Initial boundary
        std::string boundary = "--frame\r\n";
        if (send(clientSocket, boundary.c_str(), boundary.length(), 0) < 0) {
            std::cerr << "❌ Failed to send initial boundary to client" << std::endl;
            close(clientSocket);
            return;
        }
        
        // Register client for streaming
        {
            std::lock_guard<std::mutex> lock(clientsMutex);
            clientSockets.push_back(clientSocket);
            std::cout << "👥 MJPEG client registered for streaming. Total clients: " << clientSockets.size() << std::endl;
        }
        
        // Keep connection open and check if client is still connected
        char buffer[1];
        int clientDisconnected = 0;
        while (clientDisconnected == 0) {
            // Check if client is still connected by trying to read
            ssize_t result = recv(clientSocket, buffer, 1, MSG_PEEK | MSG_DONTWAIT);
            if (result == 0) {
                // Client disconnected gracefully
                clientDisconnected = 1;
                std::cout << "🔌 MJPEG client disconnected gracefully" << std::endl;
            } else if (result < 0) {
                // Error or no data available
                if (errno != EAGAIN && errno != EWOULDBLOCK) {
                    clientDisconnected = 1;
                    std::cout << "🔌 MJPEG client disconnected with error: " << strerror(errno) << std::endl;
                }
            }
            
            // Sleep briefly to avoid busy waiting
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        
        // Remove client and close
        removeClient(clientSocket);
        close(clientSocket);
        return;
    } else if (method == "GET" && path == "/health") {
        std::cout << "🏥 Serving health check endpoint" << std::endl;
        std::string body = std::string("{\"status\":\"ok\",\"streaming\":") + (isStreaming ? "true" : "false") +
                           ",\"clients\":" + std::to_string(getClientCount()) + "}";
        std::ostringstream oss;
        oss << "HTTP/1.1 200 OK\r\n"
            << "Access-Control-Allow-Origin: *\r\n"
            "Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept\r\n"
            << "Content-Type: application/json\r\n"
            << "Content-Length: " << body.size() << "\r\n\r\n"
            << body;
        std::string resp = oss.str();
        send(clientSocket, resp.c_str(), resp.length(), 0);
        close(clientSocket);
        return;
    } else if (method == "OPTIONS") {
        std::cout << "🔧 Handling OPTIONS preflight request for: " << path << std::endl;
        std::string optionsResponse =
            "HTTP/1.1 200 OK\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
            "Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept\r\n"
            "Content-Length: 0\r\n\r\n";
        send(clientSocket, optionsResponse.c_str(), optionsResponse.length(), 0);
        close(clientSocket);
        return;
    } else {
        std::cout << "❌ MJPEG 404 for path: " << path << std::endl;
        // 404 Not Found
        std::string notFound = "HTTP/1.1 404 Not Found\r\n"
                               "Access-Control-Allow-Origin: *\r\n"
                               "Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept\r\n"
                               "Content-Type: text/plain\r\n"
                               "Content-Length: 9\r\n\r\nNot Found";
        send(clientSocket, notFound.c_str(), notFound.length(), 0);
        close(clientSocket);
        return;
    }
}

void MJPEGServer::sendFrameToClients(const std::vector<unsigned char>& frame) {
    // Apply effects to frame before sending
    std::vector<unsigned char> processedFrame = effects.applyEffect(frame);
    
    std::string header = "Content-Type: image/jpeg\r\nContent-Length: " + std::to_string(processedFrame.size()) + "\r\n\r\n";
    std::string boundary = "\r\n--frame\r\n";
    
    std::lock_guard<std::mutex> lock(clientsMutex);
    
    // Track clients that failed
    std::vector<int> failedClients;
    
    for (int clientSocket : clientSockets) {
        // Try to send frame
        if (send(clientSocket, header.c_str(), header.length(), 0) < 0) {
            failedClients.push_back(clientSocket);
            continue;
        }
        if (send(clientSocket, reinterpret_cast<const char*>(processedFrame.data()), processedFrame.size(), 0) < 0) {
            failedClients.push_back(clientSocket);
            continue;
        }
        if (send(clientSocket, boundary.c_str(), boundary.length(), 0) < 0) {
            failedClients.push_back(clientSocket);
        }
    }
    
    // Remove failed clients
    for (int clientSocket : failedClients) {
        auto it = std::find(clientSockets.begin(), clientSockets.end(), clientSocket);
        if (it != clientSockets.end()) {
            clientSockets.erase(it);
        }
        close(clientSocket);
    }
}

void MJPEGServer::closeAllClients() {
    std::lock_guard<std::mutex> lock(clientsMutex);
    
    for (int clientSocket : clientSockets) {
        close(clientSocket);
    }
    
    clientSockets.clear();
}

void MJPEGServer::removeClient(int clientSocket) {
    std::lock_guard<std::mutex> lock(clientsMutex);
    
    auto it = std::find(clientSockets.begin(), clientSockets.end(), clientSocket);
    if (it != clientSockets.end()) {
        clientSockets.erase(it);
    }
    
    close(clientSocket);
}

void MJPEGServer::processFrames() {
    // Placeholder for frame processing
}

void MJPEGServer::processFrameBuffer(std::vector<unsigned char>& buffer) {
    // Placeholder for frame buffer processing
}

// SocketIOServer implementation
SocketIOServer::SocketIOServer(int port, PhotoBoothServer* photoBoothServer)
    : port(port), serverSocket(-1), running(false), photoBoothServer(photoBoothServer) {
}

SocketIOServer::~SocketIOServer() {
    stop();
}

bool SocketIOServer::start() {
    if (running) {
        return true;
    }
    
    // Create socket
    serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSocket < 0) {
        std::cerr << "Error creating Socket.IO server socket" << std::endl;
        return false;
    }
    
    // Set socket options
    int opt = 1;
    if (setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        std::cerr << "Error setting Socket.IO server socket options" << std::endl;
        close(serverSocket);
        serverSocket = -1;
        return false;
    }
    
    // Bind socket to port
    struct sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(port);
    
    if (bind(serverSocket, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        std::cerr << "Error binding Socket.IO server socket to port " << port << std::endl;
        close(serverSocket);
        serverSocket = -1;
        return false;
    }
    
    // Listen for connections
    if (listen(serverSocket, 10) < 0) {
        std::cerr << "Error listening on Socket.IO server socket" << std::endl;
        close(serverSocket);
        serverSocket = -1;
        return false;
    }
    
    running = true;
    
    // Start server thread
    std::thread serverThread([this]() {
        this->setupRoutes();
    });
    serverThread.detach();
    
    std::cout << "Socket.IO server started on port " << port << std::endl;
    return true;
}

bool SocketIOServer::stop() {
    if (!running) {
        return true;
    }
    
    running = false;
    
    // Close all client connections
    closeAllClients();
    
    // Close server socket
    if (serverSocket != -1) {
        close(serverSocket);
        serverSocket = -1;
    }
    
    std::cout << "Socket.IO server stopped" << std::endl;
    return true;
}

bool SocketIOServer::isRunning() const {
    return running;
}

void SocketIOServer::emitToClient(int clientSocket, const std::string& event, const std::map<std::string, std::string>& data) {
    sendSocketIOPacket(clientSocket, event, data);
}

void SocketIOServer::broadcast(const std::string& event, const std::map<std::string, std::string>& data) {
    std::lock_guard<std::mutex> lock(clientsMutex);
    
    for (int clientSocket : clientSockets) {
        sendSocketIOPacket(clientSocket, event, data);
    }
}

void SocketIOServer::emitToAll(const std::string& event, const std::map<std::string, std::string>& data) {
    broadcast(event, data);
}

void SocketIOServer::setupRoutes() {
    while (running && serverSocket != -1) {
        // Accept client connection
        struct sockaddr_in clientAddr;
        socklen_t clientAddrLen = sizeof(clientAddr);
        
        int clientSocket = accept(serverSocket, (struct sockaddr*)&clientAddr, &clientAddrLen);
        if (clientSocket < 0) {
            if (running && serverSocket != -1) {
                std::cerr << "Error accepting Socket.IO client connection" << std::endl;
            }
            continue;
        }
        
        std::cout << "Socket.IO client connected" << std::endl;
        
        // Add client to list
        {
            std::lock_guard<std::mutex> lock(clientsMutex);
            clientSockets.push_back(clientSocket);
        }
        
        // Handle client in a separate thread
        std::thread clientThread([this, clientSocket]() {
            this->handleClient(clientSocket);
        });
        clientThread.detach();
    }
}

void SocketIOServer::handleClient(int clientSocket) {
    char buffer[4096];
    std::string request;
    
    // Read initial HTTP request for WebSocket upgrade
    while (true) {
        ssize_t bytesRead = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
        if (bytesRead <= 0) {
            break;
        }
        
        buffer[bytesRead] = '\0';
        request += buffer;
        
        // Check if we have received the complete HTTP request
        if (request.find("\r\n\r\n") != std::string::npos) {
            break;
        }
    }
    
    // Check if this is a Socket.IO request or regular HTTP request
    if (request.find("socket.io/") != std::string::npos || request.find("Upgrade: websocket") != std::string::npos) {
        // Handle WebSocket handshake
        handleWebSocketHandshake(clientSocket, request);
    } else {
        // Handle regular HTTP request
        handleHttpRequest(clientSocket, request);
    }
    
    // Remove client from list
    removeClient(clientSocket);
    close(clientSocket);
}

void SocketIOServer::handleWebSocketHandshake(int clientSocket, const std::string& request) {
    // Check if this is a WebSocket upgrade request
    if (request.find("Upgrade: websocket") == std::string::npos) {
        // Not a WebSocket request, send HTTP response
        std::string response = "HTTP/1.1 200 OK\r\n"
                              "Content-Type: text/plain\r\n"
                              "Connection: close\r\n"
                              "\r\n"
                              "Socket.IO server running";
        send(clientSocket, response.c_str(), response.length(), 0);
        return;
    }
    
    // Extract WebSocket key
    size_t keyPos = request.find("Sec-WebSocket-Key: ");
    if (keyPos == std::string::npos) {
        return;
    }
    
    keyPos += 19;
    size_t keyEnd = request.find("\r\n", keyPos);
    std::string wsKey = request.substr(keyPos, keyEnd - keyPos);
    
    // Compute Sec-WebSocket-Accept
    std::string encodedKey = computeWebSocketAccept(wsKey);
    
    // Send WebSocket upgrade response
    std::string response = "HTTP/1.1 101 Switching Protocols\r\n"
                          "Upgrade: websocket\r\n"
                          "Connection: Upgrade\r\n"
                          "Sec-WebSocket-Accept: " + encodedKey + "\r\n"
                          "\r\n";
    
    send(clientSocket, response.c_str(), response.length(), 0);
    
    // Engine.IO open and Socket.IO open
    lastSid = generateSID();
    std::ostringstream openPayload;
    openPayload << "0{"
                << "\"sid\":\"" << lastSid << "\","
                << "\"upgrades\":[]," // keep simple
                << "\"pingInterval\":25000,"
                << "\"pingTimeout\":5000" 
                << "}";
    sendTextFrame(clientSocket, openPayload.str());
    // Socket.IO open
    sendTextFrame(clientSocket, std::string("40"));
    
    // Now handle Socket.IO messages
    handleSocketIOMessages(clientSocket);
}

void SocketIOServer::handleSocketIOMessages(int clientSocket) {
    while (running) {
        std::string payload;
        if (!recvTextFrame(clientSocket, payload)) {
            break;
        }
        if (payload.empty()) continue;
        
        // Engine.IO ping
        if (payload[0] == '2') { // ping
            sendTextFrame(clientSocket, std::string("3")); // pong
            continue;
        }
        
        // Socket.IO event
        if (payload[0] == '4') {
            size_t eventStart = payload.find("[\"");
            size_t eventEnd = payload.find("\"", eventStart + 2);
            if (eventStart != std::string::npos && eventEnd != std::string::npos) {
                std::string eventName = payload.substr(eventStart + 2, eventEnd - eventStart - 2);
                std::cout << "📨 Received Socket.IO event: " << eventName << std::endl;
                
                // Parse event data
                std::map<std::string, std::string> eventData;
                size_t dataStart = payload.find("{", eventEnd);
                size_t dataEnd = payload.find("}", dataStart);
                
                if (dataStart != std::string::npos && dataEnd != std::string::npos) {
                    std::string dataStr = payload.substr(dataStart, dataEnd - dataStart + 1);
                    std::cout << "📦 Event data string: " << dataStr << std::endl;
                    
                    // Enhanced JSON parsing for our specific format with nested objects
                    parseJsonObject(dataStr, eventData, "");
                }
                
                std::cout << "📋 Final parsed data for event " << eventName << ": ";
                for (const auto& pair : eventData) {
                    std::cout << pair.first << "=" << pair.second << " ";
                }
                std::cout << std::endl;
                
                if (eventName == "detect-camera") {
                    this->photoBoothServer->handleDetectCameraEvent(clientSocket);
                } else if (eventName == "start-preview") {
                    this->photoBoothServer->handleStartPreviewEvent(clientSocket, eventData);
                } else if (eventName == "stop-preview") {
                    this->photoBoothServer->handleStopPreviewEvent(clientSocket);
                } else if (eventName == "stop-mjpeg") {
                    this->photoBoothServer->handleStopMjpegEvent(clientSocket);
                } else if (eventName == "capture-photo") {
                    this->photoBoothServer->handleCapturePhotoEvent(clientSocket);
                } else if (eventName == "set-effect") {
                    this->photoBoothServer->handleSetEffectEvent(clientSocket, eventData);
                } else if (eventName == "get-effect") {
                    this->photoBoothServer->handleGetEffectEvent(clientSocket);
                } else if (eventName == "apply-effect") {
                    this->photoBoothServer->handleApplyEffectEvent(clientSocket, eventData);
                }
            }
        }
    }
}

void SocketIOServer::sendSocketIOPacket(int clientSocket, const std::string& event, const std::map<std::string, std::string>& data) {
    std::string packet = generateSocketIOPacket(event, data);
    sendTextFrame(clientSocket, packet);
}

void SocketIOServer::closeAllClients() {
    std::lock_guard<std::mutex> lock(clientsMutex);
    
    for (int clientSocket : clientSockets) {
        close(clientSocket);
    }
    
    clientSockets.clear();
}

void SocketIOServer::removeClient(int clientSocket) {
    std::lock_guard<std::mutex> lock(clientsMutex);
    
    auto it = std::find(clientSockets.begin(), clientSockets.end(), clientSocket);
    if (it != clientSockets.end()) {
        clientSockets.erase(it);
    }
}

std::string SocketIOServer::generateSocketIOPacket(const std::string& event, const std::map<std::string, std::string>& data) {
    // Generate Socket.IO packet (simplified)
    std::ostringstream oss;
    oss << "42[\"" << event << "\",";
    
    bool first = true;
    oss << "{";
    for (const auto& pair : data) {
        if (!first) {
            oss << ",";
        }
        first = false;
        oss << "\"" << pair.first << "\":\"" << pair.second << "\"";
    }
    oss << "}";
    
    oss << "]";
    return oss.str();
}

std::string SocketIOServer::computeWebSocketAccept(const std::string& clientKey) {
    std::string magic = clientKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    unsigned char hash[SHA_DIGEST_LENGTH];
    SHA1(reinterpret_cast<const unsigned char*>(magic.c_str()), magic.size(), hash);
    return base64EncodeBytes(hash, SHA_DIGEST_LENGTH);
}

void SocketIOServer::sendTextFrame(int clientSocket, const std::string& payload) {
    std::string frame;
    frame.push_back(static_cast<char>(0x81)); // FIN + text
    size_t len = payload.size();
    if (len <= 125) {
        frame.push_back(static_cast<char>(len));
    } else if (len <= 65535) {
        frame.push_back(static_cast<char>(126));
        uint16_t l = htons(static_cast<uint16_t>(len));
        frame.append(reinterpret_cast<const char*>(&l), sizeof(l));
    } else {
        frame.push_back(static_cast<char>(127));
        uint64_t l = static_cast<uint64_t>(len);
        uint64_t be = (((uint64_t)htonl(l & 0xFFFFFFFF)) << 32) | htonl((l >> 32) & 0xFFFFFFFF);
        frame.append(reinterpret_cast<const char*>(&be), sizeof(be));
    }
    frame.append(payload);
    send(clientSocket, frame.c_str(), frame.size(), 0);
}

bool SocketIOServer::recvExact(int clientSocket, char* buf, size_t len) {
    size_t got = 0;
    while (got < len) {
        ssize_t n = recv(clientSocket, buf + got, len - got, 0);
        if (n <= 0) return false;
        got += static_cast<size_t>(n);
    }
    return true;
}

bool SocketIOServer::recvTextFrame(int clientSocket, std::string& outPayload) {
    outPayload.clear();
    unsigned char hdr[2];
    if (!recvExact(clientSocket, reinterpret_cast<char*>(hdr), 2)) return false;
    unsigned char finOpcode = hdr[0];
    unsigned char maskLen = hdr[1];
    if ((finOpcode & 0x0F) != 0x1) return false; // only text frames
    bool masked = (maskLen & 0x80) != 0;
    uint64_t len = (maskLen & 0x7F);
    if (len == 126) {
        uint16_t l;
        if (!recvExact(clientSocket, reinterpret_cast<char*>(&l), sizeof(l))) return false;
        len = ntohs(l);
    } else if (len == 127) {
        uint64_t l;
        if (!recvExact(clientSocket, reinterpret_cast<char*>(&l), sizeof(l))) return false;
        // convert big-endian to host
        uint32_t hi = ntohl(static_cast<uint32_t>(l >> 32));
        uint32_t lo = ntohl(static_cast<uint32_t>(l & 0xFFFFFFFF));
        len = (static_cast<uint64_t>(hi) << 32) | lo;
    }
    unsigned char mask[4] = {0,0,0,0};
    if (masked) {
        if (!recvExact(clientSocket, reinterpret_cast<char*>(mask), 4)) return false;
    }
    std::string data;
    data.resize(static_cast<size_t>(len));
    if (!recvExact(clientSocket, &data[0], static_cast<size_t>(len))) return false;
    if (masked) {
        for (size_t i = 0; i < len; ++i) {
            data[i] = static_cast<char>(data[i] ^ mask[i % 4]);
        }
    }
    outPayload.swap(data);
    return true;
}

std::string SocketIOServer::base64EncodeBytes(const unsigned char* data, size_t len) {
    const std::string base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string result;
    unsigned char charArray3[3];
    unsigned char charArray4[4];
    int i = 0;
    size_t idx = 0;
    while (idx < len) {
        charArray3[i++] = data[idx++];
        if (i == 3) {
            charArray4[0] = (charArray3[0] & 0xfc) >> 2;
            charArray4[1] = ((charArray3[0] & 0x03) << 4) + ((charArray3[1] & 0xf0) >> 4);
            charArray4[2] = ((charArray3[1] & 0x0f) << 2) + ((charArray3[2] & 0xc0) >> 6);
            charArray4[3] = charArray3[2] & 0x3f;
            for (i = 0; i < 4; i++) result += base64Chars[charArray4[i]];
            i = 0;
        }
    }
    if (i) {
        for (int j = i; j < 3; j++) charArray3[j] = 0;
        charArray4[0] = (charArray3[0] & 0xfc) >> 2;
        charArray4[1] = ((charArray3[0] & 0x03) << 4) + ((charArray3[1] & 0xf0) >> 4);
        charArray4[2] = ((charArray3[1] & 0x0f) << 2) + ((charArray3[2] & 0xc0) >> 6);
        for (int j = 0; j < i + 1; j++) result += base64Chars[charArray4[j]];
        while (i++ < 3) result += '=';
    }
    return result;
}

std::string SocketIOServer::generateSID() {
    static const char hex[] = "0123456789abcdef";
    std::string sid;
    sid.resize(20);
    for (int i = 0; i < 20; ++i) sid[i] = hex[rand() % 16];
    return sid;
}

void SocketIOServer::handleHttpRequest(int clientSocket, const std::string& request) {
    // Parse HTTP request
    std::istringstream iss(request);
    std::string method, path, version;
    iss >> method >> path >> version;
    
    // Add CORS headers
    std::string response = "HTTP/1.1 200 OK\r\n"
                          "Access-Control-Allow-Origin: *\r\n"
                          "Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept\r\n"
                          "Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\n";
    
    if (method == "OPTIONS") {
        response += "Content-Length: 0\r\n\r\n";
        send(clientSocket, response.c_str(), response.length(), 0);
        return;
    }
    
    // Route the request
    if (path == "/api/status" && method == "GET") {
        handleApiStatusRequest(clientSocket);
    } else if (path == "/api/photos" && method == "GET") {
        handleApiPhotosRequest(clientSocket);
    } else if (path == "/api/preview" && method == "GET") {
        handleApiPreviewRequest(clientSocket);
    } else if (path.find("/api/photos/") == 0 && method == "DELETE") {
        std::string filename = path.substr(12); // Remove "/api/photos/"
        handleApiPhotoDeleteRequest(clientSocket, filename);
    } else if (path.find("/uploads/") == 0 && method == "GET") {
        std::string filename = path.substr(9); // Remove "/uploads/"
        size_t queryPos = filename.find('?');
        std::string query;
        if (queryPos != std::string::npos) {
            query = filename.substr(queryPos + 1);
            filename = filename.substr(0, queryPos);
        }
        auto queryParams = parseQueryString(query);
        handleImageRequest(clientSocket, filename, queryParams);
    } else {
        // 404 Not Found
        std::string notFound = "HTTP/1.1 404 Not Found\r\n"
                             "Access-Control-Allow-Origin: *\r\n"
                             "Content-Type: text/plain\r\n"
                             "Content-Length: 9\r\n\r\nNot Found";
        send(clientSocket, notFound.c_str(), notFound.length(), 0);
    }
}

void SocketIOServer::handleApiStatusRequest(int clientSocket) {
    std::vector<Camera> cameras = photoBoothServer->getGPhotoWrapper()->detectCamera();
    bool connected = !cameras.empty();
    
    std::ostringstream oss;
    oss << "{\"cameraConnected\":" << (connected ? "true" : "false")
        << ",\"message\":\"" << (connected ? "Kamera terhubung" : "Kamera tidak terhubung (mode simulasi)") << "\"}";
    std::string json = oss.str();
    std::string response = generateHttpResponse(json, "application/json");
    send(clientSocket, response.c_str(), response.length(), 0);
}

void SocketIOServer::handleApiPhotosRequest(int clientSocket) {
    std::vector<Photo> photos = photoBoothServer->getPhotosList();
    
    std::string json = "{\"photos\":[";
    for (size_t i = 0; i < photos.size(); ++i) {
        if (i > 0) json += ",";
        json += "{\"filename\":\"" + photos[i].filename + "\",";
        json += "\"path\":\"" + photos[i].path + "\",";
        json += "\"timestamp\":" + std::to_string(photos[i].timestamp) + ",";
        json += "\"simulated\":" + std::string(photos[i].simulated ? "true" : "false") + "}";
    }
    json += "]}";
    
    std::string response = generateHttpResponse(json, "application/json");
    send(clientSocket, response.c_str(), response.length(), 0);
}

void SocketIOServer::handleApiPreviewRequest(int clientSocket) {
    auto result = photoBoothServer->getGPhotoWrapper()->capturePreviewFrame();
    std::string json = generateJsonResponse(result);
    std::string response = generateHttpResponse(json, "application/json");
    send(clientSocket, response.c_str(), response.length(), 0);
}

void SocketIOServer::handleApiPhotoDeleteRequest(int clientSocket, const std::string& filename) {
    bool success = photoBoothServer->deletePhoto(filename);
    
    std::map<std::string, std::string> data;
    data["success"] = success ? "true" : "false";
    if (!success) {
        data["error"] = "Gagal menghapus foto";
    }
    
    std::string json = generateJsonResponse(data);
    std::string response = generateHttpResponse(json, "application/json");
    send(clientSocket, response.c_str(), response.length(), 0);
}

void SocketIOServer::handleImageRequest(int clientSocket, const std::string& filename, const std::map<std::string, std::string>& queryParams) {
    // Validate filename
    if (filename.find("..") != std::string::npos ||
        filename.find("/") != std::string::npos ||
        filename.find("\\") != std::string::npos) {
        std::string forbidden = "HTTP/1.1 403 Forbidden\r\n"
                              "Access-Control-Allow-Origin: *\r\n"
                              "Content-Length: 9\r\n\r\nForbidden";
        send(clientSocket, forbidden.c_str(), forbidden.length(), 0);
        return;
    }
    
    std::string filePath = "uploads/" + filename;
    std::vector<unsigned char> imageData = photoBoothServer->readImageFile(filePath);
    
    if (imageData.empty()) {
        std::string notFound = "HTTP/1.1 404 Not Found\r\n"
                              "Access-Control-Allow-Origin: *\r\n"
                              "Content-Length: 9\r\n\r\nNot Found";
        send(clientSocket, notFound.c_str(), notFound.length(), 0);
        return;
    }
    
    // Apply effects if requested
    auto effectIt = queryParams.find("effect");
    if (effectIt != queryParams.end() && effectIt->second != "" && effectIt->second != "none") {
        // Parse effect parameters
        EffectParams params;
        params.intensity = 0.5;
        params.radius = 1.0;
        params.pixelSize = 10;
        
        auto intensityIt = queryParams.find("intensity");
        if (intensityIt != queryParams.end()) {
            try {
                params.intensity = std::stod(intensityIt->second);
            } catch (...) {}
        }
        
        auto radiusIt = queryParams.find("radius");
        if (radiusIt != queryParams.end()) {
            try {
                params.radius = std::stod(radiusIt->second);
            } catch (...) {}
        }
        
        auto pixelSizeIt = queryParams.find("pixelSize");
        if (pixelSizeIt != queryParams.end()) {
            try {
                params.pixelSize = std::stoi(pixelSizeIt->second);
            } catch (...) {}
        }
        
        // Apply effect
        ImageEffects effects;
        EffectType effect = EffectType::NONE;
        std::string effectName = effectIt->second;
        
        if (effectName == "fisheye") effect = EffectType::FISHEYE;
        else if (effectName == "grayscale") effect = EffectType::GRAYSCALE;
        else if (effectName == "sepia") effect = EffectType::SEPIA;
        else if (effectName == "vignette") effect = EffectType::VIGNETTE;
        else if (effectName == "blur") effect = EffectType::BLUR;
        else if (effectName == "sharpen") effect = EffectType::SHARPEN;
        else if (effectName == "invert") effect = EffectType::INVERT;
        else if (effectName == "pixelate") effect = EffectType::PIXELATE;
        
        effects.setEffect(effect, params);
        imageData = effects.applyEffect(imageData);
    }
    
    // Send image
    std::ostringstream oss;
    oss << "HTTP/1.1 200 OK\r\n"
        << "Access-Control-Allow-Origin: *\r\n"
        << "Content-Type: image/jpeg\r\n"
        << "Content-Length: " << imageData.size() << "\r\n"
        << "Cache-Control: public, max-age=86400\r\n"
        << "\r\n";
    
    std::string header = oss.str();
    send(clientSocket, header.c_str(), header.length(), 0);
    send(clientSocket, reinterpret_cast<const char*>(imageData.data()), imageData.size(), 0);
}

std::string SocketIOServer::generateHttpResponse(const std::string& content, const std::string& contentType) {
    std::ostringstream oss;
    oss << "HTTP/1.1 200 OK\r\n"
        << "Access-Control-Allow-Origin: *\r\n"
        << "Content-Type: " << contentType << "\r\n"
        << "Content-Length: " << content.length() << "\r\n"
        << "\r\n"
        << content;
    return oss.str();
}

std::string SocketIOServer::generateJsonResponse(const std::map<std::string, std::string>& data) {
    std::ostringstream oss;
    oss << "{";
    
    bool first = true;
    for (const auto& pair : data) {
        if (!first) {
            oss << ",";
        }
        first = false;
        oss << "\"" << pair.first << "\":\"" << pair.second << "\"";
    }
    
    oss << "}";
    return oss.str();
}

std::map<std::string, std::string> SocketIOServer::parseQueryString(const std::string& query) {
    std::map<std::string, std::string> result;
    
    if (query.empty()) {
        return result;
    }
    
    std::vector<std::string> pairs = splitString(query, '&');
    for (const auto& pair : pairs) {
        size_t eqPos = pair.find('=');
        if (eqPos != std::string::npos) {
            std::string key = pair.substr(0, eqPos);
            std::string value = pair.substr(eqPos + 1);
            result[key] = value;
        }
    }
    
    return result;
}

// PhotoBoothServer implementation
PhotoBoothServer::PhotoBoothServer(int apiPort, int mjpegPort)
    : apiPort(apiPort), mjpegPort(mjpegPort), running(false) {
    
    // Initialize directories
    createDirectories("uploads");
    createDirectories("previews");
    
    // Initialize GPhoto wrapper
    gphoto = new GPhotoWrapper("uploads", "previews");
    
    // Initialize MJPEG server
    mjpegServer = new MJPEGServer(mjpegPort);
    
    // Initialize Socket.IO server
    socketIOServer = new SocketIOServer(apiPort, this);
}

PhotoBoothServer::~PhotoBoothServer() {
    stop();
    delete gphoto;
    delete mjpegServer;
    delete socketIOServer;
}

bool PhotoBoothServer::start() {
    if (running) {
        return true;
    }
    
    // Start MJPEG server
    if (!mjpegServer->start()) {
        std::cerr << "Failed to start MJPEG server" << std::endl;
        return false;
    }
    
    // Start Socket.IO server
    if (!socketIOServer->start()) {
        std::cerr << "Failed to start Socket.IO server" << std::endl;
        return false;
    }
    
    running = true;
    return true;
}

bool PhotoBoothServer::stop() {
    if (!running) {
        return true;
    }
    
    // Stop MJPEG server
    mjpegServer->stop();
    
    // Stop Socket.IO server
    socketIOServer->stop();
    
    running = false;
    return true;
}

bool PhotoBoothServer::isRunning() const {
    return running;
}

std::vector<Photo> PhotoBoothServer::getPhotosList() {
    std::vector<Photo> photos;
    
    // Read uploads directory
    try {
        for (const auto& entry : std::filesystem::directory_iterator("uploads")) {
            if (entry.is_regular_file()) {
                std::string filename = entry.path().filename().string();
                
                // Check if it's a JPEG file
                if (filename.size() > 4 &&
                    (filename.substr(filename.size() - 4) == ".jpg" ||
                     filename.substr(filename.size() - 5) == ".jpeg")) {
                    
                    Photo photo;
                    photo.filename = filename;
                    photo.path = "/uploads/" + filename;
                    
                    // Extract timestamp from filename
                    if (filename.find("photo_") == 0) {
                        std::string timestampStr = filename.substr(6, filename.size() - 10); // Remove "photo_" and ".jpg"
                        try {
                            photo.timestamp = std::stoll(timestampStr);
                        } catch (...) {
                            photo.timestamp = std::time(nullptr);
                        }
                    } else {
                        photo.timestamp = std::time(nullptr);
                    }
                    
                    photo.simulated = false; // Assume not simulated for now
                    
                    photos.push_back(photo);
                }
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Error reading uploads directory: " << e.what() << std::endl;
    }
    
    // Sort by timestamp (newest first)
    std::sort(photos.begin(), photos.end(), [](const Photo& a, const Photo& b) {
        return a.timestamp > b.timestamp;
    });
    
    return photos;
}

std::vector<unsigned char> PhotoBoothServer::readImageFile(const std::string& filePath) {
    return gphoto->readImageFile(filePath);
}

bool PhotoBoothServer::deletePhoto(const std::string& filename) {
    // Validate filename
    if (filename.find("..") != std::string::npos || 
        filename.find("/") != std::string::npos || 
        filename.find("\\") != std::string::npos) {
        return false;
    }
    
    std::string filePath = "uploads/" + filename;
    
    try {
        return std::filesystem::remove(filePath);
    } catch (const std::exception& e) {
        std::cerr << "Error deleting photo: " << e.what() << std::endl;
        return false;
    }
}

void PhotoBoothServer::handleHttpRequest(int clientSocket, const std::string& request) {
    // Placeholder for HTTP request handling
}

void PhotoBoothServer::handleWebSocketConnection(int clientSocket) {
    // Placeholder for WebSocket connection handling
}

void PhotoBoothServer::handleStatusRequest(int clientSocket) {
    // Placeholder for status request handling
}

void PhotoBoothServer::handlePhotosRequest(int clientSocket) {
    // Placeholder for photos request handling
}

void PhotoBoothServer::handlePreviewRequest(int clientSocket) {
    // Placeholder for preview request handling
}

void PhotoBoothServer::handlePhotoDeleteRequest(int clientSocket, const std::string& filename) {
    // Placeholder for photo delete request handling
}

void PhotoBoothServer::handleImageRequest(int clientSocket, const std::string& filename, 
                                         const std::map<std::string, std::string>& queryParams) {
    // Placeholder for image request handling
}

void PhotoBoothServer::handleDetectCameraEvent(int clientSocket) {
    std::cout << "📷 Detecting cameras..." << std::endl;
    
    std::vector<Camera> cameras = gphoto->detectCamera();
    bool connected = !cameras.empty();
    
    // Create response data
    std::map<std::string, std::string> response;
    response["success"] = connected ? "true" : "false";
    response["count"] = std::to_string(cameras.size());
    
    // Add camera information if any
    if (connected) {
        std::string camerasJson = "[";
        for (size_t i = 0; i < cameras.size(); ++i) {
            if (i > 0) camerasJson += ",";
            camerasJson += "{\"model\":\"" + cameras[i].model + "\",\"port\":\"" + cameras[i].port + "\"}";
        }
        camerasJson += "]";
        response["cameras"] = camerasJson;
    } else {
        response["cameras"] = "[]";
    }
    
    // Send response via Socket.IO
    if (socketIOServer) {
        socketIOServer->emitToClient(clientSocket, "camera-detected", response);
    }
    
    std::cout << "✅ Camera detection completed: " << cameras.size() << " cameras found" << std::endl;
}

void PhotoBoothServer::handleStartPreviewEvent(int clientSocket, const std::map<std::string, std::string>& data) {
    std::cout << "📹 Starting preview stream..." << std::endl;
    
    // Stop any existing stream first
    if (mjpegServer->isActive()) {
        std::cout << "⚠️ Stopping existing stream before starting new one..." << std::endl;
        mjpegServer->stopStream();
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
    
    // Try to start MJPEG stream
    auto [mjpegSuccess, mjpegError, mjpegUrl] = mjpegServer->startStream();
    
    if (mjpegSuccess) {
        std::cout << "✅ MJPEG stream started successfully" << std::endl;
        
        std::map<std::string, std::string> response;
        response["success"] = "true";
        response["streamUrl"] = mjpegUrl;
        response["port"] = std::to_string(MJPEG_PORT);
        
        if (socketIOServer) {
            socketIOServer->emitToClient(clientSocket, "mjpeg-stream-started", response);
        }
        
        std::map<std::string, std::string> previewResponse;
        previewResponse["success"] = "true";
        previewResponse["mjpeg"] = "true";
        
        if (socketIOServer) {
            socketIOServer->emitToClient(clientSocket, "preview-started", previewResponse);
        }
        return;
    } else {
        std::cout << "❌ MJPEG start failed: " << mjpegError << std::endl;
    }
    
    // Fallback: frame-by-frame preview using gphoto2
    int fps = 4;
    auto fpsIt = data.find("fps");
    if (fpsIt != data.end()) {
        try {
            fps = std::stoi(fpsIt->second);
            if (fps <= 0) fps = 4;
        } catch (...) {
            fps = 4;
        }
    }
    
    // Start preview stream
    auto result = gphoto->startPreviewStream([this, clientSocket](const std::string& event, const std::map<std::string, std::string>& payload) {
        if (socketIOServer) {
            socketIOServer->emitToClient(clientSocket, event, payload);
        }
    }, fps);
    
    if (result["success"] == "true") {
        std::map<std::string, std::string> response;
        response["success"] = "true";
        response["mjpeg"] = "false";
        response["fps"] = std::to_string(fps);
        
        if (socketIOServer) {
            socketIOServer->emitToClient(clientSocket, "preview-started", response);
        }
    } else {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["mjpeg"] = "false";
        response["error"] = result["error"];
        
        if (socketIOServer) {
            socketIOServer->emitToClient(clientSocket, "preview-started", response);
        }
    }
}

void PhotoBoothServer::handleStopPreviewEvent(int clientSocket) {
    std::cout << "🛑 Stopping preview stream..." << std::endl;
    
    mjpegServer->stopStream();
    gphoto->stopPreviewStream();
    
    std::map<std::string, std::string> response;
    response["success"] = "true";
    
    if (socketIOServer) {
        socketIOServer->emitToClient(clientSocket, "mjpeg-stream-stopped", response);
    }
    
    std::cout << "✅ Preview stream stopped" << std::endl;
}

void PhotoBoothServer::handleStopMjpegEvent(int clientSocket) {
    if (mjpegServer->isActive()) {
        std::cout << "🛑 Stopping MJPEG stream (explicit)..." << std::endl;
        mjpegServer->stopStream();
        
        std::map<std::string, std::string> response;
        response["success"] = "true";
        
        if (socketIOServer) {
            socketIOServer->emitToClient(clientSocket, "mjpeg-stream-stopped", response);
        }
    }
}

void PhotoBoothServer::handleCapturePhotoEvent(int clientSocket) {
    std::cout << "📸 Capturing photo..." << std::endl;
    
    // Stop mjpeg while capturing to release USB
    bool wasActive = mjpegServer->isActive();
    if (wasActive) {
        std::cout << "⚠️ Stopping stream for capture..." << std::endl;
        mjpegServer->stopStream();
        
        std::map<std::string, std::string> stopResponse;
        stopResponse["success"] = "true";
        
        if (socketIOServer) {
            socketIOServer->emitToClient(clientSocket, "mjpeg-stream-stopped", stopResponse);
        }
        
        // Wait longer to ensure camera is fully released
        std::cout << "⏳ Waiting for camera to be ready..." << std::endl;
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
    
    // Capture photo
    auto result = gphoto->captureImage();
    
    if (result["success"] != "true") {
        std::cout << "❌ Capture failed: " << result["error"] << std::endl;
        
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["error"] = result["error"];
        
        if (socketIOServer) {
            socketIOServer->emitToClient(clientSocket, "photo-captured", response);
        }
        return;
    }
    
    std::cout << "✅ Photo captured successfully: " << result["filename"] << std::endl;
    
    // Send response to current client
    if (socketIOServer) {
        socketIOServer->emitToClient(clientSocket, "photo-captured", result);
    }
    
    // Format response for broadcast
    std::map<std::string, std::string> broadcastData;
    broadcastData["filename"] = result["filename"];
    broadcastData["path"] = result["url"];
    broadcastData["timestamp"] = result["timestamp"];
    broadcastData["simulated"] = "false";
    
    // Broadcast to all clients
    if (socketIOServer) {
        socketIOServer->broadcast("photoCaptured", broadcastData);
    }
    
    // Add additional wait time after capture before allowing restart
    if (wasActive) {
        std::cout << "⏳ Cooling down after capture..." << std::endl;
        std::this_thread::sleep_for(std::chrono::milliseconds(250));
    }
}

void PhotoBoothServer::handleSetEffectEvent(int clientSocket, const std::map<std::string, std::string>& data) {
    auto effectIt = data.find("effect");
    if (effectIt == data.end()) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["error"] = "Invalid effect name";
        
        if (socketIOServer) {
            socketIOServer->emitToClient(clientSocket, "effect-changed", response);
        }
        return;
    }
    
    std::string effectName = effectIt->second;
    EffectType effect = EffectType::NONE;
    
    // Parse effect name
    if (effectName == "fisheye") effect = EffectType::FISHEYE;
    else if (effectName == "grayscale") effect = EffectType::GRAYSCALE;
    else if (effectName == "sepia") effect = EffectType::SEPIA;
    else if (effectName == "vignette") effect = EffectType::VIGNETTE;
    else if (effectName == "blur") effect = EffectType::BLUR;
    else if (effectName == "sharpen") effect = EffectType::SHARPEN;
    else if (effectName == "invert") effect = EffectType::INVERT;
    else if (effectName == "pixelate") effect = EffectType::PIXELATE;
    
    EffectParams params;
    params.intensity = 0.5;
    params.radius = 1.0;
    params.pixelSize = 10;
    
    // Parse params if provided
    auto intensityIt = data.find("intensity");
    if (intensityIt != data.end()) {
        try {
            params.intensity = std::stod(intensityIt->second);
            if (params.intensity < 0) params.intensity = 0;
            if (params.intensity > 1) params.intensity = 1;
        } catch (...) {}
    }
    
    auto radiusIt = data.find("radius");
    if (radiusIt != data.end()) {
        try {
            params.radius = std::stod(radiusIt->second);
            if (params.radius < 0) params.radius = 0;
        } catch (...) {}
    }
    
    auto pixelSizeIt = data.find("pixelSize");
    if (pixelSizeIt != data.end()) {
        try {
            params.pixelSize = std::stoi(pixelSizeIt->second);
            if (params.pixelSize < 1) params.pixelSize = 1;
        } catch (...) {}
    }
    
    // Apply to both MJPEG and GPhoto wrapper
    mjpegServer->setEffect(effect, params);
    gphoto->setEffect(effect, params);
    
    std::cout << "🎨 Effect set to: " << effectName << " with params: intensity=" << params.intensity
              << ", radius=" << params.radius << ", pixelSize=" << params.pixelSize << std::endl;
    
    // Send response to client
    std::map<std::string, std::string> response;
    response["success"] = "true";
    response["effect"] = effectName;
    response["intensity"] = std::to_string(params.intensity);
    response["radius"] = std::to_string(params.radius);
    response["pixelSize"] = std::to_string(params.pixelSize);
    
    if (socketIOServer) {
        socketIOServer->emitToClient(clientSocket, "effect-changed", response);
    }
    
    // Broadcast to all clients
    if (socketIOServer) {
        socketIOServer->broadcast("effectChanged", response);
    }
}

void PhotoBoothServer::handleGetEffectEvent(int clientSocket) {
    auto [effect, params] = mjpegServer->getCurrentEffect();
    
    std::string effectName;
    switch (effect) {
        case EffectType::FISHEYE: effectName = "fisheye"; break;
        case EffectType::GRAYSCALE: effectName = "grayscale"; break;
        case EffectType::SEPIA: effectName = "sepia"; break;
        case EffectType::VIGNETTE: effectName = "vignette"; break;
        case EffectType::BLUR: effectName = "blur"; break;
        case EffectType::SHARPEN: effectName = "sharpen"; break;
        case EffectType::INVERT: effectName = "invert"; break;
        case EffectType::PIXELATE: effectName = "pixelate"; break;
        default: effectName = "none"; break;
    }
    
    std::map<std::string, std::string> response;
    response["effect"] = effectName;
    response["intensity"] = std::to_string(params.intensity);
    response["radius"] = std::to_string(params.radius);
    response["pixelSize"] = std::to_string(params.pixelSize);
    
    if (socketIOServer) {
        socketIOServer->emitToClient(clientSocket, "current-effect", response);
    }
}

void PhotoBoothServer::handleApplyEffectEvent(int clientSocket, const std::map<std::string, std::string>& data) {
    std::cout << "🎨 Received apply-effect event from client" << std::endl;
    
    // Log all received data
    std::cout << "📋 Received data: ";
    for (const auto& pair : data) {
        std::cout << pair.first << "=" << pair.second << " ";
    }
    std::cout << std::endl;
    
    auto effectIt = data.find("effect");
    if (effectIt == data.end()) {
        std::cout << "❌ No effect name provided in apply-effect request" << std::endl;
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["error"] = "Invalid effect name";
        
        if (socketIOServer) {
            socketIOServer->emitToClient(clientSocket, "effect-applied", response);
        }
        return;
    }
    
    std::string effectName = effectIt->second;
    std::cout << "🎯 Effect to apply: " << effectName << std::endl;
    
    EffectType effect = EffectType::NONE;
    
    // Parse effect name
    if (effectName == "fisheye") effect = EffectType::FISHEYE;
    else if (effectName == "grayscale") effect = EffectType::GRAYSCALE;
    else if (effectName == "sepia") effect = EffectType::SEPIA;
    else if (effectName == "vignette") effect = EffectType::VIGNETTE;
    else if (effectName == "blur") effect = EffectType::BLUR;
    else if (effectName == "sharpen") effect = EffectType::SHARPEN;
    else if (effectName == "invert") effect = EffectType::INVERT;
    else if (effectName == "pixelate") effect = EffectType::PIXELATE;
    
    if (effect == EffectType::NONE) {
        std::cout << "❌ Unknown effect: " << effectName << std::endl;
    }
    
    EffectParams params;
    params.intensity = 0.5;
    params.radius = 1.0;
    params.pixelSize = 10;
    
    // Parse params from nested object if provided
    auto paramsIt = data.find("params");
    if (paramsIt != data.end()) {
        std::cout << "📦 Found params object: " << paramsIt->second << std::endl;
        
        // Try to parse nested JSON structure for params
        std::string paramsStr = paramsIt->second;
        
        // Look for individual parameters in the nested structure
        size_t intensityPos = paramsStr.find("\"intensity\":");
        if (intensityPos != std::string::npos) {
            size_t valueStart = paramsStr.find(":", intensityPos) + 1;
            size_t valueEnd = paramsStr.find(",", valueStart);
            if (valueEnd == std::string::npos) valueEnd = paramsStr.find("}", valueStart);
            if (valueEnd != std::string::npos) {
                std::string intensityStr = paramsStr.substr(valueStart, valueEnd - valueStart);
                // Remove quotes and whitespace
                intensityStr.erase(std::remove(intensityStr.begin(), intensityStr.end(), '"'), intensityStr.end());
                intensityStr.erase(std::remove(intensityStr.begin(), intensityStr.end(), ' '), intensityStr.end());
                try {
                    params.intensity = std::stod(intensityStr);
                    if (params.intensity < 0) params.intensity = 0;
                    if (params.intensity > 1) params.intensity = 1;
                    std::cout << "📊 Intensity from params: " << params.intensity << std::endl;
                } catch (...) {
                    std::cout << "⚠️ Invalid intensity in params, using default: " << params.intensity << std::endl;
                }
            }
        }
        
        size_t radiusPos = paramsStr.find("\"radius\":");
        if (radiusPos != std::string::npos) {
            size_t valueStart = paramsStr.find(":", radiusPos) + 1;
            size_t valueEnd = paramsStr.find(",", valueStart);
            if (valueEnd == std::string::npos) valueEnd = paramsStr.find("}", valueStart);
            if (valueEnd != std::string::npos) {
                std::string radiusStr = paramsStr.substr(valueStart, valueEnd - valueStart);
                // Remove quotes and whitespace
                radiusStr.erase(std::remove(radiusStr.begin(), radiusStr.end(), '"'), radiusStr.end());
                radiusStr.erase(std::remove(radiusStr.begin(), radiusStr.end(), ' '), radiusStr.end());
                try {
                    params.radius = std::stod(radiusStr);
                    if (params.radius < 0) params.radius = 0;
                    std::cout << "📐 Radius from params: " << params.radius << std::endl;
                } catch (...) {
                    std::cout << "⚠️ Invalid radius in params, using default: " << params.radius << std::endl;
                }
            }
        }
        
        size_t pixelSizePos = paramsStr.find("\"pixelSize\":");
        if (pixelSizePos != std::string::npos) {
            size_t valueStart = paramsStr.find(":", pixelSizePos) + 1;
            size_t valueEnd = paramsStr.find(",", valueStart);
            if (valueEnd == std::string::npos) valueEnd = paramsStr.find("}", valueStart);
            if (valueEnd != std::string::npos) {
                std::string pixelSizeStr = paramsStr.substr(valueStart, valueEnd - valueStart);
                // Remove quotes and whitespace
                pixelSizeStr.erase(std::remove(pixelSizeStr.begin(), pixelSizeStr.end(), '"'), pixelSizeStr.end());
                pixelSizeStr.erase(std::remove(pixelSizeStr.begin(), pixelSizeStr.end(), ' '), pixelSizeStr.end());
                try {
                    params.pixelSize = std::stoi(pixelSizeStr);
                    if (params.pixelSize < 1) params.pixelSize = 1;
                    std::cout << "🔲 PixelSize from params: " << params.pixelSize << std::endl;
                } catch (...) {
                    std::cout << "⚠️ Invalid pixelSize in params, using default: " << params.pixelSize << std::endl;
                }
            }
        }
    }
    
    // Also check for direct parameters (fallback)
    auto intensityIt = data.find("intensity");
    if (intensityIt != data.end()) {
        try {
            params.intensity = std::stod(intensityIt->second);
            if (params.intensity < 0) params.intensity = 0;
            if (params.intensity > 1) params.intensity = 1;
            std::cout << "📊 Intensity parameter (direct): " << params.intensity << std::endl;
        } catch (...) {
            std::cout << "⚠️ Invalid intensity value, using default: " << params.intensity << std::endl;
        }
    }
    
    auto radiusIt = data.find("radius");
    if (radiusIt != data.end()) {
        try {
            params.radius = std::stod(radiusIt->second);
            if (params.radius < 0) params.radius = 0;
            std::cout << "📐 Radius parameter (direct): " << params.radius << std::endl;
        } catch (...) {
            std::cout << "⚠️ Invalid radius value, using default: " << params.radius << std::endl;
        }
    }
    
    auto pixelSizeIt = data.find("pixelSize");
    if (pixelSizeIt != data.end()) {
        try {
            params.pixelSize = std::stoi(pixelSizeIt->second);
            if (params.pixelSize < 1) params.pixelSize = 1;
            std::cout << "🔲 PixelSize parameter (direct): " << params.pixelSize << std::endl;
        } catch (...) {
            std::cout << "⚠️ Invalid pixelSize value, using default: " << params.pixelSize << std::endl;
        }
    }
    
    std::cout << "🎨 Applying effect with effect=" << effectName
              << ", intensity=" << params.intensity
              << ", radius=" << params.radius
              << ", pixelSize=" << params.pixelSize << std::endl;
    
    // Apply effect to both MJPEG and GPhoto wrapper (like in Go implementation)
    mjpegServer->setEffect(effect, params);
    gphoto->setEffect(effect, params);
    
    std::cout << "✅ Effect " << effectName << " applied to MJPEG stream and GPhoto wrapper" << std::endl;
    
    // Send response to client
    std::map<std::string, std::string> response;
    response["success"] = "true";
    response["effect"] = effectName;
    response["intensity"] = std::to_string(params.intensity);
    response["radius"] = std::to_string(params.radius);
    response["pixelSize"] = std::to_string(params.pixelSize);
    
    if (socketIOServer) {
        socketIOServer->emitToClient(clientSocket, "effect-applied", response);
    }
    
    // Broadcast to all clients that effect has been applied
    if (socketIOServer) {
        socketIOServer->broadcast("effectApplied", response);
    }
}

std::string PhotoBoothServer::generateJsonResponse(const std::map<std::string, std::string>& data) {
    std::ostringstream oss;
    oss << "{";
    
    bool first = true;
    for (const auto& pair : data) {
        if (!first) {
            oss << ",";
        }
        first = false;
        
        oss << "\"" << pair.first << "\":\"" << pair.second << "\"";
    }
    
    oss << "}";
    return oss.str();
}

std::string PhotoBoothServer::generatePhotoFilename() {
    std::string timestamp = getCurrentTimestamp();
    return "photo_" + timestamp + ".jpg";
}

// Main function
int main() {
    std::cout << "Starting Photo Booth Server (C++)..." << std::endl;
    
    // Register signal handlers
    signal(SIGINT, signalHandler);
    signal(SIGTERM, signalHandler);
    
    // Create and start server
    PhotoBoothServer server(API_PORT, MJPEG_PORT);
    globalServer = &server;
    
    if (!server.start()) {
        std::cerr << "Failed to start server" << std::endl;
        return 1;
    }
    
    std::cout << "Server started successfully" << std::endl;
    std::cout << "API server running on port " << API_PORT << std::endl;
    std::cout << "MJPEG server running on port " << MJPEG_PORT << std::endl;
    std::cout << "Socket.IO server running on port " << API_PORT << std::endl;
    
    // Main loop
    while (server.isRunning()) {
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    
    std::cout << "Server stopped" << std::endl;
    return 0;
}