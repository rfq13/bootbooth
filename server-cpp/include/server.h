#ifndef SERVER_H
#define SERVER_H

#include <string>
#include <vector>
#include <map>
#include <functional>
#include <iostream>
#include <thread>
#include <chrono>
#include <sstream>
#include <fstream>
#include <iomanip>
#include <ctime>
#include <memory>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include <cstring>
#include <algorithm>
#include <random>

// Kompabilitas Windows
#ifdef _WIN32
    #define WIN32_LEAN_AND_MEAN
    #include <windows.h>
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #include <io.h>
    #include <process.h>
    #include <direct.h>
    
    // Definisi tipe data untuk Windows
    typedef int pid_t;
    typedef int socklen_t;
    typedef SSIZE_T ssize_t;
    
    // Makro untuk kompatibilitas
    #define close(s) closesocket(s)
    #define read(s, buf, len) recv(s, buf, len, 0)
    #define write(s, buf, len) send(s, buf, len, 0)
    #define mkdir(path, mode) _mkdir(path)
    #define rmdir _rmdir
    #define unlink _unlink
    #define access _access
    #define F_OK 0
    #define W_OK 2
    #define R_OK 4
    
    // Definisi untuk fungsi-fungsi POSIX
    inline pid_t fork() { return -1; } // Tidak didukung di Windows
    inline pid_t waitpid(pid_t pid, int* status, int options) { return -1; }
    inline int kill(pid_t pid, int sig) { return -1; }
    inline pid_t getpid() { return _getpid(); }
    
    // Signal handling untuk Windows
    #define SIGINT 2
    #define SIGTERM 15
    
    // OpenSSL compatibility untuk Windows
    #define SHA_DIGEST_LENGTH 20
    
#else
    // Linux/Unix
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <arpa/inet.h>
    #include <unistd.h>
    #include <fcntl.h>
    #include <sys/stat.h>
    #include <csignal>
    #include <sys/wait.h>
#endif

// OpenSSL - hanya include jika tersedia
#ifdef HAVE_OPENSSL
    #include <openssl/sha.h>
#else
    // Fallback definisi jika OpenSSL tidak tersedia
    #define SHA_DIGEST_LENGTH 20
    // Deklarasi fungsi SHA1 stub
    inline int SHA1(const unsigned char *d, size_t n, unsigned char *md) {
        // Stub implementation - return error
        return -1;
    }
#endif

// Filesystem operations wrapper untuk kompatibilitas
namespace filesystem_compat {
    inline bool exists(const std::string& path) {
#ifdef _WIN32
        return _access(path.c_str(), F_OK) == 0;
#else
        return access(path.c_str(), F_OK) == 0;
#endif
    }
    
    inline bool remove(const std::string& path) {
#ifdef _WIN32
        return _unlink(path.c_str()) == 0;
#else
        return unlink(path.c_str()) == 0;
#endif
    }
    
    inline std::vector<std::string> directory_entries(const std::string& path) {
        std::vector<std::string> entries;
        // Implementasi sederhana, bisa diperbaiki nanti
        return entries;
    }
}

// Alias std::filesystem untuk kompatibilitas
namespace std {
    namespace filesystem {
        using namespace filesystem_compat;
    }
}

// Konstanta
const int API_PORT = 3001;
const int MJPEG_PORT = 8080;

// Struktur untuk kamera
struct Camera {
    std::string model;
    std::string port;
};

// Struktur untuk parameter efek
struct EffectParams {
    double intensity = 0.5;  // 0.0 to 1.0
    double radius = 1.0;     // untuk fisheye, vignette
    int pixelSize = 10;      // untuk pixelate
};

// Enum untuk tipe efek
enum class EffectType {
    NONE,
    FISHEYE,
    GRAYSCALE,
    SEPIA,
    VIGNETTE,
    BLUR,
    SHARPEN,
    INVERT,
    PIXELATE
};

// Struktur untuk foto
struct Photo {
    std::string filename;
    std::string path;
    int64_t timestamp;
    bool simulated;
};

// Struktur untuk data gambar RGB
struct ImageData {
    int width;
    int height;
    std::vector<unsigned char> data; // RGB data
};

// Forward declarations
class GPhotoWrapper;
class MJPEGServer;
class ImageEffects;

// Forward declaration of PhotoBoothServer
class PhotoBoothServer;

class SocketIOServer;

class BoothIdentityStore;

