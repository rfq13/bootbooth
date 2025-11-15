#include "../include/server.h"

GPhotoWrapper::GPhotoWrapper(const std::string& outputDir, const std::string& previewDir)
    : outputDir(outputDir), previewDir(previewDir), isPreviewActive(false) {
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
    std::string result = executeCommand("gphoto2 --auto-detect");
    std::vector<std::string> lines = splitString(result, '\n');
    for (size_t i = 2; i < lines.size(); ++i) {
        std::string line = lines[i];
        if (line.empty()) continue;
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
    std::string timestamp = getCurrentTimestamp();
    std::string filename = "preview_" + timestamp + ".jpg";
    std::string path = previewDir + "/" + filename;
    std::string command = "gphoto2 --capture-preview --force-overwrite --filename " + path;
    std::string cmdResult = executeCommand(command);
    std::vector<unsigned char> imageData = readImageFile(path);
    if (imageData.empty()) {
        result["success"] = "false";
        result["error"] = "Preview file not created";
        return result;
    }
    std::vector<unsigned char> processedData = effects.applyEffect(imageData);
    cleanupPreviews(3);
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
    std::thread previewThread([this, emit, fps]() {
        int interval = 1000 / fps;
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
    previewThread.detach();
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
    std::string timestamp = getCurrentTimestamp();
    std::string filename = "photo_" + timestamp + ".jpg";
    std::string path = outputDir + "/" + filename;
    std::string command = "gphoto2 --capture-image-and-download --filename " + path + " --skip-existing";
    std::string cmdResult = executeCommand(command);
    std::vector<unsigned char> imageData = readImageFile(path);
    if (imageData.empty()) {
        result["success"] = "false";
        result["error"] = "Photo file not created";
        return result;
    }
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
}

void GPhotoWrapper::setEffect(EffectType effect, const EffectParams& params) {
    effects.setEffect(effect, params);
}

std::pair<EffectType, EffectParams> GPhotoWrapper::getCurrentEffect() const {
    return effects.getEffect();
}

std::string GPhotoWrapper::executeCommand(const std::string& command) {
    std::string result;
    FILE* pipe = popen(command.c_str(), "r");
    if (!pipe) {
        std::cerr << "Error executing command: " << command << std::endl;
        return "";
    }
    char buffer[128];
    while (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
        result += buffer;
    }
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
    file.seekg(0, std::ios::end);
    size_t fileSize = file.tellg();
    file.seekg(0, std::ios::beg);
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