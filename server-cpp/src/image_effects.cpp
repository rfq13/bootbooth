#include "../include/server.h"

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
    ImageData rgbData = decodeJPEG(jpegData);
    if (rgbData.data.empty() || rgbData.width == 0 || rgbData.height == 0) {
        std::cerr << "Failed to decode JPEG, returning original data" << std::endl;
        return jpegData;
    }
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
    return encodeJPEG(rgbData);
}

ImageData ImageEffects::decodeJPEG(const std::vector<unsigned char>& jpegData) {
    ImageData result;
    if (jpegData.size() < 2 || jpegData[0] != 0xFF || jpegData[1] != 0xD8) {
        std::cerr << "❌ Invalid JPEG data" << std::endl;
        return result;
    }
    result.width = 640;
    result.height = 480;
    result.data.resize(result.width * result.height * 3);
    size_t jpegSize = jpegData.size();
    size_t rgbSize = result.data.size();
    for (size_t i = 0; i < rgbSize && i < jpegSize; i += 3) {
        size_t jpegIndex = (i * jpegSize) / rgbSize;
        if (jpegIndex + 2 < jpegSize) {
            result.data[i] = jpegData[jpegIndex];
            result.data[i + 1] = jpegData[jpegIndex + 1];
            result.data[i + 2] = jpegData[jpegIndex + 2];
        } else {
            result.data[i] = 128;
            result.data[i + 1] = 128;
            result.data[i + 2] = 128;
        }
    }
    std::cout << "🖼️ Decoded JPEG to RGB: " << result.width << "x" << result.height << std::endl;
    return result;
}

std::vector<unsigned char> ImageEffects::encodeJPEG(const ImageData& rgbData) {
    std::vector<unsigned char> jpegData;
    jpegData.push_back(0xFF);
    jpegData.push_back(0xD8);
    jpegData.push_back(0xFF);
    jpegData.push_back(0xE0);
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
    for (size_t i = 0; i < rgbData.data.size(); i += 3) {
        jpegData.push_back(rgbData.data[i]);
        jpegData.push_back(rgbData.data[i + 1]);
        jpegData.push_back(rgbData.data[i + 2]);
    }
    jpegData.push_back(0xFF);
    jpegData.push_back(0xD9);
    std::cout << "🖼️ Encoded RGB to JPEG: " << rgbData.width << "x" << rgbData.height << std::endl;
    return jpegData;
}

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
        unsigned char gray = static_cast<unsigned char>(0.299 * r + 0.587 * g + 0.114 * b);
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
        int tr = static_cast<int>(0.393 * r + 0.769 * g + 0.189 * b);
        int tg = static_cast<int>(0.349 * r + 0.686 * g + 0.168 * b);
        int tb = static_cast<int>(0.272 * r + 0.534 * g + 0.131 * b);
        tr = std::min(255, tr);
        tg = std::min(255, tg);
        tb = std::min(255, tb);
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
    if (kernelSize % 2 == 0) kernelSize++;
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