// Kelas untuk efek gambar
class ImageEffects {
private:
    EffectType currentEffect;
    EffectParams params;
    mutable std::mutex mutex;
    
public:
    ImageEffects();
    void setEffect(EffectType effect, const EffectParams& params);
    std::pair<EffectType, EffectParams> getEffect() const;
    std::vector<unsigned char> applyEffect(const std::vector<unsigned char>& jpegData);
    
private:
    // JPEG encode/decode methods
    ImageData decodeJPEG(const std::vector<unsigned char>& jpegData);
    std::vector<unsigned char> encodeJPEG(const ImageData& rgbData);
    
    // Real effect implementations
    void applyFishEyeEffect(ImageData& image);
    void applyGrayscaleEffect(ImageData& image);
    void applySepiaEffect(ImageData& image);
    void applyVignetteEffect(ImageData& image);
    void applyBlurEffect(ImageData& image);
    void applySharpenEffect(ImageData& image);
    void applyInvertEffect(ImageData& image);
    void applyPixelateEffect(ImageData& image);
    
    // Legacy placeholder methods for backward compatibility
    std::vector<unsigned char> applyFishEye(const std::vector<unsigned char>& imageData);
    std::vector<unsigned char> applyGrayscale(const std::vector<unsigned char>& imageData);
    std::vector<unsigned char> applySepia(const std::vector<unsigned char>& imageData);
    std::vector<unsigned char> applyVignette(const std::vector<unsigned char>& imageData);
    std::vector<unsigned char> applyBlur(const std::vector<unsigned char>& imageData);
    std::vector<unsigned char> applySharpen(const std::vector<unsigned char>& imageData);
    std::vector<unsigned char> applyInvert(const std::vector<unsigned char>& imageData);
    std::vector<unsigned char> applyPixelate(const std::vector<unsigned char>& imageData);
};

// Kelas untuk wrapper gphoto2
class GPhotoWrapper {
private:
    std::string outputDir;
    std::string previewDir;
    bool isPreviewActive;
    ImageEffects effects;
    std::mutex mutex;
    
public:
    GPhotoWrapper(const std::string& outputDir, const std::string& previewDir);
    ~GPhotoWrapper();
    
    std::vector<Camera> detectCamera();
    std::map<std::string, std::string> capturePreviewFrame();
    std::map<std::string, std::string> startPreviewStream(std::function<void(const std::string&, const std::map<std::string, std::string>&)> emit, int fps);
    std::map<std::string, std::string> stopPreviewStream();
    std::map<std::string, std::string> captureImage();
    void cleanupPreviews(int keepLast);
    void setEffect(EffectType effect, const EffectParams& params);
    std::pair<EffectType, EffectParams> getCurrentEffect() const;
    std::string base64Encode(const std::vector<unsigned char>& data);
    std::vector<unsigned char> readImageFile(const std::string& filePath);
    bool writeImageFile(const std::string& filePath, const std::vector<unsigned char>& data);
    
private:
    std::string executeCommand(const std::string& command);
};

// Kelas untuk MJPEG Server
class MJPEGServer {
private:
    int port;
    bool isStreaming;
    std::vector<unsigned char> frameBuffer;
    ImageEffects effects;
    int serverSocket;
    std::vector<int> clientSockets;
    mutable std::mutex clientsMutex;
    pid_t streamProcessPid;
    int stdoutFd;
    int stderrFd;
    
public:
    MJPEGServer(int port);
    ~MJPEGServer();
    
    bool start();
    bool stop();
    std::tuple<bool, std::string, std::string> startStream();
    void stopStream();
    bool isActive() const;
    std::string getStreamURL() const;
    int getClientCount() const;
    void setEffect(EffectType effect, const EffectParams& params);
    std::pair<EffectType, EffectParams> getCurrentEffect() const;
    
private:
    void setupRoutes();
    void handleClient(int clientSocket);
    void sendFrameToClients(const std::vector<unsigned char>& frame);
    void closeAllClients();
    void removeClient(int clientSocket);
    void processFrames();
    void processFrameBuffer(std::vector<unsigned char>& buffer);
};

// Kelas Socket.IO Server
class SocketIOServer {
private:
    int port;
    int serverSocket;
    bool running;
    std::vector<int> clientSockets;
    mutable std::mutex clientsMutex;
    PhotoBoothServer* photoBoothServer;
    std::string lastSid;
    
public:
    SocketIOServer(int port, PhotoBoothServer* photoBoothServer);
    ~SocketIOServer();
    
    bool start();
    bool stop();
    bool isRunning() const;
    
