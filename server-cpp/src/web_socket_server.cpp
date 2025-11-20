#include "../include/server.h"
#include "../include/booth_identity.h"
#include <cerrno>
#include <sys/time.h>
#include <cstring>
#include <sstream>
#include <regex>

WebSocketServer::WebSocketServer(int port, PhotoBoothServer* photoBoothServer)
    : port(port), running(false), photoBoothServer(photoBoothServer) {
    std::cout << "🔍 DEBUG: WebSocketServer constructor - IMPLEMENTING PROPER WEBSOCKET++ SERVER!" << std::endl;
    std::cout << "🔍 DEBUG: Using websocketpp::server as server - THIS IS THE CORRECT APPROACH!" << std::endl;
    wsServer = std::make_unique<websocket_server>();
}

WebSocketServer::~WebSocketServer() {
    stop();
}

bool WebSocketServer::start() {
    if (running) {
        return true;
    }
    
    try {
        std::cout << "🔍 DEBUG: WebSocketServer::start() - STARTING WEBSOCKET++ SERVER!" << std::endl;
        std::cout << "🚀 Starting WebSocket++ Server on port " << port << "..." << std::endl;
        
        // Set logging settings
        wsServer->set_access_channels(websocketpp::log::alevel::all);
        wsServer->clear_access_channels(websocketpp::log::alevel::frame_payload);
        wsServer->set_error_channels(websocketpp::log::elevel::all);
        
        // Initialize ASIO
        wsServer->init_asio();
        
        // Set the open handler
        wsServer->set_open_handler([this](connection_hdl hdl) {
            this->onOpen(hdl);
        });
        
        // Set the close handler
        wsServer->set_close_handler([this](connection_hdl hdl) {
            this->onClose(hdl);
        });
        
        // Set the message handler
        wsServer->set_message_handler([this](connection_hdl hdl, websocket_server::message_ptr msg) {
            this->onMessage(hdl, msg);
        });
        
        // Set the HTTP handler untuk regular HTTP requests
        wsServer->set_http_handler([this](connection_hdl hdl) {
            this->onHttpRequest(hdl);
        });
        
        // Listen on the specified port
        wsServer->listen(port);
        
        // Start the server accept loop
        wsServer->start_accept();
        
        running = true;
        
        // Start the server thread
        serverThread = std::thread([this]() {
            std::cout << "🌐 WebSocket++ Server thread started" << std::endl;
            wsServer->run();
            std::cout << "🛑 WebSocket++ Server thread stopped" << std::endl;
        });
        
        std::cout << "✅ WebSocket++ Server started successfully on port " << port << std::endl;
        std::cout << "🌐 WebSocket endpoint available at ws://localhost:" << port << std::endl;
        
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "Error starting WebSocket++ server: " << e.what() << std::endl;
        return false;
    }
}

bool WebSocketServer::stop() {
    if (!running) {
        return true;
    }
    
    running = false;
    
    try {
        // Stop the server
        wsServer->stop();
        
        // Wait for server thread to finish
        if (serverThread.joinable()) {
            serverThread.join();
        }
        
        std::cout << "🛑 WebSocket++ Server stopped" << std::endl;
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "Error stopping WebSocket++ server: " << e.what() << std::endl;
        return false;
    }
}

bool WebSocketServer::isRunning() const {
    return running;
}

void WebSocketServer::emitToClient(connection_hdl hdl, const std::string& event, const std::map<std::string, std::string>& data) {
    if (!isRunning()) {
        return;
    }
    
    try {
        // Create JSON message
        std::string jsonMessage = "{\"event\":\"" + event + "\",\"data\":" + mapToJsonObject(data) + "}";
        
        // Send message to specific client
        wsServer->send(hdl, jsonMessage, websocketpp::frame::opcode::text);
        
        std::cout << "📤 Event to client: " << event << " " << mapToJsonObject(data) << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "Error sending message to client: " << e.what() << std::endl;
    }
}

