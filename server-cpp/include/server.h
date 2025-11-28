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
#include <regex>

// Include WebSocket++ server library
#include <websocketpp/server.hpp>
#include <websocketpp/config/asio.hpp>

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
    
    // TCP compatibility untuk Windows
    #ifndef TCP_NODELAY
        #define TCP_NODELAY 0x0001
    #endif
    
    // OpenSSL compatibility untuk Windows
    #define SHA_DIGEST_LENGTH 20
    
#else
    // Linux/Unix
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <netinet/tcp.h>
    #include <arpa/inet.h>
    #include <unistd.h>
    #include <fcntl.h>
    #include <sys/stat.h>
    #include <csignal>
    #include <sys/wait.h>
    #include <dirent.h>
#endif

// OpenSSL - include OpenSSL headers
#include <openssl/sha.h>

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
        
#ifdef _WIN32
        // Windows implementation
        WIN32_FIND_DATAA findData;
        HANDLE hFind = INVALID_HANDLE_VALUE;
        
        std::string searchPath = path + "\\*";
        hFind = FindFirstFileA(searchPath.c_str(), &findData);
        
        if (hFind != INVALID_HANDLE_VALUE) {
            do {
                if (!(findData.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) {
                    entries.push_back(std::string(findData.cFileName));
                }
            } while (FindNextFileA(hFind, &findData) != 0);
            FindClose(hFind);
        }
#else
        // Linux/Unix implementation using opendir/readdir
        DIR* dir = opendir(path.c_str());
        if (dir != nullptr) {
            struct dirent* entry;
            while ((entry = readdir(dir)) != nullptr) {
                if (entry->d_type == DT_REG) { // Regular file
                    entries.push_back(std::string(entry->d_name));
                } else if (entry->d_type == DT_UNKNOWN) {
                    // Fallback: use stat to determine if it's a regular file
                    std::string fullPath = path + "/" + entry->d_name;
                    struct stat statbuf;
                    if (stat(fullPath.c_str(), &statbuf) == 0 && S_ISREG(statbuf.st_mode)) {
                        entries.push_back(std::string(entry->d_name));
                    }
                }
            }
            closedir(dir);
        }
#endif
        
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
const int API_PORT = 3011;
const int MJPEG_PORT = 3013;

// Struktur untuk kamera
struct Camera {
    std::string model;
    std::string port;
};

// NOTE: Efek foto telah dipindahkan ke frontend untuk optimasi performa
// Struktur ini tetap ada untuk backward compatibility
struct EffectParams {
    double intensity = 0.5;  // 0.0 to 1.0
    double radius = 1.0;     // untuk fisheye, vignette
    int pixelSize = 10;      // untuk pixelate
};

// NOTE: Efek foto telah dipindahkan ke frontend untuk optimasi performa
// Enum ini tetap ada untuk backward compatibility
enum class EffectType {
    NONE,
    FISHEYE,
    WIDE_ANGLE,
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

class WebSocketServer;

class BoothIdentityStore;

// NOTE: ImageEffects class telah di-simplify karena efek dipindahkan ke frontend
// Class ini tetap ada untuk backward compatibility tapi tidak melakukan processing
class ImageEffects {
private:
    EffectType currentEffect;
    EffectParams params;
    mutable std::mutex mutex;
    
public:
    ImageEffects();
    void setEffect(EffectType effect, const EffectParams& params);
    std::pair<EffectType, EffectParams> getEffect() const;
    
    // NOTE: applyEffect sekarang hanya return original data (no processing)
    std::vector<unsigned char> applyEffect(const std::vector<unsigned char>& jpegData);
    
    // Utility methods untuk file operations (tetap dibutuhkan)
    ImageData decodeFile(const std::string& filePath);
    bool encodeFile(const std::string& filePath, const ImageData& image);
    
private:
    // JPEG encode/decode methods (tetap dibutuhkan untuk file operations)
    ImageData decodeJPEG(const std::vector<unsigned char>& jpegData);
    std::vector<unsigned char> encodeJPEG(const ImageData& rgbData);
    
    // NOTE: Effect implementation methods tetap ada untuk backward compatibility tapi tidak melakukan processing
    void applyGrayscaleEffect(ImageData& image);
    void applySepiaEffect(ImageData& image);
    void applyInvertEffect(ImageData& image);
    void applyVignetteEffect(ImageData& image);
    void applyBlurEffect(ImageData& image);
    void applySharpenEffect(ImageData& image);
    void applyPixelateEffect(ImageData& image);
    void applyFishEyeEffect(ImageData& image);
    void applyWideAngleEffect(ImageData& image);
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

// WebSocket++ server type definition (changed from asio_tls to asio for non-TLS)
typedef websocketpp::server<websocketpp::config::asio> websocket_server;
typedef websocketpp::connection_hdl connection_hdl;

// Kelas WebSocket Server (menggunakan websocketpp sebagai server)
class WebSocketServer {
private:
    int port;
    bool running;
    std::unique_ptr<websocket_server> wsServer;
    PhotoBoothServer* photoBoothServer;
    std::map<connection_hdl, std::string, std::owner_less<connection_hdl>> clients;
    mutable std::mutex clientsMutex;
    std::thread serverThread;
    
public:
    WebSocketServer(int port, PhotoBoothServer* photoBoothServer);
    ~WebSocketServer();
    
    bool start();
    bool stop();
    bool isRunning() const;
    
    // Event emitters
    void emitToClient(connection_hdl hdl, const std::string& event, const std::map<std::string, std::string>& data);
    void broadcast(const std::string& event, const std::map<std::string, std::string>& data);
    void emitToAll(const std::string& event, const std::map<std::string, std::string>& data);
    
private:
    void setupEventHandlers();
    void onOpen(connection_hdl hdl);
    void onClose(connection_hdl hdl);
    void onMessage(connection_hdl hdl, websocket_server::message_ptr msg);
    void onHttpRequest(connection_hdl hdl);
    std::string mapToJsonObject(const std::map<std::string, std::string>& data);
    
    // WebSocket message handling
    void handleWebSocketMessage(connection_hdl hdl, const std::string& message);
    void handleEvent(connection_hdl hdl, const std::string& event, const std::map<std::string, std::string>& data);
    
    // HTTP request handling (untuk API endpoints)
    void handleApiRequest(const std::string& method, const std::string& path, const std::map<std::string, std::string>& data);
    void handleApiStatusRequest(connection_hdl hdl);
    void handleApiPhotosRequest(connection_hdl hdl);
    void handleApiPreviewRequest(connection_hdl hdl);
    void handleApiPhotoDeleteRequest(connection_hdl hdl, const std::string& filename);
    void handleImageRequest(connection_hdl hdl, const std::string& filename, const std::map<std::string, std::string>& queryParams);
    std::string generateJsonResponse(const std::map<std::string, std::string>& data);
    std::string generateJsonResponseWithBoolean(const std::map<std::string, std::string>& data);
    std::map<std::string, std::string> parseQueryString(const std::string& query);
    
    // HTTP response handling
    void sendHttpResponse(connection_hdl hdl, int statusCode, const std::string& body,
                         const std::string& contentType, bool includeCors);
    
    // HTTP API handlers
    void handleHttpApiStatusRequest(connection_hdl hdl);
    void handleHttpApiPhotosRequest(connection_hdl hdl);
    void handleHttpApiIdentityGetRequest(connection_hdl hdl);
    void handleHttpApiIdentityPostRequest(connection_hdl hdl, websocket_server::connection_ptr con);
    void handleHttpApiPhotoDeleteRequest(connection_hdl hdl, const std::string& filename);
    void handleHttpUploadImagePostRequest(connection_hdl hdl, websocket_server::connection_ptr con);
    void handleHttpRenderTemplatePostRequest(connection_hdl hdl, websocket_server::connection_ptr con);
    
    // Static file serving handlers
    std::string getMimeTypeFromExtension(const std::string& filename);
    bool isPathSafe(const std::string& path);
    bool fileExists(const std::string& filepath);
    std::vector<uint8_t> readBinaryFile(const std::string& filepath);
    void handleStaticFileRequest(connection_hdl hdl, const std::string& path);
};

// Kelas HTTP Server utama
class PhotoBoothServer {
private:
    int apiPort;
    int mjpegPort;
    GPhotoWrapper* gphoto;
    MJPEGServer* mjpegServer;
    WebSocketServer* webSocketServer;
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
    WebSocketServer* getWebSocketServer() { return webSocketServer; }
    BoothIdentityStore* getIdentityStore() { return identityStore; }
    std::vector<Photo> getPhotosList();
    bool deletePhoto(const std::string& filename);
    
    // File access methods
    std::vector<unsigned char> readImageFile(const std::string& filePath);
    
    // WebSocket Event Handlers (made public for WebSocketServer access)
    void handleDetectCameraEvent(connection_hdl hdl);
    void handleStartPreviewEvent(connection_hdl hdl, const std::map<std::string, std::string>& data);
    void handleStopPreviewEvent(connection_hdl hdl);
    void handleStopMjpegEvent(connection_hdl hdl);
    void handleCapturePhotoEvent(connection_hdl hdl);
    void handleSetEffectEvent(connection_hdl hdl, const std::map<std::string, std::string>& data);
    void handleGetEffectEvent(connection_hdl hdl);
    void handleApplyEffectEvent(connection_hdl hdl, const std::map<std::string, std::string>& data);
    
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
void parseEventJson(const std::string& jsonStr, std::map<std::string, std::string>& result);

#endif // SERVER_H