#include "../include/server.h"

MJPEGServer::MJPEGServer(int port) 
    : port(port), isStreaming(false), serverSocket(-1), streamProcessPid(-1), stdoutFd(-1), stderrFd(-1) {
    frameBuffer.reserve(1024 * 512);
}

MJPEGServer::~MJPEGServer() {
    stop();
}

bool MJPEGServer::start() {
    if (serverSocket != -1) {
        std::cout << "⚠️ MJPEG server already started on port " << port << std::endl;
        return true;
    }
    std::cout << "🚀 Starting MJPEG server on port " << port << std::endl;
    serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSocket < 0) {
        std::cerr << "❌ Error creating MJPEG server socket: " << strerror(errno) << std::endl;
        return false;
    }
    int opt = 1;
    if (setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        std::cerr << "❌ Error setting MJPEG server socket options: " << strerror(errno) << std::endl;
        close(serverSocket);
        serverSocket = -1;
        return false;
    }
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
    if (listen(serverSocket, 10) < 0) {
        std::cerr << "❌ Error listening on MJPEG server socket: " << strerror(errno) << std::endl;
        close(serverSocket);
        serverSocket = -1;
        return false;
    }
    std::thread serverThread([this]() { this->setupRoutes(); });
    serverThread.detach();
    std::cout << "✅ MJPEG server started successfully on port " << port << std::endl;
    return true;
}

bool MJPEGServer::stop() {
    if (serverSocket == -1) {
        return true;
    }
    stopStream();
    closeAllClients();
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
    frameBuffer.clear();
    frameBuffer.reserve(1024 * 512);
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
        dup2(outPipe[1], STDOUT_FILENO);
        dup2(errPipe[1], STDERR_FILENO);
        close(outPipe[0]); close(outPipe[1]);
        close(errPipe[0]); close(errPipe[1]);
        std::cout << "📷 Executing gphoto2 --stdout --capture-movie" << std::endl;
        execlp("gphoto2", "gphoto2", "--stdout", "--capture-movie", (char*)nullptr);
        std::cerr << "❌ Failed to execute gphoto2" << std::endl;
        _exit(127);
    }
    close(outPipe[1]);
    close(errPipe[1]);
    stdoutFd = outPipe[0];
    stderrFd = errPipe[0];
    streamProcessPid = pid;
    int flagsOut = fcntl(stdoutFd, F_GETFL, 0);
    fcntl(stdoutFd, F_SETFL, flagsOut | O_NONBLOCK);
    int flagsErr = fcntl(stderrFd, F_GETFL, 0);
    fcntl(stderrFd, F_SETFL, flagsErr | O_NONBLOCK);
    isStreaming = true;
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
    std::thread outThread([this]() {
        const unsigned char startMarker[2] = {0xFF, 0xD8};
        const unsigned char endMarker[2] = {0xFF, 0xD9};
        std::vector<unsigned char> readBuf(64 * 1024);
        int frameCount = 0;
        while (isStreaming && stdoutFd != -1) {
            ssize_t n = read(stdoutFd, readBuf.data(), readBuf.size());
            if (n > 0) {
                frameBuffer.insert(frameBuffer.end(), readBuf.begin(), readBuf.begin() + n);
                if (frameBuffer.size() > 1024 * 1024) {
                    frameBuffer.erase(frameBuffer.begin(), frameBuffer.end() - (1024 * 512));
                }
                for (;;) {
                    auto itStart = std::search(frameBuffer.begin(), frameBuffer.end(), startMarker, startMarker + 2);
                    if (itStart == frameBuffer.end()) break;
                    auto itEnd = std::search(itStart + 2, frameBuffer.end(), endMarker, endMarker + 2);
                    if (itEnd == frameBuffer.end()) break;
                    std::vector<unsigned char> frame(itStart, itEnd + 2);
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
    if (streamProcessPid > 0) {
        kill(streamProcessPid, SIGINT);
        int status = 0;
        int waitMs = 0;
        while (waitMs < 2000) {
            pid_t res = waitpid(streamProcessPid, &status, WNOHANG);
            if (res == streamProcessPid) break;
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            waitMs += 50;
        }
        if (waitpid(streamProcessPid, &status, WNOHANG) == 0) {
            std::cerr << "⚠️ Stream process timeout, killing..." << std::endl;
            kill(streamProcessPid, SIGKILL);
            (void)waitpid(streamProcessPid, &status, 0);
        }
        streamProcessPid = -1;
    }
    if (stdoutFd != -1) { close(stdoutFd); stdoutFd = -1; }
    if (stderrFd != -1) { close(stderrFd); stderrFd = -1; }
    frameBuffer.clear();
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
        struct sockaddr_in clientAddr;
        socklen_t clientAddrLen = sizeof(clientAddr);
        int clientSocket = accept(serverSocket, (struct sockaddr*)&clientAddr, &clientAddrLen);
        if (clientSocket < 0) {
            if (serverSocket != -1) {
                std::cerr << "❌ Error accepting MJPEG client connection" << std::endl;
            }
            continue;
        }
        char clientIP[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &(clientAddr.sin_addr), clientIP, INET_ADDRSTRLEN);
        std::cout << "🔗 MJPEG client connected from " << clientIP << ":" << ntohs(clientAddr.sin_port) << std::endl;
        std::thread clientThread([this, clientSocket, clientIP]() { this->handleClient(clientSocket); });
        clientThread.detach();
    }
    std::cout << "🛑 MJPEG server setupRoutes ended" << std::endl;
}

void MJPEGServer::handleClient(int clientSocket) {
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
    size_t queryPos = path.find('?');
    if (queryPos != std::string::npos) {
        path = path.substr(0, queryPos);
    }
    std::cout << "📋 MJPEG HTTP request: " << method << " " << path << " " << version << std::endl;
    if (method == "GET" && path == "/camera") {
        std::cout << "✅ Serving MJPEG stream to client" << std::endl;
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
        std::string boundary = "--frame\r\n";
        if (send(clientSocket, boundary.c_str(), boundary.length(), 0) < 0) {
            std::cerr << "❌ Failed to send initial boundary to client" << std::endl;
            close(clientSocket);
            return;
        }
        {
            std::lock_guard<std::mutex> lock(clientsMutex);
            clientSockets.push_back(clientSocket);
            std::cout << "👥 MJPEG client registered for streaming. Total clients: " << clientSockets.size() << std::endl;
        }
        char buffer[1];
        int clientDisconnected = 0;
        while (clientDisconnected == 0) {
            ssize_t result = recv(clientSocket, buffer, 1, MSG_PEEK | MSG_DONTWAIT);
            if (result == 0) {
                clientDisconnected = 1;
                std::cout << "🔌 MJPEG client disconnected gracefully" << std::endl;
            } else if (result < 0) {
                if (errno != EAGAIN && errno != EWOULDBLOCK) {
                    clientDisconnected = 1;
                    std::cout << "🔌 MJPEG client disconnected with error: " << strerror(errno) << std::endl;
                }
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
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
    std::vector<unsigned char> processedFrame = effects.applyEffect(frame);
    std::string header = "Content-Type: image/jpeg\r\nContent-Length: " + std::to_string(processedFrame.size()) + "\r\n\r\n";
    std::string boundary = "\r\n--frame\r\n";
    std::lock_guard<std::mutex> lock(clientsMutex);
    std::vector<int> failedClients;
    for (int clientSocket : clientSockets) {
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
}

void MJPEGServer::processFrameBuffer(std::vector<unsigned char>& buffer) {
}