#include "../include/server.h"

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
    serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSocket < 0) {
        std::cerr << "Error creating Socket.IO server socket" << std::endl;
        return false;
    }
    int opt = 1;
    if (setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        std::cerr << "Error setting Socket.IO server socket options" << std::endl;
        close(serverSocket);
        serverSocket = -1;
        return false;
    }
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
    if (listen(serverSocket, 10) < 0) {
        std::cerr << "Error listening on Socket.IO server socket" << std::endl;
        close(serverSocket);
        serverSocket = -1;
        return false;
    }
    running = true;
    std::thread serverThread([this]() { this->setupRoutes(); });
    serverThread.detach();
    std::cout << "Socket.IO server started on port " << port << std::endl;
    return true;
}

bool SocketIOServer::stop() {
    if (!running) {
        return true;
    }
    running = false;
    closeAllClients();
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
        {
            std::lock_guard<std::mutex> lock(clientsMutex);
            clientSockets.push_back(clientSocket);
        }
        std::thread clientThread([this, clientSocket]() { this->handleClient(clientSocket); });
        clientThread.detach();
    }
}

void SocketIOServer::handleClient(int clientSocket) {
    char buffer[4096];
    std::string request;
    while (true) {
        ssize_t bytesRead = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
        if (bytesRead <= 0) {
            break;
        }
        buffer[bytesRead] = '\0';
        request += buffer;
        if (request.find("\r\n\r\n") != std::string::npos) {
            break;
        }
    }
    if (request.find("socket.io/") != std::string::npos || request.find("Upgrade: websocket") != std::string::npos) {
        handleWebSocketHandshake(clientSocket, request);
    } else {
        handleHttpRequest(clientSocket, request);
    }
    removeClient(clientSocket);
    close(clientSocket);
}

void SocketIOServer::handleWebSocketHandshake(int clientSocket, const std::string& request) {
    if (request.find("Upgrade: websocket") == std::string::npos) {
        std::string response = "HTTP/1.1 200 OK\r\n"
                              "Content-Type: text/plain\r\n"
                              "Connection: close\r\n"
                              "\r\n"
                              "Socket.IO server running";
        send(clientSocket, response.c_str(), response.length(), 0);
        return;
    }
    size_t keyPos = request.find("Sec-WebSocket-Key: ");
    if (keyPos == std::string::npos) {
        return;
    }
    keyPos += 19;
    size_t keyEnd = request.find("\r\n", keyPos);
    std::string wsKey = request.substr(keyPos, keyEnd - keyPos);
    std::string encodedKey = computeWebSocketAccept(wsKey);
    std::string response = "HTTP/1.1 101 Switching Protocols\r\n"
                          "Upgrade: websocket\r\n"
                          "Connection: Upgrade\r\n"
                          "Sec-WebSocket-Accept: " + encodedKey + "\r\n"
                          "\r\n";
    send(clientSocket, response.c_str(), response.length(), 0);
    lastSid = generateSID();
    std::ostringstream openPayload;
    openPayload << "0{"
                << "\"sid\":\"" << lastSid << "\","
                << "\"upgrades\":[],"
                << "\"pingInterval\":25000,"
                << "\"pingTimeout\":5000"
                << "}";
    sendTextFrame(clientSocket, openPayload.str());
    sendTextFrame(clientSocket, std::string("40"));
    handleSocketIOMessages(clientSocket);
}

void SocketIOServer::handleSocketIOMessages(int clientSocket) {
    while (running) {
        std::string payload;
        if (!recvTextFrame(clientSocket, payload)) {
            break;
        }
        if (payload.empty()) continue;
        if (payload[0] == '2') {
            sendTextFrame(clientSocket, std::string("3"));
            continue;
        }
        if (payload[0] == '4') {
            size_t eventStart = payload.find("[\"");
            size_t eventEnd = payload.find("\"", eventStart + 2);
            if (eventStart != std::string::npos && eventEnd != std::string::npos) {
                std::string eventName = payload.substr(eventStart + 2, eventEnd - eventStart - 2);
                std::cout << "📨 Received Socket.IO event: " << eventName << std::endl;
                std::map<std::string, std::string> eventData;
                size_t dataStart = payload.find("{", eventEnd);
                size_t dataEnd = payload.find("}", dataStart);
                if (dataStart != std::string::npos && dataEnd != std::string::npos) {
                    std::string dataStr = payload.substr(dataStart, dataEnd - dataStart + 1);
                    std::cout << "📦 Event data string: " << dataStr << std::endl;
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
    frame.push_back(static_cast<char>(0x81));
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
    if ((finOpcode & 0x0F) != 0x1) return false;
    bool masked = (maskLen & 0x80) != 0;
    uint64_t len = (maskLen & 0x7F);
    if (len == 126) {
        uint16_t l;
        if (!recvExact(clientSocket, reinterpret_cast<char*>(&l), sizeof(l))) return false;
        len = ntohs(l);
    } else if (len == 127) {
        uint64_t l;
        if (!recvExact(clientSocket, reinterpret_cast<char*>(&l), sizeof(l))) return false;
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
    std::istringstream iss(request);
    std::string method, path, version;
    iss >> method >> path >> version;
    std::string response = "HTTP/1.1 200 OK\r\n"
                          "Access-Control-Allow-Origin: *\r\n"
                          "Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept\r\n"
                          "Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\n";
    if (method == "OPTIONS") {
        response += "Content-Length: 0\r\n\r\n";
        send(clientSocket, response.c_str(), response.length(), 0);
        return;
    }
    if (path == "/api/status" && method == "GET") {
        handleApiStatusRequest(clientSocket);
    } else if (path == "/api/photos" && method == "GET") {
        handleApiPhotosRequest(clientSocket);
    } else if (path == "/api/preview" && method == "GET") {
        handleApiPreviewRequest(clientSocket);
    } else if (path.find("/api/photos/") == 0 && method == "DELETE") {
        std::string filename = path.substr(12);
        handleApiPhotoDeleteRequest(clientSocket, filename);
    } else if (path.find("/uploads/") == 0 && method == "GET") {
        std::string filename = path.substr(9);
        size_t queryPos = filename.find('?');
        std::string query;
        if (queryPos != std::string::npos) {
            query = filename.substr(queryPos + 1);
            filename = filename.substr(0, queryPos);
        }
        auto queryParams = parseQueryString(query);
        handleImageRequest(clientSocket, filename, queryParams);
    } else {
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
    auto effectIt = queryParams.find("effect");
    if (effectIt != queryParams.end() && effectIt->second != "" && effectIt->second != "none") {
        EffectParams params;
        params.intensity = 0.5;
        params.radius = 1.0;
        params.pixelSize = 10;
        auto intensityIt = queryParams.find("intensity");
        if (intensityIt != queryParams.end()) {
            try { params.intensity = std::stod(intensityIt->second); } catch (...) {}
        }
        auto radiusIt = queryParams.find("radius");
        if (radiusIt != queryParams.end()) {
            try { params.radius = std::stod(radiusIt->second); } catch (...) {}
        }
        auto pixelSizeIt = queryParams.find("pixelSize");
        if (pixelSizeIt != queryParams.end()) {
            try { params.pixelSize = std::stoi(pixelSizeIt->second); } catch (...) {}
        }
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