    // Event emitters
    void emitToClient(int clientSocket, const std::string& event, const std::map<std::string, std::string>& data);
    void broadcast(const std::string& event, const std::map<std::string, std::string>& data);
    void emitToAll(const std::string& event, const std::map<std::string, std::string>& data);
    
private:
    void setupRoutes();
    void handleClient(int clientSocket);
    void handleWebSocketHandshake(int clientSocket, const std::string& request);
    void handleSocketIOMessages(int clientSocket);
    void handleSocketIOEvent(int clientSocket, const std::string& event, const std::map<std::string, std::string>& data);
    void sendSocketIOPacket(int clientSocket, const std::string& event, const std::map<std::string, std::string>& data);
    void closeAllClients();
    void removeClient(int clientSocket);
    std::string generateSocketIOPacket(const std::string& event, const std::map<std::string, std::string>& data);
    // WebSocket helpers
    std::string computeWebSocketAccept(const std::string& clientKey);
    void sendTextFrame(int clientSocket, const std::string& payload);
    bool recvExact(int clientSocket, char* buf, size_t len);
    bool recvTextFrame(int clientSocket, std::string& outPayload);
    std::string base64EncodeBytes(const unsigned char* data, size_t len);
    std::string generateSID();
    
    // HTTP request handling
    void handleHttpRequest(int clientSocket, const std::string& request);
    void handleApiStatusRequest(int clientSocket);
    void handleApiPhotosRequest(int clientSocket);
    void handleApiPreviewRequest(int clientSocket);
    void handleApiPhotoDeleteRequest(int clientSocket, const std::string& filename);
    void handleImageRequest(int clientSocket, const std::string& filename, const std::map<std::string, std::string>& queryParams);
    std::string generateHttpResponse(const std::string& content, const std::string& contentType = "text/plain");
    std::string generateJsonResponse(const std::map<std::string, std::string>& data);
    std::map<std::string, std::string> parseQueryString(const std::string& query);
};

// Kelas HTTP Server utama
class PhotoBoothServer {
private:
    int apiPort;
    int mjpegPort;
    GPhotoWrapper* gphoto;
    MJPEGServer* mjpegServer;
    SocketIOServer* socketIOServer;
    bool running;
    BoothIdentityStore* identityStore;
    
public:
    PhotoBoothServer(int apiPort = API_PORT, int mjpegPort = MJPEG_PORT);
    ~PhotoBoothServer();
    
    bool start();
    bool stop();
    bool isRunning() const;
    bool identityRegistered() const;
    
    // Getter methods
    GPhotoWrapper* getGPhotoWrapper() { return gphoto; }
    SocketIOServer* getSocketIOServer() { return socketIOServer; }
    BoothIdentityStore* getIdentityStore() { return identityStore; }
    std::vector<Photo> getPhotosList();
    bool deletePhoto(const std::string& filename);
    
    // File access methods
    std::vector<unsigned char> readImageFile(const std::string& filePath);
    
    // WebSocket Event Handlers (made public for SocketIOServer access)
    void handleDetectCameraEvent(int clientSocket);
    void handleStartPreviewEvent(int clientSocket, const std::map<std::string, std::string>& data);
    void handleStopPreviewEvent(int clientSocket);
    void handleStopMjpegEvent(int clientSocket);
    void handleCapturePhotoEvent(int clientSocket);
    void handleSetEffectEvent(int clientSocket, const std::map<std::string, std::string>& data);
    void handleGetEffectEvent(int clientSocket);
    void handleApplyEffectEvent(int clientSocket, const std::map<std::string, std::string>& data);
    
private:
    void setupRoutes();
    void handleHttpRequest(int clientSocket, const std::string& request);
    void handleWebSocketConnection(int clientSocket);
    // API Handlers
    void handleStatusRequest(int clientSocket);
    void handlePhotosRequest(int clientSocket);
    void handlePreviewRequest(int clientSocket);
    void handlePhotoDeleteRequest(int clientSocket, const std::string& filename);
    void handleImageRequest(int clientSocket, const std::string& filename,
                         const std::map<std::string, std::string>& queryParams);
    
    // Utility functions
    std::string generateJsonResponse(const std::map<std::string, std::string>& data);
    std::string generatePhotoFilename();
};

// Fungsi utilitas
std::string getCurrentTimestamp();
bool createDirectories(const std::string& path);
std::vector<std::string> splitString(const std::string& s, char delimiter);
std::string urlEncode(const std::string& str);
void parseJsonObject(const std::string& jsonStr, std::map<std::string, std::string>& result, const std::string& prefix);

#endif // SERVER_H