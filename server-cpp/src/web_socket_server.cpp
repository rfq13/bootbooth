#include "../include/server.h"
#include "../include/booth_identity.h"
#include "../include/template_renderer.h"
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
        } else if (path.substr(0, 9) == "/uploads/" && method == "GET") {
            // Handle static file requests for uploads directory
            std::cout << "🔍 DEBUG: Routing to handleStaticFileRequest with path: " << path << std::endl;
            handleStaticFileRequest(hdl, path);
        } else if (path == "/api/upload-image" && method == "POST") {
            handleHttpUploadImagePostRequest(hdl, con);
        } else if (path == "/api/render-template" && method == "POST") {
            handleHttpRenderTemplatePostRequest(hdl, con);
        } else {
            std::cout << "🔍 DEBUG: No route found for path: " << path << std::endl;
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

// Static file serving implementation
std::string WebSocketServer::getMimeTypeFromExtension(const std::string& filename) {
    size_t dotPos = filename.find_last_of('.');
    if (dotPos == std::string::npos) {
        return "application/octet-stream";
    }
    
    std::string extension = filename.substr(dotPos + 1);
    std::transform(extension.begin(), extension.end(), extension.begin(), ::tolower);
    
    if (extension == "jpg" || extension == "jpeg") {
        return "image/jpeg";
    } else if (extension == "png") {
        return "image/png";
    } else if (extension == "gif") {
        return "image/gif";
    } else if (extension == "webp") {
        return "image/webp";
    }
    
    return "application/octet-stream";
}

bool WebSocketServer::isPathSafe(const std::string& path) {
    // Prevent path traversal attacks
    if (path.find("..") != std::string::npos) {
        return false;
    }
    
    // Ensure path starts with uploads/
    if (path.substr(0, 9) != "/uploads/") {
        return false;
    }
    
    return true;
}

bool WebSocketServer::fileExists(const std::string& filepath) {
    // The filepath already includes "uploads/" prefix from the URL path
    // But we need to check if it exists relative to the current working directory
    std::string fullPath = filepath;
    
    // If the path starts with "/uploads/", remove the leading slash
    if (fullPath.find("/uploads/") == 0) {
        fullPath = fullPath.substr(1);
    }
    
#ifdef _WIN32
    return _access(fullPath.c_str(), F_OK) == 0;
#else
    return access(fullPath.c_str(), F_OK) == 0;
#endif
}

std::vector<uint8_t> WebSocketServer::readBinaryFile(const std::string& filepath) {
    std::vector<uint8_t> buffer;
    
    // The filepath already includes "uploads/" prefix from the URL path
    // But we need to read it relative to the current working directory
    std::string fullPath = filepath;
    
    // If the path starts with "/uploads/", remove the leading slash
    if (fullPath.find("/uploads/") == 0) {
        fullPath = fullPath.substr(1);
    }
    
    std::ifstream file(fullPath, std::ios::binary | std::ios::ate);
    if (!file.is_open()) {
        return buffer;
    }
    
    std::streamsize size = file.tellg();
    file.seekg(0, std::ios::beg);
    
    buffer.resize(size);
    if (!file.read(reinterpret_cast<char*>(buffer.data()), size)) {
        buffer.clear();
    }
    
    return buffer;
}

void WebSocketServer::handleStaticFileRequest(connection_hdl hdl, const std::string& path) {
    std::cout << "🔍 DEBUG: handleStaticFileRequest called with path: " << path << std::endl;
    
    // Check if path is safe
    if (!isPathSafe(path)) {
        std::cout << "🔍 DEBUG: Path is not safe: " << path << std::endl;
        sendHttpResponse(hdl, 403, "{\"error\":\"Forbidden\"}", "application/json", true);
        return;
    }
    
    // The filepath already includes "uploads/" prefix from the URL path
    // But we need to check if it exists relative to the current working directory
    std::string fullPath = path;
    
    // If the path starts with "/uploads/", remove the leading slash
    if (fullPath.find("/uploads/") == 0) {
        fullPath = fullPath.substr(1);
    }
    
    std::cout << "🔍 DEBUG: Full path to check: " << fullPath << std::endl;
    
    // Check if file exists
    if (!fileExists(fullPath)) {
        std::cout << "🔍 DEBUG: File does not exist: " << fullPath << std::endl;
        sendHttpResponse(hdl, 404, "{\"error\":\"File Not Found\"}", "application/json", true);
        return;
    }
    
    // Read file content
    std::vector<uint8_t> fileContent = readBinaryFile(fullPath);
    if (fileContent.empty()) {
        std::cout << "🔍 DEBUG: Failed to read file: " << fullPath << std::endl;
        sendHttpResponse(hdl, 500, "{\"error\":\"Internal Server Error\"}", "application/json", true);
        return;
    }
    
    // Get MIME type
    std::string mimeType = getMimeTypeFromExtension(path);
    
    try {
        auto con = wsServer->get_con_from_hdl(hdl);
        auto response = std::make_shared<websocketpp::http::parser::response>();
        
        // Set status
        response->set_status(websocketpp::http::status_code::value(200), "OK");
        
        // Set body as binary data
        std::string bodyStr(fileContent.begin(), fileContent.end());
        response->set_body(bodyStr);
        
        // Set headers
        response->append_header("Content-Type", mimeType);
        response->append_header("Content-Length", std::to_string(fileContent.size()));
        response->append_header("Cache-Control", "max-age=3600");
        
        // Add CORS headers
        response->append_header("Access-Control-Allow-Origin", "*");
        response->append_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response->append_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        
        con->set_body(response->get_body());
        con->set_status(response->get_status_code());
        
        // Copy headers
        auto headers = response->get_headers();
        for (const auto& header : headers) {
            con->replace_header(header.first, header.second);
        }
        
        std::cout << "📤 Static file served: " << path << " (" << fileContent.size() << " bytes, " << mimeType << ")" << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "Error serving static file: " << e.what() << std::endl;
        sendHttpResponse(hdl, 500, "{\"error\":\"Internal Server Error\"}", "application/json", true);
    }
}

static std::vector<unsigned char> base64Decode(const std::string& input) {
    static const std::string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::vector<int> T(256, -1);
    for (int i = 0; i < 64; i++) T[chars[i]] = i;
    std::vector<unsigned char> out;
    std::vector<int> quad;
    for (char c : input) {
        if (c == '=') break;
        int val = T[(unsigned char)c];
        if (val == -1) continue;
        quad.push_back(val);
        if (quad.size() == 4) {
            out.push_back((unsigned char)((quad[0] << 2) | (quad[1] >> 4)));
            out.push_back((unsigned char)(((quad[1] & 0xF) << 4) | (quad[2] >> 2)));
            out.push_back((unsigned char)(((quad[2] & 0x3) << 6) | quad[3]));
            quad.clear();
        }
    }
    if (quad.size() == 3) {
        out.push_back((unsigned char)((quad[0] << 2) | (quad[1] >> 4)));
        out.push_back((unsigned char)(((quad[1] & 0xF) << 4) | (quad[2] >> 2)));
    } else if (quad.size() == 2) {
        out.push_back((unsigned char)((quad[0] << 2) | (quad[1] >> 4)));
    }
    return out;
}

void WebSocketServer::handleHttpUploadImagePostRequest(connection_hdl hdl, websocket_server::connection_ptr con) {
    std::string body = con->get_request().get_body();
    std::regex filenameRegex(R"RGX("filename"\s*:\s*"([^"]+)")RGX");
    std::regex imageRegex(R"RGX("imageBase64"\s*:\s*"([\\"A-Za-z0-9+/=,:;._-]+)"\s*)RGX");
    std::smatch m;
    std::string filename;
    std::string imageB64;
    if (std::regex_search(body, m, filenameRegex)) filename = m[1].str();
    if (std::regex_search(body, m, imageRegex)) imageB64 = m[1].str();
    if (filename.empty() || imageB64.empty()) {
        sendHttpResponse(hdl, 400, "{\"success\":false,\"error\":\"invalid_request\"}", "application/json", true);
        return;
    }
    size_t commaPos = imageB64.find(",");
    if (commaPos != std::string::npos) imageB64 = imageB64.substr(commaPos+1);
    std::vector<unsigned char> data = base64Decode(imageB64);
    std::string path = "uploads/" + filename;
    std::ofstream ofs(path, std::ios::binary);
    if (!ofs.is_open()) {
        sendHttpResponse(hdl, 500, "{\"success\":false,\"error\":\"write_failed\"}", "application/json", true);
        return;
    }
    ofs.write(reinterpret_cast<const char*>(data.data()), (std::streamsize)data.size());
    ofs.close();
    sendHttpResponse(hdl, 200, "{\"success\":true,\"path\":\"/uploads/" + filename + "\"}", "application/json", true);
}

void WebSocketServer::handleHttpRenderTemplatePostRequest(connection_hdl hdl, websocket_server::connection_ptr con) {
    std::string body = con->get_request().get_body();
    std::regex photoPathRegex(R"RGX("photoPath"\s*:\s*"([^"]+)")RGX");
    std::regex outWRegex(R"RGX("outputWidth"\s*:\s*(\d+))RGX");
    std::regex outHRegex(R"RGX("outputHeight"\s*:\s*(\d+))RGX");
    std::regex tmplRegex(R"("template"\s*:\s*(\{[\n\r\t ,:"\[\]A-Za-z0-9._#-]*\}))");
    std::smatch m;
    std::string photoPath;
    int outW = 3000, outH = 4500;
    std::string tmplStr;
    if (std::regex_search(body, m, photoPathRegex)) photoPath = m[1].str();
    if (std::regex_search(body, m, outWRegex)) outW = std::stoi(m[1].str());
    if (std::regex_search(body, m, outHRegex)) outH = std::stoi(m[1].str());
    if (std::regex_search(body, m, tmplRegex)) tmplStr = m[1].str();
    if (photoPath.empty() || tmplStr.empty()) {
        sendHttpResponse(hdl, 400, "{\"success\":false,\"error\":\"invalid_request\"}", "application/json", true);
        return;
    }

    TemplateSpec spec;
    std::regex bgRegex(R"RGX("background"\s*:\s*"([^"]+)")RGX");
    if (std::regex_search(tmplStr, m, bgRegex)) spec.backgroundPath = m[1].str();
    if (!spec.backgroundPath.empty() && spec.backgroundPath[0] == '/') spec.backgroundPath = spec.backgroundPath.substr(1);
    std::regex overlaysRegex("\"overlays\"\\s*:\\s*\\[(.*?)\\]");
    if (std::regex_search(tmplStr, m, overlaysRegex)) {
        std::string arr = m[1].str();
        std::regex itemRegex("\"([^\"]+)\"");
        auto it = std::sregex_iterator(arr.begin(), arr.end(), itemRegex);
        auto end = std::sregex_iterator();
        for (; it != end; ++it) {
            std::string p = (*it)[1].str();
            if (!p.empty() && p[0] == '/') p = p.substr(1);
            spec.overlays.push_back(p);
        }
    }
    std::regex textsRegex(R"RGX("text"\s*:\s*\[(.*?)\])RGX");
    if (std::regex_search(tmplStr, m, textsRegex)) {
        std::string tarr = m[1].str();
        std::regex objRegex(R"RGX(\{([^\}]*)\})RGX");
        auto it = std::sregex_iterator(tarr.begin(), tarr.end(), objRegex);
        auto end = std::sregex_iterator();
        for (; it != end; ++it) {
            std::string obj = (*it)[1].str();
            TextSpec ts;
            std::smatch mm;
            std::regex cRegex("\"content\"\\s*:\\s*\"([^\"]+)\"");
            std::regex fRegex("\"fontPath\"\\s*:\\s*\"([^\"]+)\"");
            std::regex sizeRegex("\"size\"\\s*:\\s*(\\d+)");
            std::regex colorRegex("\"color\"\\s*:\\s*\"([^\"]+)\"");
            std::regex xRegex("\"position\"\\s*:\\s*\{[^\}]*\"x\"\\s*:\\s*(\\d+(?:\\.\\d+)?)");
            std::regex yRegex("\"position\"\\s*:\\s*\{[^\}]*\"y\"\\s*:\\s*(\\d+(?:\\.\\d+)?)");
            if (std::regex_search(obj, mm, cRegex)) ts.content = mm[1].str();
            if (std::regex_search(obj, mm, fRegex)) ts.fontPath = mm[1].str();
            if (std::regex_search(obj, mm, sizeRegex)) ts.size = std::stoi(mm[1].str());
            if (std::regex_search(obj, mm, colorRegex)) {
                unsigned char r=255,g=255,b=255; TemplateRenderer::parseColorHex(mm[1].str(), r,g,b); ts.r=r; ts.g=g; ts.b=b;
            }
            if (std::regex_search(obj, mm, xRegex)) ts.x = (float)std::stof(mm[1].str());
            if (std::regex_search(obj, mm, yRegex)) ts.y = (float)std::stof(mm[1].str());
            spec.texts.push_back(ts);
        }
    }

    if (photoPath.size() && photoPath[0] == '/') photoPath = photoPath.substr(1);
    std::string outFile = "outputs/render_" + std::to_string(std::time(nullptr)) + ".jpg";

    TemplateRenderer renderer;
    std::vector<unsigned char> jpeg;
    bool ok = renderer.renderToJpegBuffer(spec, photoPath, outW, outH, jpeg);
    if (!ok) {
        sendHttpResponse(hdl, 500, "{\"success\":false,\"error\":\"render_failed\"}", "application/json", true);
        return;
    }
    std::ofstream ofs(outFile, std::ios::binary);
    if (ofs.is_open()) { ofs.write(reinterpret_cast<const char*>(jpeg.data()), (std::streamsize)jpeg.size()); ofs.close(); }
    std::string b64 = this->photoBoothServer->getGPhotoWrapper()->base64Encode(jpeg);
    std::string resp = std::string("{\"success\":true,\"output\":\"") + b64 + "\",\"path\":\"/" + outFile + "\"}";
    sendHttpResponse(hdl, 200, resp, "application/json", true);
}