void WebSocketServer::broadcast(const std::string& event, const std::map<std::string, std::string>& data) {
    if (!isRunning()) {
        return;
    }
    
    try {
        // Create JSON message
        std::string jsonMessage = "{\"event\":\"" + event + "\",\"data\":" + mapToJsonObject(data) + "}";
        
        // Broadcast to all connected clients
        std::lock_guard<std::mutex> lock(clientsMutex);
        for (const auto& client : clients) {
            try {
                wsServer->send(client.first, jsonMessage, websocketpp::frame::opcode::text);
            } catch (const std::exception& e) {
                std::cerr << "Error broadcasting to client: " << e.what() << std::endl;
            }
        }
        
        std::cout << "📡 Broadcast event: " << event << " " << mapToJsonObject(data) << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "Error broadcasting message: " << e.what() << std::endl;
    }
}

void WebSocketServer::emitToAll(const std::string& event, const std::map<std::string, std::string>& data) {
    broadcast(event, data);
}

void WebSocketServer::setupEventHandlers() {
    // Event handlers are set in the start() method
}

void WebSocketServer::onOpen(connection_hdl hdl) {
    std::lock_guard<std::mutex> lock(clientsMutex);
    
    // Generate a unique session ID for this client using timestamp
    auto now = std::chrono::system_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
    std::string sessionId = "client_" + std::to_string(timestamp);
    clients[hdl] = sessionId;
    
    std::cout << "✅ Client connected with session ID: " << sessionId << std::endl;
    
    // Send connection confirmation
    std::map<std::string, std::string> connectData;
    connectData["sessionId"] = sessionId;
    connectData["message"] = "Connected to WebSocket++ server";
    emitToClient(hdl, "connected", connectData);
}

void WebSocketServer::onClose(connection_hdl hdl) {
    std::lock_guard<std::mutex> lock(clientsMutex);
    
    auto it = clients.find(hdl);
    if (it != clients.end()) {
        std::string sessionId = it->second;
        clients.erase(it);
        std::cout << "❌ Client disconnected with session ID: " << sessionId << std::endl;
    }
}

void WebSocketServer::onMessage(connection_hdl hdl, websocket_server::message_ptr msg) {
    try {
        std::string message = msg->get_payload();
        std::cout << "📨 Received WebSocket message: " << message << std::endl;
        
        // Handle the message
        handleWebSocketMessage(hdl, message);
        
    } catch (const std::exception& e) {
        std::cerr << "Error handling WebSocket message: " << e.what() << std::endl;
    }
}

