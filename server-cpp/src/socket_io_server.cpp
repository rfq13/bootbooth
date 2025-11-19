#include "../include/server.h"
#include "../include/booth_identity.h"
#include <cerrno>
#include <sys/time.h>
#include <cstring>

SocketIOServer::SocketIOServer(int port, PhotoBoothServer* photoBoothServer)
    : port(port), running(false), photoBoothServer(photoBoothServer), serverSocket(-1) {
    ioClient = std::make_unique<sio::client>();
}

SocketIOServer::~SocketIOServer() {
    stop();
}

bool SocketIOServer::start() {
    if (running) {
        return true;
    }
    
    try {
        std::cout << "🚀 Starting HTTP Server on port " << port << "..." << std::endl;
        
        // Create HTTP server socket
        serverSocket = socket(AF_INET, SOCK_STREAM, 0);
        if (serverSocket < 0) {
            std::cerr << "❌ Failed to create socket" << std::endl;
            return false;
        }
        
        // Set socket options
        int opt = 1;
        if (setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
            std::cerr << "❌ Failed to set socket options" << std::endl;
            close(serverSocket);
            return false;
        }
        
        // Bind to port
        struct sockaddr_in serverAddr;
        memset(&serverAddr, 0, sizeof(serverAddr));
        serverAddr.sin_family = AF_INET;
        serverAddr.sin_addr.s_addr = INADDR_ANY;
        serverAddr.sin_port = htons(port);
        
        if (bind(serverSocket, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
            std::cerr << "❌ Failed to bind to port " << port << std::endl;
            close(serverSocket);
            return false;
        }
        
        // Start listening
        if (listen(serverSocket, 10) < 0) {
            std::cerr << "❌ Failed to listen on port " << port << std::endl;
            close(serverSocket);
            return false;
        }
        
        running = true;
        
        // Start server thread
        serverThread = std::thread(&SocketIOServer::runServer, this);
        
        std::cout << "✅ HTTP Server started successfully on port " << port << std::endl;
        std::cout << "🌐 API endpoints available at http://localhost:" << port << std::endl;
        
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "Error starting server: " << e.what() << std::endl;
        return false;
    }
}

bool SocketIOServer::stop() {
    if (!running) {
        return true;
    }
    
    running = false;
    
    // Close server socket
    if (serverSocket >= 0) {
        close(serverSocket);
        serverSocket = -1;
    }
    
    // Wait for server thread to finish
    if (serverThread.joinable()) {
        serverThread.join();
    }
    
    std::cout << "🛑 HTTP Server stopped" << std::endl;
    return true;
}

bool SocketIOServer::isRunning() const {
    return running;
}

void SocketIOServer::emitToClient(int clientSocket, const std::string& event, const std::map<std::string, std::string>& data) {
    if (!isRunning()) {
        return;
    }
    
    // Log event instead of emitting via Socket.IO
    std::cout << "📤 Event to client " << clientSocket << ": " << event << " " << mapToJsonObject(data) << std::endl;
}

void SocketIOServer::broadcast(const std::string& event, const std::map<std::string, std::string>& data) {
    if (!isRunning()) {
        return;
    }
    
    // Log event instead of broadcasting via Socket.IO
    std::cout << "📡 Broadcast event: " << event << " " << mapToJsonObject(data) << std::endl;
}

void SocketIOServer::emitToAll(const std::string& event, const std::map<std::string, std::string>& data) {
    broadcast(event, data);
}

void SocketIOServer::setupEventHandlers() {
    // Empty implementation for standalone mode
}

void SocketIOServer::onClientConnected(const std::string& sessionId) {
    std::lock_guard<std::mutex> lock(clientsMutex);
    clientSessions[sessionId] = sessionId;
    std::cout << "Client connected with session ID: " << sessionId << std::endl;
}

void SocketIOServer::onClientDisconnected(const std::string& sessionId) {
    std::lock_guard<std::mutex> lock(clientsMutex);
    clientSessions.erase(sessionId);
    std::cout << "Client disconnected with session ID: " << sessionId << std::endl;
}

void SocketIOServer::handleSocketIOEvent(sio::event& ev) {
    std::string eventName = ev.get_name();
    std::map<std::string, std::string> eventData;
    
    std::cout << "📨 Received Socket.IO event: " << eventName << std::endl;
    
    // Parse event data
    if (ev.get_message()) {
        if (ev.get_message()->get_flag() == sio::message::flag_object) {
            auto objMsg = std::static_pointer_cast<sio::object_message>(ev.get_message());
            auto& map = objMsg->get_map();
            for (const auto& pair : map) {
                if (pair.second->get_flag() == sio::message::flag_string) {
                    eventData[pair.first] = std::static_pointer_cast<sio::string_message>(pair.second)->get_string();
                }
            }
        } else if (ev.get_message()->get_flag() == sio::message::flag_string) {
            auto strMsg = std::static_pointer_cast<sio::string_message>(ev.get_message());
            eventData["data"] = strMsg->get_string();
        }
    }
    
    std::cout << "📋 Event data for " << eventName << ": ";
    for (const auto& pair : eventData) {
        std::cout << pair.first << "=" << pair.second << " ";
    }
    std::cout << std::endl;
    
    // Handle events with error checking
    try {
        if (eventName == "detect-camera") {
            this->photoBoothServer->handleDetectCameraEvent(0); // Use 0 as placeholder for client socket
        } else if (eventName == "start-preview") {
            this->photoBoothServer->handleStartPreviewEvent(0, eventData);
        } else if (eventName == "stop-preview") {
            this->photoBoothServer->handleStopPreviewEvent(0);
        } else if (eventName == "stop-mjpeg") {
            this->photoBoothServer->handleStopMjpegEvent(0);
        } else if (eventName == "capture-photo") {
            this->photoBoothServer->handleCapturePhotoEvent(0);
        } else if (eventName == "set-effect") {
            this->photoBoothServer->handleSetEffectEvent(0, eventData);
        } else if (eventName == "get-effect") {
            this->photoBoothServer->handleGetEffectEvent(0);
        } else if (eventName == "apply-effect") {
            this->photoBoothServer->handleApplyEffectEvent(0, eventData);
        } else {
            std::cout << "⚠️ Unknown event: " << eventName << std::endl;
        }
    } catch (const std::exception& e) {
        std::cout << "❌ Error handling event " << eventName << ": " << e.what() << std::endl;
    }
}

std::string SocketIOServer::mapToJsonObject(const std::map<std::string, std::string>& data) {
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

void SocketIOServer::handleApiRequest(const std::string& method, const std::string& path, const std::map<std::string, std::string>& data) {
    std::cout << "📥 API Request: " << method << " " << path << std::endl;
    
    // Check identity requirement
    if (path != "/api/identity" && photoBoothServer && !photoBoothServer->identityRegistered()) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["error"] = "identity_required";
        broadcast("api-response", response);
        return;
    }
    
    if (path == "/api/status" && method == "GET") {
        handleApiStatusRequest("current");
    } else if (path == "/api/photos" && method == "GET") {
        handleApiPhotosRequest("current");
    } else if (path == "/api/preview" && method == "GET") {
        handleApiPreviewRequest("current");
    } else if (path.find("/api/photos/") == 0 && method == "DELETE") {
        std::string filename = path.substr(12);
        handleApiPhotoDeleteRequest("current", filename);
    } else if (path == "/api/identity" && method == "GET") {
        auto st = photoBoothServer->getIdentityStore();
        std::map<std::string, std::string> responseData;
        if (st && st->hasIdentity()) {
            auto v = st->getLatest();
            responseData = v;
            responseData["success"] = "true";
        } else {
            responseData["success"] = "false";
        }
        std::string json = generateJsonResponseWithBoolean(responseData);
        broadcast("api-response", {{"data", json}});
    } else if (path == "/api/identity" && method == "POST") {
        std::cout << "📥 Received POST /api/identity request" << std::endl;
        
        std::string boothName = data.count("booth_name") ? data.at("booth_name") : "";
        std::string enc = data.count("encrypted_data") ? data.at("encrypted_data") : "";
        std::string locStr;
        
        // Parse location
        if (data.count("location.lat") && data.count("location.lng")) {
            locStr = data.at("location.lat") + "," + data.at("location.lng");
        } else if (data.count("location")) {
            locStr = data.at("location");
        }
        
        std::cout << "🔍 Parsed booth_name: " << boothName << std::endl;
        std::cout << "🔍 Parsed location: " << locStr << std::endl;
        std::cout << "🔍 Parsed encrypted_data: " << (enc.empty() ? "(empty)" : "(present)") << std::endl;
        
        bool ok = false;
        if (!boothName.empty() && !locStr.empty()) {
            auto st = photoBoothServer->getIdentityStore();
            if (st) {
                ok = st->save(boothName, locStr, enc);
                std::cout << "💾 Save result: " << (ok ? "SUCCESS" : "FAILED") << std::endl;
            } else {
                std::cout << "❌ Identity store is null" << std::endl;
            }
        } else {
            std::cout << "❌ Missing required fields - booth_name: " << (boothName.empty() ? "MISSING" : "OK")
                      << ", location: " << (locStr.empty() ? "MISSING" : "OK") << std::endl;
        }
        
        std::map<std::string, std::string> response;
        response["success"] = ok ? "true" : "false";
        if (!ok) response["error"] = "store_failed";
        broadcast("api-response", response);
        std::cout << "✅ Response sent successfully" << std::endl;
    } else {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["error"] = "not_found";
        broadcast("api-response", response);
    }
}

void SocketIOServer::handleApiStatusRequest(const std::string& sessionId) {
    (void)sessionId; // Suppress unused parameter warning
    std::vector<Camera> cameras = photoBoothServer->getGPhotoWrapper()->detectCamera();
    bool connected = !cameras.empty();
    std::ostringstream oss;
    oss << "{\"cameraConnected\":" << (connected ? "true" : "false")
        << ",\"message\":\"" << (connected ? "Kamera terhubung" : "Kamera tidak terhubung (mode simulasi)") << "\"}";
    std::string json = oss.str();
    broadcast("api-response", {{"data", json}});
}

void SocketIOServer::handleApiPhotosRequest(const std::string& sessionId) {
    (void)sessionId; // Suppress unused parameter warning
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
    broadcast("api-response", {{"data", json}});
}

void SocketIOServer::handleApiPreviewRequest(const std::string& sessionId) {
    (void)sessionId; // Suppress unused parameter warning
    auto result = photoBoothServer->getGPhotoWrapper()->capturePreviewFrame();
    std::string json = generateJsonResponse(result);
    broadcast("api-response", {{"data", json}});
}

void SocketIOServer::handleApiPhotoDeleteRequest(const std::string& sessionId, const std::string& filename) {
    (void)sessionId; // Suppress unused parameter warning
    bool success = photoBoothServer->deletePhoto(filename);
    std::map<std::string, std::string> data;
    data["success"] = success ? "true" : "false";
    if (!success) {
        data["error"] = "Gagal menghapus foto";
    }
    std::string json = generateJsonResponse(data);
    broadcast("api-response", {{"data", json}});
}

void SocketIOServer::handleImageRequest(const std::string& sessionId, const std::string& filename, const std::map<std::string, std::string>& queryParams) {
    (void)sessionId; // Suppress unused parameter warning
    if (filename.find("..") != std::string::npos ||
        filename.find("/") != std::string::npos ||
        filename.find("\\") != std::string::npos) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["error"] = "forbidden";
        broadcast("api-response", response);
        return;
    }
    
    std::string filePath = "uploads/" + filename;
    std::vector<unsigned char> imageData = photoBoothServer->readImageFile(filePath);
    
    if (imageData.empty()) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["error"] = "not_found";
        broadcast("api-response", response);
        return;
    }
    
    // Apply effects if requested
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
    
    // Convert image data to base64 and send as response
    std::string base64Data = photoBoothServer->getGPhotoWrapper()->base64Encode(imageData);
    std::map<std::string, std::string> response;
    response["success"] = "true";
    response["image"] = base64Data;
    response["content_type"] = "image/jpeg";
    broadcast("api-response", response);
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

