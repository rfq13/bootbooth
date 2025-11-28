#include "../include/template_renderer.h"
#include "../include/stb_image.h"
#include "../include/stb_image_write.h"
#include <fstream>
#include <cmath>
#include <algorithm>

TemplateRenderer::TemplateRenderer() {}
TemplateRenderer::~TemplateRenderer() {}

static inline unsigned char clampu8(int v) { return (unsigned char)(v < 0 ? 0 : (v > 255 ? 255 : v)); }

RgbaImage TemplateRenderer::loadImageRGBA(const std::string& path) {
    RgbaImage img;
    int x=0,y=0,n=0;
    unsigned char* data = stbi_load(path.c_str(), &x, &y, &n, 4);
    if (!data) {
        return img;
    }
    img.width = x;
    img.height = y;
    img.data.assign(data, data + (x*y*4));
    stbi_image_free(data);
    return img;
}

RgbaImage TemplateRenderer::resizeImage(const RgbaImage& src, int w, int h) {
    RgbaImage out;
    if (src.width<=0 || src.height<=0 || w<=0 || h<=0) return out;
    out.width = w; out.height = h; out.data.resize(w*h*4);
    double sx = (double)src.width / (double)w;
    double sy = (double)src.height / (double)h;
    for (int j=0;j<h;++j) {
        for (int i=0;i<w;++i) {
            int srcX = std::min((int)std::floor(i*sx), src.width-1);
            int srcY = std::min((int)std::floor(j*sy), src.height-1);
            const int sIdx = (srcY*src.width + srcX)*4;
            const int dIdx = (j*w + i)*4;
            out.data[dIdx+0] = src.data[sIdx+0];
            out.data[dIdx+1] = src.data[sIdx+1];
            out.data[dIdx+2] = src.data[sIdx+2];
            out.data[dIdx+3] = src.data[sIdx+3];
        }
    }
    return out;
}

void TemplateRenderer::blitImage(RgbaImage& dest, const RgbaImage& src, int x, int y) {
    if (dest.width<=0 || dest.height<=0 || src.width<=0 || src.height<=0) return;
    for (int j=0;j<src.height;++j) {
        int dy = y + j; if (dy<0 || dy>=dest.height) continue;
        for (int i=0;i<src.width;++i) {
            int dx = x + i; if (dx<0 || dx>=dest.width) continue;
            int sIdx = (j*src.width + i)*4;
            int dIdx = (dy*dest.width + dx)*4;
            dest.data[dIdx+0] = src.data[sIdx+0];
            dest.data[dIdx+1] = src.data[sIdx+1];
            dest.data[dIdx+2] = src.data[sIdx+2];
            dest.data[dIdx+3] = src.data[sIdx+3];
        }
    }
}

void TemplateRenderer::blendImage(RgbaImage& dest, const RgbaImage& src, int x, int y) {
    if (dest.width<=0 || dest.height<=0 || src.width<=0 || src.height<=0) return;
    for (int j=0;j<src.height;++j) {
        int dy = y + j; if (dy<0 || dy>=dest.height) continue;
        for (int i=0;i<src.width;++i) {
            int dx = x + i; if (dx<0 || dx>=dest.width) continue;
            int sIdx = (j*src.width + i)*4;
            int dIdx = (dy*dest.width + dx)*4;
            unsigned char sa = src.data[sIdx+3];
            if (sa == 255) {
                dest.data[dIdx+0] = src.data[sIdx+0];
                dest.data[dIdx+1] = src.data[sIdx+1];
                dest.data[dIdx+2] = src.data[sIdx+2];
                dest.data[dIdx+3] = 255;
            } else if (sa != 0) {
                float a = sa / 255.0f;
                dest.data[dIdx+0] = clampu8((int)(src.data[sIdx+0]*a + dest.data[dIdx+0]*(1.0f-a)));
                dest.data[dIdx+1] = clampu8((int)(src.data[sIdx+1]*a + dest.data[dIdx+1]*(1.0f-a)));
                dest.data[dIdx+2] = clampu8((int)(src.data[sIdx+2]*a + dest.data[dIdx+2]*(1.0f-a)));
                dest.data[dIdx+3] = 255;
            }
        }
    }
}

void TemplateRenderer::fillBackground(RgbaImage& dest, unsigned char r, unsigned char g, unsigned char b) {
    if (dest.width<=0 || dest.height<=0) return;
    dest.data.resize(dest.width*dest.height*4);
    for (int i=0;i<dest.width*dest.height;++i) {
        dest.data[i*4+0] = r;
        dest.data[i*4+1] = g;
        dest.data[i*4+2] = b;
        dest.data[i*4+3] = 255;
    }
}