void WebSocketServer::handleWebSocketMessage(connection_hdl hdl, const std::string& message) {
    try {
        // Parse JSON message using new event parser that preserves nested structure
        std::map<std::string, std::string> parsedData;
        parseEventJson(message, parsedData);
        
        // Check if this is an event message
        if (parsedData.count("event") && parsedData.count("data")) {
            std::string eventName = parsedData["event"];
            std::string dataStr = parsedData["data"];
            
            std::cout << "📋 Event: " << eventName << std::endl;
            std::cout << "📋 Data (preserved): " << dataStr << std::endl;
            
            // Parse the data object using the original parser for flat processing
            std::map<std::string, std::string> eventData;
            parseJsonObject(dataStr, eventData, "");
            
            // Handle the event
            handleEvent(hdl, eventName, eventData);
        } else {
            std::cout << "⚠️ Unknown message format: " << message << std::endl;
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error parsing WebSocket message: " << e.what() << std::endl;
    }
}

void WebSocketServer::handleEvent(connection_hdl hdl, const std::string& event, const std::map<std::string, std::string>& data) {
    std::cout << "📋 Handling event: " << event << std::endl;
    
    // Handle events with error checking
    try {
        if (event == "detect-camera") {
            this->photoBoothServer->handleDetectCameraEvent(hdl);
        } else if (event == "start-preview") {
            this->photoBoothServer->handleStartPreviewEvent(hdl, data);
        } else if (event == "stop-preview") {
            this->photoBoothServer->handleStopPreviewEvent(hdl);
        } else if (event == "stop-mjpeg") {
            this->photoBoothServer->handleStopMjpegEvent(hdl);
        } else if (event == "capture-photo") {
            std::cout << "🔍 DEBUG: capture-photo event detected" << std::endl;
            std::cout << "🔍 DEBUG: Data available: " << (data.empty() ? "NO" : "YES") << std::endl;
            std::cout << "🔍 DEBUG: Data content:" << std::endl;
            for (const auto& pair : data) {
                std::cout << "  " << pair.first << " = " << pair.second << std::endl;
            }
            std::cout << "🚨 CRITICAL: handleCapturePhotoEvent() does NOT receive data parameter!" << std::endl;
            this->photoBoothServer->handleCapturePhotoEvent(hdl);
        } else if (event == "set-effect") {
            this->photoBoothServer->handleSetEffectEvent(hdl, data);
        } else if (event == "get-effect") {
            this->photoBoothServer->handleGetEffectEvent(hdl);
        } else if (event == "apply-effect") {
            this->photoBoothServer->handleApplyEffectEvent(hdl, data);
        } else if (event == "api-request") {
            // Handle API requests through WebSocket
            std::string method = data.count("method") ? data.at("method") : "GET";
            std::string path = data.count("path") ? data.at("path") : "/";
            handleApiRequest(method, path, data);
        } else {
            std::cout << "⚠️ Unknown event: " << event << std::endl;
        }
    } catch (const std::exception& e) {
        std::cout << "❌ Error handling event " << event << ": " << e.what() << std::endl;
        
        // Send error response
        std::map<std::string, std::string> errorResponse;
        errorResponse["success"] = "false";
        errorResponse["error"] = e.what();
        emitToClient(hdl, "error", errorResponse);
    }
}

std::string WebSocketServer::mapToJsonObject(const std::map<std::string, std::string>& data) {
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

void WebSocketServer::handleApiRequest(const std::string& method, const std::string& path, const std::map<std::string, std::string>& data) {
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
        handleApiStatusRequest(connection_hdl()); // Broadcast to all
    } else if (path == "/api/photos" && method == "GET") {
        handleApiPhotosRequest(connection_hdl()); // Broadcast to all
    } else if (path == "/api/preview" && method == "GET") {
        handleApiPreviewRequest(connection_hdl()); // Broadcast to all
    } else if (path.find("/api/photos/") == 0 && method == "DELETE") {
        std::string filename = path.substr(12);
        handleApiPhotoDeleteRequest(connection_hdl(), filename); // Broadcast to all
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

void WebSocketServer::handleApiStatusRequest(connection_hdl hdl) {
    (void)hdl; // Suppress unused parameter warning
    std::vector<Camera> cameras = photoBoothServer->getGPhotoWrapper()->detectCamera();
    bool connected = !cameras.empty();
    std::ostringstream oss;
    oss << "{\"cameraConnected\":" << (connected ? "true" : "false")
        << ",\"message\":\"" << (connected ? "Kamera terhubung" : "Kamera tidak terhubung (mode simulasi)") << "\"}";
    std::string json = oss.str();
    broadcast("api-response", {{"data", json}});
}

void WebSocketServer::handleApiPhotosRequest(connection_hdl hdl) {
    (void)hdl; // Suppress unused parameter warning
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

void WebSocketServer::handleApiPreviewRequest(connection_hdl hdl) {
    (void)hdl; // Suppress unused parameter warning
    auto result = photoBoothServer->getGPhotoWrapper()->capturePreviewFrame();
    std::string json = generateJsonResponse(result);
    broadcast("api-response", {{"data", json}});
}

void WebSocketServer::handleApiPhotoDeleteRequest(connection_hdl hdl, const std::string& filename) {
    (void)hdl; // Suppress unused parameter warning
    bool success = photoBoothServer->deletePhoto(filename);
    std::map<std::string, std::string> data;
    data["success"] = success ? "true" : "false";
    if (!success) {
        data["error"] = "Gagal menghapus foto";
    }
    std::string json = generateJsonResponse(data);
    broadcast("api-response", {{"data", json}});
}

void WebSocketServer::handleImageRequest(connection_hdl hdl, const std::string& filename, const std::map<std::string, std::string>& queryParams) {
    (void)hdl; // Suppress unused parameter warning
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

std::string WebSocketServer::generateJsonResponse(const std::map<std::string, std::string>& data) {
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

std::string WebSocketServer::generateJsonResponseWithBoolean(const std::map<std::string, std::string>& data) {
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

std::map<std::string, std::string> WebSocketServer::parseQueryString(const std::string& query) {
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

// HTTP request handler
void WebSocketServer::onHttpRequest(connection_hdl hdl) {
    try {
        auto con = wsServer->get_con_from_hdl(hdl);
        auto request = con->get_request();
        
        std::string method = request.get_method();
        std::string uri = request.get_uri();
        std::string path = uri;
        
        // Parse query parameters
        size_t queryPos = path.find('?');
        std::map<std::string, std::string> queryParams;
        if (queryPos != std::string::npos) {
            std::string queryString = path.substr(queryPos + 1);
            path = path.substr(0, queryPos);
            queryParams = parseQueryString(queryString);
        }
        
        std::cout << "🌐 HTTP Request: " << method << " " << path << std::endl;
        
        // Handle CORS preflight requests
        if (method == "OPTIONS") {
            sendHttpResponse(hdl, 200, "", "application/json", true);
            return;
        }
        
        // Handle API endpoints
        if (path == "/api/status" && method == "GET") {
            handleHttpApiStatusRequest(hdl);
        } else if (path == "/api/photos" && method == "GET") {
            handleHttpApiPhotosRequest(hdl);
        } else if (path == "/api/identity" && method == "GET") {
            handleHttpApiIdentityGetRequest(hdl);
        } else if (path == "/api/identity" && method == "POST") {
            handleHttpApiIdentityPostRequest(hdl, con);
        } else if (path.find("/api/photos/") == 0 && method == "DELETE") {
            std::string filename = path.substr(12);
            handleHttpApiPhotoDeleteRequest(hdl, filename);
        } else {
            sendHttpResponse(hdl, 404, "{\"error\":\"Not Found\"}", "application/json", true);
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error handling HTTP request: " << e.what() << std::endl;
        sendHttpResponse(hdl, 500, "{\"error\":\"Internal Server Error\"}", "application/json", true);
    }
}

// Send HTTP response with CORS headers
void WebSocketServer::sendHttpResponse(connection_hdl hdl, int statusCode, const std::string& body,
                                     const std::string& contentType, bool includeCors) {
    try {
        auto con = wsServer->get_con_from_hdl(hdl);
        auto response = std::make_shared<websocketpp::http::parser::response>();
        
        // Set status
        std::string statusText;
        switch (statusCode) {
            case 200: statusText = "OK"; break;
            case 404: statusText = "Not Found"; break;
            case 500: statusText = "Internal Server Error"; break;
            default: statusText = "Unknown"; break;
        }
        
        response->set_status(websocketpp::http::status_code::value(statusCode), statusText);
        response->set_body(body);
        response->append_header("Content-Type", contentType);
        response->append_header("Content-Length", std::to_string(body.length()));
        
        // Add CORS headers
        if (includeCors) {
            response->append_header("Access-Control-Allow-Origin", "*");
            response->append_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response->append_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        }
        
        con->set_body(response->get_body());
        con->set_status(response->get_status_code());
        
        // Copy headers
        auto headers = response->get_headers();
        for (const auto& header : headers) {
            con->replace_header(header.first, header.second);
        }
        
        std::cout << "📤 HTTP Response: " << statusCode << " " << statusText
                  << " | Body: " << (body.length() > 100 ? body.substr(0, 100) + "..." : body) << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "Error sending HTTP response: " << e.what() << std::endl;
    }
}

// HTTP API handlers
void WebSocketServer::handleHttpApiStatusRequest(connection_hdl hdl) {
    std::vector<Camera> cameras = photoBoothServer->getGPhotoWrapper()->detectCamera();
    bool connected = !cameras.empty();
    std::ostringstream oss;
    oss << "{\"cameraConnected\":" << (connected ? "true" : "false")
        << ",\"message\":\"" << (connected ? "Kamera terhubung" : "Kamera tidak terhubung (mode simulasi)") << "\"}";
    sendHttpResponse(hdl, 200, oss.str(), "application/json", true);
}

void WebSocketServer::handleHttpApiPhotosRequest(connection_hdl hdl) {
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
    sendHttpResponse(hdl, 200, json, "application/json", true);
}

void WebSocketServer::handleHttpApiIdentityGetRequest(connection_hdl hdl) {
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
    sendHttpResponse(hdl, 200, json, "application/json", true);
}

void WebSocketServer::handleHttpApiIdentityPostRequest(connection_hdl hdl, websocket_server::connection_ptr con) {
    std::string body = con->get_request().get_body();
    std::cout << "📥 Received POST /api/identity request with body: " << body << std::endl;
    
    // Parse JSON body (simple parsing for booth_name and location)
    std::string boothName = "";
    std::string location = "";
    std::string encryptedData = "";
    
    // Simple JSON parsing using regex
    std::regex boothNameRegex("\"booth_name\"\\s*:\\s*\"([^\"]+)\"");
    std::regex locationRegex("\"location\"\\s*:\\s*\"([^\"]+)\"");
    std::regex encryptedDataRegex("\"encrypted_data\"\\s*:\\s*\"([^\"]+)\"");
    std::regex locationLatRegex("\"location\"\\s*:\\s*\\{\\s*\"lat\"\\s*:\\s*\"?([^\"]+)\"?\\s*,\\s*\"lng\"\\s*:\\s*\"?([^\"]+)\"?\\s*\\}");
    std::regex locationLatNumericRegex("\"location\"\\s*:\\s*\\{\\s*\"lat\"\\s*:\\s*([-\\d.]+)\\s*,\\s*\"lng\"\\s*:\\s*([-\\d.]+)\\s*\\}");
    
    std::smatch match;
    if (std::regex_search(body, match, boothNameRegex)) {
        boothName = match[1].str();
    }
    
    if (std::regex_search(body, match, locationLatRegex)) {
        location = match[1].str() + "," + match[2].str();
    } else if (std::regex_search(body, match, locationLatNumericRegex)) {
        location = match[1].str() + "," + match[2].str();
    } else if (std::regex_search(body, match, locationRegex)) {
        location = match[1].str();
    }
    
    if (std::regex_search(body, match, encryptedDataRegex)) {
        encryptedData = match[1].str();
    }
    
    std::cout << "🔍 Parsed booth_name: " << boothName << std::endl;
    std::cout << "🔍 Parsed location: " << location << std::endl;
    std::cout << "🔍 Parsed encrypted_data: " << (encryptedData.empty() ? "(empty)" : "(present)") << std::endl;
    
    bool success = false;
    if (!boothName.empty() && !location.empty()) {
        auto st = photoBoothServer->getIdentityStore();
        if (st) {
            success = st->save(boothName, location, encryptedData);
            std::cout << "💾 Save result: " << (success ? "SUCCESS" : "FAILED") << std::endl;
        } else {
            std::cout << "❌ Identity store is null" << std::endl;
        }
    } else {
        std::cout << "❌ Missing required fields - booth_name: " << (boothName.empty() ? "MISSING" : "OK")
                  << ", location: " << (location.empty() ? "MISSING" : "OK") << std::endl;
    }
    
    std::map<std::string, std::string> response;
    response["success"] = success ? "true" : "false";
    if (!success) response["error"] = "store_failed";
    std::string json = generateJsonResponseWithBoolean(response);
    sendHttpResponse(hdl, 200, json, "application/json", true);
    std::cout << "✅ Response sent successfully" << std::endl;
}

void WebSocketServer::handleHttpApiPhotoDeleteRequest(connection_hdl hdl, const std::string& filename) {
    bool success = photoBoothServer->deletePhoto(filename);
    std::map<std::string, std::string> data;
    data["success"] = success ? "true" : "false";
    if (!success) {
        data["error"] = "Gagal menghapus foto";
    }
    std::string json = generateJsonResponseWithBoolean(data);
    sendHttpResponse(hdl, 200, json, "application/json", true);
}