std::string SocketIOServer::generateJsonResponseWithBoolean(const std::map<std::string, std::string>& data) {
    std::ostringstream oss;
    oss << "{";
    bool first = true;
    for (const auto& pair : data) {
        if (!first) {
            oss << ",";
        }
        first = false;
        if (pair.first == "success") {
            // Handle success field as boolean
            oss << "\"" << pair.first << "\":" << pair.second;
        } else {
            // Handle other fields as strings
            oss << "\"" << pair.first << "\":\"" << pair.second << "\"";
        }
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

void SocketIOServer::runServer() {
    std::cout << "🌐 HTTP Server thread started, waiting for connections..." << std::endl;
    
    while (running) {
        struct sockaddr_in clientAddr;
        socklen_t clientAddrLen = sizeof(clientAddr);
        
        int clientSocket = accept(serverSocket, (struct sockaddr*)&clientAddr, &clientAddrLen);
        if (clientSocket < 0) {
            if (running) {
                std::cerr << "❌ Failed to accept client connection" << std::endl;
            }
            continue;
        }
        
        std::cout << "📥 New client connected" << std::endl;
        
        // Handle client in a separate thread
        std::thread clientThread(&SocketIOServer::handleClient, this, clientSocket);
        clientThread.detach();
    }
    
    std::cout << "🛑 HTTP Server thread stopped" << std::endl;
}

void SocketIOServer::handleClient(int clientSocket) {
    char buffer[4096];
    ssize_t bytesRead = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
    
    if (bytesRead <= 0) {
        close(clientSocket);
        return;
    }
    
    buffer[bytesRead] = '\0';
    std::string request(buffer);
    
    std::cout << "📋 Received request:" << std::endl << request.substr(0, 200) << "..." << std::endl;
    
    // Parse HTTP request
    auto requestData = parseHttpRequest(request);
    std::string method = requestData["method"];
    std::string path = requestData["path"];
    
    // Handle different endpoints
    if (path.find("/api/") == 0) {
        std::string apiResponse = "{\"success\":false,\"error\":\"not_implemented\"}";
        
        if (path == "/api/identity" && method == "GET") {
            auto st = photoBoothServer->getIdentityStore();
            std::map<std::string, std::string> responseData;
            if (st && st->hasIdentity()) {
                auto v = st->getLatest();
                responseData = v;
                responseData["success"] = "true";
            } else {
                responseData["success"] = "false";
            }
            apiResponse = generateJsonResponseWithBoolean(responseData);
        } else if (path == "/api/status" && method == "GET") {
            std::vector<Camera> cameras = photoBoothServer->getGPhotoWrapper()->detectCamera();
            bool connected = !cameras.empty();
            std::ostringstream oss;
            oss << "{\"cameraConnected\":" << (connected ? "true" : "false")
                << ",\"message\":\"" << (connected ? "Kamera terhubung" : "Kamera tidak terhubung (mode simulasi)") << "\"}";
            apiResponse = oss.str();
        } else if (path == "/api/photos" && method == "GET") {
            std::vector<Photo> photos = photoBoothServer->getPhotosList();
            std::ostringstream oss;
            oss << "{\"photos\":[";
            for (size_t i = 0; i < photos.size(); ++i) {
                if (i > 0) oss << ",";
                oss << "{\"filename\":\"" << photos[i].filename << "\",";
                oss << "\"path\":\"" << photos[i].path << "\",";
                oss << "\"timestamp\":" << photos[i].timestamp << ",";
                oss << "\"simulated\":" << std::string(photos[i].simulated ? "true" : "false") << "}";
            }
            oss << "]}";
            apiResponse = oss.str();
        }
        
        sendHttpResponse(clientSocket, "200 OK", "application/json", apiResponse);
    } else if (path == "/") {
        // Simple health check
        sendHttpResponse(clientSocket, "200 OK", "text/plain", "Photo Booth Server is running");
    } else {
        sendHttpResponse(clientSocket, "404 Not Found", "text/plain", "Not Found");
    }
    
    close(clientSocket);
}

void SocketIOServer::sendHttpResponse(int clientSocket, const std::string& status, const std::string& contentType, const std::string& body) {
    std::ostringstream response;
    response << "HTTP/1.1 " << status << "\r\n";
    response << "Content-Type: " << contentType << "\r\n";
    response << "Content-Length: " << body.length() << "\r\n";
    response << "Access-Control-Allow-Origin: *\r\n";
    response << "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n";
    response << "Access-Control-Allow-Headers: Content-Type\r\n";
    response << "\r\n";
    response << body;
    
    std::string responseStr = response.str();
    send(clientSocket, responseStr.c_str(), responseStr.length(), 0);
}

std::map<std::string, std::string> SocketIOServer::parseHttpRequest(const std::string& request) {
    std::map<std::string, std::string> result;
    
    // Parse first line (method, path, protocol)
    size_t lineEnd = request.find("\r\n");
    if (lineEnd == std::string::npos) return result;
    
    std::string firstLine = request.substr(0, lineEnd);
    std::istringstream iss(firstLine);
    
    std::string method, path, protocol;
    if (iss >> method >> path >> protocol) {
        result["method"] = method;
        result["path"] = path;
        result["protocol"] = protocol;
    }
    
    // Parse headers (simplified)
    size_t pos = lineEnd + 2;
    while (pos < request.length()) {
        size_t nextLine = request.find("\r\n", pos);
        if (nextLine == std::string::npos) break;
        
        std::string line = request.substr(pos, nextLine - pos);
        if (line.empty()) break; // End of headers
        
        size_t colonPos = line.find(":");
        if (colonPos != std::string::npos) {
            std::string key = line.substr(0, colonPos);
            std::string value = line.substr(colonPos + 1);
            
            // Trim whitespace
            key.erase(0, key.find_first_not_of(" \t"));
            key.erase(key.find_last_not_of(" \t") + 1);
            value.erase(0, value.find_first_not_of(" \t"));
            value.erase(value.find_last_not_of(" \t") + 1);
            
            result[key] = value;
        }
        
        pos = nextLine + 2;
    }
    
    return result;
}