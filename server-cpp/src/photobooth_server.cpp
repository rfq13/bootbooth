#include "../include/server.h"
#include "../include/booth_identity.h"

PhotoBoothServer::PhotoBoothServer(int apiPort, int mjpegPort)
    : apiPort(apiPort), mjpegPort(mjpegPort), running(false) {
    createDirectories("uploads");
    createDirectories("previews");
    gphoto = new GPhotoWrapper("uploads", "previews");
    mjpegServer = new MJPEGServer(mjpegPort);
    webSocketServer = new WebSocketServer(apiPort, this);
    identityStore = new BoothIdentityStore();
    createDirectories("data");
    identityStore->init("data");
}

PhotoBoothServer::~PhotoBoothServer() {
    stop();
    delete gphoto;
    delete mjpegServer;
    delete webSocketServer;
    delete identityStore;
}

bool PhotoBoothServer::start() {
    if (running) {
        return true;
    }
    if (!mjpegServer->start()) {
        std::cerr << "Failed to start MJPEG server" << std::endl;
        return false;
    }
    if (!webSocketServer->start()) {
        std::cerr << "Failed to start WebSocket server" << std::endl;
        return false;
    }
    running = true;
    return true;
}

bool PhotoBoothServer::stop() {
    if (!running) {
        return true;
    }
    mjpegServer->stop();
    webSocketServer->stop();
    running = false;
    return true;
}

bool PhotoBoothServer::isRunning() const {
    return running;
}

bool PhotoBoothServer::identityRegistered() const {
    if (!identityStore) return false;
    return identityStore->hasIdentity();
}