bool TemplateRenderer::parseColorHex(const std::string& hex, unsigned char& r, unsigned char& g, unsigned char& b) {
    std::string s = hex;
    if (!s.empty() && s[0] == '#') s.erase(0,1);
    if (s.size() == 6) {
        int rv = std::stoi(s.substr(0,2), nullptr, 16);
        int gv = std::stoi(s.substr(2,2), nullptr, 16);
        int bv = std::stoi(s.substr(4,2), nullptr, 16);
        r = clampu8(rv); g = clampu8(gv); b = clampu8(bv);
        return true;
    }
    return false;
}

void TemplateRenderer::drawText(RgbaImage& dest, const TextSpec& text) {
    (void)dest; (void)text;
}

bool TemplateRenderer::writeJpegToFile(const RgbaImage& rgba, const std::string& path) {
    if (rgba.width<=0 || rgba.height<=0 || rgba.data.empty()) return false;
    std::vector<unsigned char> rgb(rgba.width*rgba.height*3);
    for (int i=0;i<rgba.width*rgba.height;++i) {
        rgb[i*3+0] = rgba.data[i*4+0];
        rgb[i*3+1] = rgba.data[i*4+1];
        rgb[i*3+2] = rgba.data[i*4+2];
    }
    return stbi_write_jpg(path.c_str(), rgba.width, rgba.height, 3, rgb.data(), 90) != 0;
}

static void write_to_vector(void* context, void* data, int size) {
    std::vector<unsigned char>* v = reinterpret_cast<std::vector<unsigned char>*>(context);
    unsigned char* p = reinterpret_cast<unsigned char*>(data);
    v->insert(v->end(), p, p+size);
}

bool TemplateRenderer::writeJpegToBuffer(const RgbaImage& rgba, std::vector<unsigned char>& out) {
    if (rgba.width<=0 || rgba.height<=0 || rgba.data.empty()) return false;
    std::vector<unsigned char> rgb(rgba.width*rgba.height*3);
    for (int i=0;i<rgba.width*rgba.height;++i) {
        rgb[i*3+0] = rgba.data[i*4+0];
        rgb[i*3+1] = rgba.data[i*4+1];
        rgb[i*3+2] = rgba.data[i*4+2];
    }
    out.clear();
    return stbi_write_jpg_to_func(write_to_vector, &out, rgba.width, rgba.height, 3, rgb.data(), 90) != 0;
}

bool TemplateRenderer::renderToJpegBuffer(const TemplateSpec& spec,
                                          const std::string& photoPath,
                                          int outW,
                                          int outH,
                                          std::vector<unsigned char>& outJpeg) {
    RgbaImage canvas; canvas.width = outW; canvas.height = outH; fillBackground(canvas, 255,255,255);

    if (!spec.backgroundPath.empty()) {
        auto bg = loadImageRGBA(spec.backgroundPath);
        if (bg.width>0) {
            auto bgR = resizeImage(bg, outW, outH);
            blitImage(canvas, bgR, 0, 0);
        }
    }

    auto photo = loadImageRGBA(photoPath);
    if (photo.width>0) {
        int pw = outW;
        int ph = (int)((double)photo.height * ((double)pw / (double)photo.width));
        if (ph > outH) {
            ph = outH;
            pw = (int)((double)photo.width * ((double)ph / (double)photo.height));
        }
        auto pr = resizeImage(photo, pw, ph);
        int px = (outW - pw)/2;
        int py = (outH - ph)/2;
        blitImage(canvas, pr, px, py);
    }

    for (const auto& ovPath : spec.overlays) {
        auto ov = loadImageRGBA(ovPath);
        if (ov.width>0) {
            auto orz = resizeImage(ov, outW, outH);
            blendImage(canvas, orz, 0, 0);
        }
    }

    for (auto t : spec.texts) {
        if (t.fontPath.empty()) {
            t.fontPath = "data/fonts/PlayfairDisplay-Regular.ttf";
        }
        drawText(canvas, t);
    }

    return writeJpegToBuffer(canvas, outJpeg);
}

bool TemplateRenderer::renderToFile(const TemplateSpec& spec,
                                    const std::string& photoPath,
                                    int outW,
                                    int outH,
                                    const std::string& outFile) {
    std::vector<unsigned char> buf;
    if (!renderToJpegBuffer(spec, photoPath, outW, outH, buf)) return false;
    std::ofstream ofs(outFile, std::ios::binary);
    if (!ofs.is_open()) return false;
    ofs.write(reinterpret_cast<const char*>(buf.data()), (std::streamsize)buf.size());
    return true;
}