#include "../include/server.h"

PhotoBoothServer* globalServer = nullptr;

void signalHandler(int signum) {
    std::cout << "\nReceived signal " << signum << ", shutting down server..." << std::endl;
    if (globalServer) {
        globalServer->stop();
    }
    exit(signum);
}

int main() {
    std::cout << "Starting Photo Booth Server (C++)..." << std::endl;
    signal(SIGINT, signalHandler);
    signal(SIGTERM, signalHandler);
    PhotoBoothServer server(API_PORT, MJPEG_PORT);
    globalServer = &server;
    if (!server.start()) {
        std::cerr << "Failed to start server" << std::endl;
        return 1;
    }
    std::cout << "Server started successfully" << std::endl;
    std::cout << "API server running on port " << API_PORT << std::endl;
    std::cout << "MJPEG server running on port " << MJPEG_PORT << std::endl;
    std::cout << "Socket.IO server running on port " << API_PORT << std::endl;
    while (server.isRunning()) {
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    std::cout << "Server stopped" << std::endl;
    return 0;
}