std::vector<Photo> PhotoBoothServer::getPhotosList() {
    std::vector<Photo> photos;
    try {
        auto entries = filesystem_compat::directory_entries("uploads");
        for (const auto& filename : entries) {
            if (filename.size() > 4 &&
                (filename.substr(filename.size() - 4) == ".jpg" ||
                 filename.substr(filename.size() - 5) == ".jpeg")) {
                Photo photo;
                photo.filename = filename;
                photo.path = "/uploads/" + filename;
                if (filename.find("photo_") == 0) {
                    std::string timestampStr = filename.substr(6, filename.size() - 10);
                    try { photo.timestamp = std::stoll(timestampStr); } catch (...) { photo.timestamp = std::time(nullptr); }
                } else {
                    photo.timestamp = std::time(nullptr);
                }
                photo.simulated = false;
                photos.push_back(photo);
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Error reading uploads directory: " << e.what() << std::endl;
    }
    std::sort(photos.begin(), photos.end(), [](const Photo& a, const Photo& b) { return a.timestamp > b.timestamp; });
    return photos;
}

std::vector<unsigned char> PhotoBoothServer::readImageFile(const std::string& filePath) {
    return gphoto->readImageFile(filePath);
}

bool PhotoBoothServer::deletePhoto(const std::string& filename) {
    if (filename.find("..") != std::string::npos ||
        filename.find("/") != std::string::npos ||
        filename.find("\\") != std::string::npos) {
        return false;
    }
    std::string filePath = "uploads/" + filename;
    try {
        return filesystem_compat::remove(filePath);
    } catch (const std::exception& e) {
        std::cerr << "Error deleting photo: " << e.what() << std::endl;
        return false;
    }
}

void PhotoBoothServer::handleHttpRequest(int clientSocket, const std::string& request) {
    (void)clientSocket; (void)request; // Suppress unused parameter warnings
}

void PhotoBoothServer::handleWebSocketConnection(int clientSocket) {
    (void)clientSocket; // Suppress unused parameter warning
}

void PhotoBoothServer::handleStatusRequest(int clientSocket) {
    (void)clientSocket; // Suppress unused parameter warning
}

void PhotoBoothServer::handlePhotosRequest(int clientSocket) {
    (void)clientSocket; // Suppress unused parameter warning
}

void PhotoBoothServer::handlePreviewRequest(int clientSocket) {
    (void)clientSocket; // Suppress unused parameter warning
}

void PhotoBoothServer::handlePhotoDeleteRequest(int clientSocket, const std::string& filename) {
    (void)clientSocket; (void)filename; // Suppress unused parameter warnings
}

void PhotoBoothServer::handleImageRequest(int clientSocket, const std::string& filename,
                                         const std::map<std::string, std::string>& queryParams) {
    (void)clientSocket; (void)filename; (void)queryParams; // Suppress unused parameter warnings
}

void PhotoBoothServer::handleDetectCameraEvent(connection_hdl hdl) {
    if (!identityRegistered()) {
        std::map<std::string, std::string> resp; resp["success"] = "false"; resp["error"] = "identity_required"; if (webSocketServer) { webSocketServer->emitToClient(hdl, "camera-detected", resp); } return;
    }
    std::cout << "📷 Detecting cameras..." << std::endl;
    std::vector<Camera> cameras = gphoto->detectCamera();
    bool connected = !cameras.empty();
    std::map<std::string, std::string> response;
    response["success"] = connected ? "true" : "false";
    response["count"] = std::to_string(cameras.size());
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
    if (webSocketServer) {
        webSocketServer->emitToClient(hdl, "camera-detected", response);
    }
    std::cout << "✅ Camera detection completed: " << cameras.size() << " cameras found" << std::endl;
}

void PhotoBoothServer::handleStartPreviewEvent(connection_hdl hdl, const std::map<std::string, std::string>& data) {
    if (!identityRegistered()) { std::map<std::string, std::string> r; r["success"] = "false"; r["error"] = "identity_required"; if (webSocketServer) { webSocketServer->emitToClient(hdl, "preview-started", r); } return; }
    std::cout << "📹 Starting preview stream..." << std::endl;
    if (mjpegServer->isActive()) {
        std::cout << "⚠️ Stopping existing stream before starting new one..." << std::endl;
        mjpegServer->stopStream();
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
    auto [mjpegSuccess, mjpegError, mjpegUrl] = mjpegServer->startStream();
    if (mjpegSuccess) {
        std::cout << "✅ MJPEG stream started successfully" << std::endl;
        std::map<std::string, std::string> response;
        response["success"] = "true";
        response["streamUrl"] = mjpegUrl;
        response["port"] = std::to_string(MJPEG_PORT);
        if (webSocketServer) {
            webSocketServer->emitToClient(hdl, "mjpeg-stream-started", response);
        }
        std::map<std::string, std::string> previewResponse;
        previewResponse["success"] = "true";
        previewResponse["mjpeg"] = "true";
        if (webSocketServer) {
            webSocketServer->emitToClient(hdl, "preview-started", previewResponse);
        }
        return;
    }
    int fps = 4;
    auto fpsIt = data.find("fps");
    if (fpsIt != data.end()) {
        try { fps = std::stoi(fpsIt->second); if (fps <= 0) fps = 4; } catch (...) { fps = 4; }
    }
    auto result = gphoto->startPreviewStream([this, hdl](const std::string& event, const std::map<std::string, std::string>& payload) {
        if (webSocketServer) {
            webSocketServer->emitToClient(hdl, event, payload);
        }
    }, fps);
    if (result["success"] == "true") {
        std::map<std::string, std::string> response;
        response["success"] = "true";
        response["mjpeg"] = "false";
        response["fps"] = std::to_string(fps);
        if (webSocketServer) {
            webSocketServer->emitToClient(hdl, "preview-started", response);
        }
    } else {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["mjpeg"] = "false";
        response["error"] = result["error"];
        if (webSocketServer) {
            webSocketServer->emitToClient(hdl, "preview-started", response);
        }
    }
}

void PhotoBoothServer::handleStopPreviewEvent(connection_hdl hdl) {
    if (!identityRegistered()) { return; }
    std::cout << "🛑 Stopping preview stream..." << std::endl;
    mjpegServer->stopStream();
    gphoto->stopPreviewStream();
    std::map<std::string, std::string> response;
    response["success"] = "true";
    if (webSocketServer) {
        webSocketServer->emitToClient(hdl, "mjpeg-stream-stopped", response);
    }
    std::cout << "✅ Preview stream stopped" << std::endl;
}

void PhotoBoothServer::handleStopMjpegEvent(connection_hdl hdl) {
    if (!identityRegistered()) { return; }
    if (mjpegServer->isActive()) {
        std::cout << "🛑 Stopping MJPEG stream (explicit)..." << std::endl;
        mjpegServer->stopStream();
        std::map<std::string, std::string> response;
        response["success"] = "true";
        if (webSocketServer) {
            webSocketServer->emitToClient(hdl, "mjpeg-stream-stopped", response);
        }
    }
}

void PhotoBoothServer::handleCapturePhotoEvent(connection_hdl hdl) {
    if (!identityRegistered()) { std::map<std::string, std::string> r; r["success"] = "false"; r["error"] = "identity_required"; if (webSocketServer) { webSocketServer->emitToClient(hdl, "photo-captured", r); } return; }
    std::cout << "📸 Capturing photo..." << std::endl;
    bool wasActive = mjpegServer->isActive();
    if (wasActive) {
        std::cout << "⚠️ Stopping stream for capture..." << std::endl;
        mjpegServer->stopStream();
        std::map<std::string, std::string> stopResponse;
        stopResponse["success"] = "true";
        if (webSocketServer) {
            webSocketServer->emitToClient(hdl, "mjpeg-stream-stopped", stopResponse);
        }
        std::cout << "⏳ Waiting for camera to be ready..." << std::endl;
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
    auto result = gphoto->captureImage();
    if (result["success"] != "true") {
        std::cout << "❌ Capture failed: " << result["error"] << std::endl;
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["error"] = result["error"];
        if (webSocketServer) {
            webSocketServer->emitToClient(hdl, "photo-captured", response);
        }
        return;
    }
    std::cout << "✅ Photo captured successfully: " << result["filename"] << std::endl;
    if (webSocketServer) {
        webSocketServer->emitToClient(hdl, "photo-captured", result);
    }
    std::map<std::string, std::string> broadcastData;
    broadcastData["filename"] = result["filename"];
    broadcastData["path"] = result["url"];
    broadcastData["timestamp"] = result["timestamp"];
    broadcastData["simulated"] = "false";
    if (webSocketServer) {
        webSocketServer->broadcast("photoCaptured", broadcastData);
    }
    if (wasActive) {
        std::cout << "⏳ Cooling down after capture..." << std::endl;
        std::this_thread::sleep_for(std::chrono::milliseconds(250));
    }
}

void PhotoBoothServer::handleSetEffectEvent(connection_hdl hdl, const std::map<std::string, std::string>& data) {
    auto effectIt = data.find("effect");
    if (effectIt == data.end()) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["error"] = "Invalid effect name";
        if (webSocketServer) {
            webSocketServer->emitToClient(hdl, "effect-changed", response);
        }
        return;
    }
    std::string effectName = effectIt->second;
    EffectType effect = EffectType::NONE;
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
    auto pIntensityIt = data.find("params.intensity");
    if (pIntensityIt != data.end()) {
        try { params.intensity = std::stod(pIntensityIt->second); if (params.intensity < 0) params.intensity = 0; if (params.intensity > 1) params.intensity = 1; } catch (...) {}
    }
    auto pRadiusIt = data.find("params.radius");
    if (pRadiusIt != data.end()) {
        try { params.radius = std::stod(pRadiusIt->second); if (params.radius < 0) params.radius = 0; } catch (...) {}
    }
    auto pPixelSizeIt = data.find("params.pixelSize");
    if (pPixelSizeIt != data.end()) {
        try { params.pixelSize = std::stoi(pPixelSizeIt->second); if (params.pixelSize < 1) params.pixelSize = 1; } catch (...) {}
    }
    auto intensityIt = data.find("intensity");
    if (intensityIt != data.end()) {
        try { params.intensity = std::stod(intensityIt->second); if (params.intensity < 0) params.intensity = 0; if (params.intensity > 1) params.intensity = 1; } catch (...) {}
    }
    auto radiusIt = data.find("radius");
    if (radiusIt != data.end()) {
        try { params.radius = std::stod(radiusIt->second); if (params.radius < 0) params.radius = 0; } catch (...) {}
    }
    auto pixelSizeIt = data.find("pixelSize");
    if (pixelSizeIt != data.end()) {
        try { params.pixelSize = std::stoi(pixelSizeIt->second); if (params.pixelSize < 1) params.pixelSize = 1; } catch (...) {}
    }
    mjpegServer->setEffect(effect, params);
    gphoto->setEffect(effect, params);
    std::cout << "🎨 Effect set to: " << effectName << " with params: intensity=" << params.intensity
              << ", radius=" << params.radius << ", pixelSize=" << params.pixelSize << std::endl;
    std::map<std::string, std::string> response;
    response["success"] = "true";
    response["effect"] = effectName;
    response["intensity"] = std::to_string(params.intensity);
    response["radius"] = std::to_string(params.radius);
    response["pixelSize"] = std::to_string(params.pixelSize);
    if (webSocketServer) {
        webSocketServer->emitToClient(hdl, "effect-changed", response);
    }
    if (webSocketServer) {
        webSocketServer->broadcast("effectChanged", response);
    }
}

void PhotoBoothServer::handleGetEffectEvent(connection_hdl hdl) {
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
    if (webSocketServer) {
        webSocketServer->emitToClient(hdl, "current-effect", response);
    }
}

void PhotoBoothServer::handleApplyEffectEvent(connection_hdl hdl, const std::map<std::string, std::string>& data) {
    std::cout << "🎨 Received apply-effect event from client" << std::endl;
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
        if (webSocketServer) {
            webSocketServer->emitToClient(hdl, "effect-applied", response);
        }
        return;
    }
    std::string effectName = effectIt->second;
    std::cout << "🎯 Effect to apply: " << effectName << std::endl;
    EffectType effect = EffectType::NONE;
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
    auto pIntensityIt2 = data.find("params.intensity");
    if (pIntensityIt2 != data.end()) {
        try { params.intensity = std::stod(pIntensityIt2->second); if (params.intensity < 0) params.intensity = 0; if (params.intensity > 1) params.intensity = 1; } catch (...) {}
    }
    auto pRadiusIt2 = data.find("params.radius");
    if (pRadiusIt2 != data.end()) {
        try { params.radius = std::stod(pRadiusIt2->second); if (params.radius < 0) params.radius = 0; } catch (...) {}
    }
    auto pPixelSizeIt2 = data.find("params.pixelSize");
    if (pPixelSizeIt2 != data.end()) {
        try { params.pixelSize = std::stoi(pPixelSizeIt2->second); if (params.pixelSize < 1) params.pixelSize = 1; } catch (...) {}
    }
    auto paramsIt = data.find("params");
    if (paramsIt != data.end()) {
        std::string paramsStr = paramsIt->second;
        size_t intensityPos = paramsStr.find("\"intensity\":");
        if (intensityPos != std::string::npos) {
            size_t valueStart = paramsStr.find(":", intensityPos) + 1;
            size_t valueEnd = paramsStr.find(",", valueStart);
            if (valueEnd == std::string::npos) valueEnd = paramsStr.find("}", valueStart);
            if (valueEnd != std::string::npos) {
                std::string intensityStr = paramsStr.substr(valueStart, valueEnd - valueStart);
                intensityStr.erase(std::remove(intensityStr.begin(), intensityStr.end(), '"'), intensityStr.end());
                intensityStr.erase(std::remove(intensityStr.begin(), intensityStr.end(), ' '), intensityStr.end());
                try { params.intensity = std::stod(intensityStr); if (params.intensity < 0) params.intensity = 0; if (params.intensity > 1) params.intensity = 1; } catch (...) {}
            }
        }
        size_t radiusPos = paramsStr.find("\"radius\":");
        if (radiusPos != std::string::npos) {
            size_t valueStart = paramsStr.find(":", radiusPos) + 1;
            size_t valueEnd = paramsStr.find(",", valueStart);
            if (valueEnd == std::string::npos) valueEnd = paramsStr.find("}", valueStart);
            if (valueEnd != std::string::npos) {
                std::string radiusStr = paramsStr.substr(valueStart, valueEnd - valueStart);
                radiusStr.erase(std::remove(radiusStr.begin(), radiusStr.end(), '"'), radiusStr.end());
                radiusStr.erase(std::remove(radiusStr.begin(), radiusStr.end(), ' '), radiusStr.end());
                try { params.radius = std::stod(radiusStr); if (params.radius < 0) params.radius = 0; } catch (...) {}
            }
        }
        size_t pixelSizePos = paramsStr.find("\"pixelSize\":");
        if (pixelSizePos != std::string::npos) {
            size_t valueStart = paramsStr.find(":", pixelSizePos) + 1;
            size_t valueEnd = paramsStr.find(",", valueStart);
            if (valueEnd == std::string::npos) valueEnd = paramsStr.find("}", valueStart);
            if (valueEnd != std::string::npos) {
                std::string pixelSizeStr = paramsStr.substr(valueStart, valueEnd - valueStart);
                pixelSizeStr.erase(std::remove(pixelSizeStr.begin(), pixelSizeStr.end(), '"'), pixelSizeStr.end());
                pixelSizeStr.erase(std::remove(pixelSizeStr.begin(), pixelSizeStr.end(), ' '), pixelSizeStr.end());
                try { params.pixelSize = std::stoi(pixelSizeStr); if (params.pixelSize < 1) params.pixelSize = 1; } catch (...) {}
            }
        }
    }
    auto intensityIt = data.find("intensity");
    if (intensityIt != data.end()) {
        try { params.intensity = std::stod(intensityIt->second); if (params.intensity < 0) params.intensity = 0; if (params.intensity > 1) params.intensity = 1; } catch (...) {}
    }
    auto radiusIt = data.find("radius");
    if (radiusIt != data.end()) {
        try { params.radius = std::stod(radiusIt->second); if (params.radius < 0) params.radius = 0; } catch (...) {}
    }
    auto pixelSizeIt = data.find("pixelSize");
    if (pixelSizeIt != data.end()) {
        try { params.pixelSize = std::stoi(pixelSizeIt->second); if (params.pixelSize < 1) params.pixelSize = 1; } catch (...) {}
    }
    std::cout << "🎨 Applying effect with effect=" << effectName
              << ", intensity=" << params.intensity
              << ", radius=" << params.radius
              << ", pixelSize=" << params.pixelSize << std::endl;
    mjpegServer->setEffect(effect, params);
    gphoto->setEffect(effect, params);
    std::cout << "✅ Effect " << effectName << " applied to MJPEG stream and GPhoto wrapper" << std::endl;
    std::map<std::string, std::string> response;
    response["success"] = "true";
    response["effect"] = effectName;
    response["intensity"] = std::to_string(params.intensity);
    response["radius"] = std::to_string(params.radius);
    response["pixelSize"] = std::to_string(params.pixelSize);
    if (webSocketServer) {
        webSocketServer->emitToClient(hdl, "effect-applied", response);
    }
    if (webSocketServer) {
        webSocketServer->broadcast("effectApplied", response);
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