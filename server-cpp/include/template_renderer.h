#ifndef TEMPLATE_RENDERER_H
#define TEMPLATE_RENDERER_H

#include <string>
#include <vector>
#include <map>

struct RgbaImage {
    int width = 0;
    int height = 0;
    std::vector<unsigned char> data;
};

struct TextSpec {
    std::string content;
    std::string fontPath;
    int size = 48;
    unsigned char r = 255;
    unsigned char g = 255;
    unsigned char b = 255;
    float x = 0.0f;
    float y = 0.0f;
};

struct TemplateSpec {
    std::string backgroundPath;
    std::vector<std::string> overlays;
    std::vector<TextSpec> texts;
};

class TemplateRenderer {
public:
    TemplateRenderer();
    ~TemplateRenderer();

    bool renderToFile(const TemplateSpec& spec,
                      const std::string& photoPath,
                      int outW,
                      int outH,
                      const std::string& outFile);

    bool renderToJpegBuffer(const TemplateSpec& spec,
                            const std::string& photoPath,
                            int outW,
                            int outH,
                            std::vector<unsigned char>& outJpeg);

    static bool parseColorHex(const std::string& hex, unsigned char& r, unsigned char& g, unsigned char& b);

private:
    RgbaImage loadImageRGBA(const std::string& path);
    RgbaImage resizeImage(const RgbaImage& src, int w, int h);
    void blitImage(RgbaImage& dest, const RgbaImage& src, int x, int y);
    void blendImage(RgbaImage& dest, const RgbaImage& src, int x, int y);
    void fillBackground(RgbaImage& dest, unsigned char r, unsigned char g, unsigned char b);
    void drawText(RgbaImage& dest, const TextSpec& text);
    bool writeJpegToFile(const RgbaImage& rgba, const std::string& path);
    bool writeJpegToBuffer(const RgbaImage& rgba, std::vector<unsigned char>& out);
};

#endif