package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	socketio "github.com/googollee/go-socket.io"
	"github.com/googollee/go-socket.io/engineio"
	"github.com/googollee/go-socket.io/engineio/transport"
	"github.com/googollee/go-socket.io/engineio/transport/polling"
	"github.com/googollee/go-socket.io/engineio/transport/websocket"
)

const (
    apiPort   = 3001
    mjpegPort = 8080
)

type appState struct {
    cameraConnected bool
}

// Global GPhoto wrapper instance
var gp *GPhotoWrapper

func uploadsDir() string {
    // Use uploads folder in the same directory as server
    return "uploads"
}

func ensureDirs() error {
    if err := os.MkdirAll(uploadsDir(), 0755); err != nil {
        return err
    }
    previews := "previews"
    if err := os.MkdirAll(previews, 0755); err != nil {
        return err
    }
    return nil
}

func detectCamera() (bool, []string, error) {
    cmd := exec.Command("gphoto2", "--auto-detect")
    out, err := cmd.CombinedOutput()
    if err != nil {
        // if command fails, assume not connected
        return false, nil, nil
    }
    lines := strings.Split(string(out), "\n")
    // simple parse: lines with USB device indicate camera
    cams := make([]string, 0)
    for _, l := range lines {
        if strings.Contains(strings.ToLower(l), "usb") || strings.Contains(strings.ToLower(l), "ptp") {
            cams = append(cams, strings.TrimSpace(l))
        }
    }
    return len(cams) > 0, cams, nil
}

func apiStatusHandler(w http.ResponseWriter, r *http.Request) {
    cams, _ := gp.DetectCamera()
    connected := len(cams) > 0
    resp := map[string]interface{}{
        "cameraConnected": connected,
        "message": func() string {
            if connected { return "Kamera terhubung" }
            return "Kamera tidak terhubung (mode simulasi)"
        }(),
    }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(resp)
}

func apiPhotosHandler(w http.ResponseWriter, r *http.Request) {
    dir := uploadsDir()
    entries, err := os.ReadDir(dir)
    if err != nil {
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]interface{}{"photos": []any{}})
        return
    }
    type photo struct { Filename string; Path string; Timestamp int64; Simulated bool }
    photos := make([]photo, 0)
    for _, e := range entries {
        if e.IsDir() { continue }
        name := e.Name()
        if !(strings.HasSuffix(strings.ToLower(name), ".jpg") || strings.HasSuffix(strings.ToLower(name), ".jpeg")) {
            continue
        }
        ts := time.Now().UnixMilli()
        parts := strings.Split(name, "_")
        if len(parts) > 1 {
            // expect photo_<timestamp>.jpg
            tparts := strings.Split(parts[1], ".")
            if len(tparts) > 0 {
                if v, err := parseInt64(tparts[0]); err == nil { ts = v }
            }
        }
        // Check if this is a simulated photo by reading the file size
        // Simulated photos are usually very small (just JPEG header)
        filePath := filepath.Join(dir, name)
        fileInfo, _ := os.Stat(filePath)
        simulated := false
        if fileInfo != nil && fileInfo.Size() < 1000 { // Less than 1KB likely simulated
            simulated = true
        }
        photos = append(photos, photo{Filename: name, Path: "/uploads/" + name, Timestamp: ts, Simulated: simulated})
    }
    sort.Slice(photos, func(i, j int) bool { return photos[i].Timestamp > photos[j].Timestamp })
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]any{"photos": photos})
}

func parseInt64(s string) (int64, error) {
    var v int64
    for _, ch := range s {
        if ch < '0' || ch > '9' { return 0, fmt.Errorf("non-digit") }
        v = v*10 + int64(ch-'0')
    }
    return v, nil
}

func capturePhoto() (map[string]any, error) {
    ts := time.Now().UnixMilli()
    filename := fmt.Sprintf("photo_%d.jpg", ts)
    outPath := filepath.Join(uploadsDir(), filename)

    // use gphoto2 to capture and download; fallback to a placeholder if not available
    cmd := exec.Command("gphoto2", "--capture-image-and-download", "--filename", outPath, "--force-overwrite")
    if err := cmd.Run(); err != nil {
        // fallback: generate a simple placeholder using imagemagick (optional) or empty file
        f, ferr := os.Create(outPath)
        if ferr != nil {
            return nil, ferr
        }
        // write a tiny JPEG header placeholder to avoid broken img tags
        _, _ = f.Write([]byte{0xFF, 0xD8, 0xFF, 0xD9})
        _ = f.Close()
    }

    return map[string]any{
        "success":   true,
        "filename":  filename,
        "url":       "/uploads/" + filename,
        "timestamp": ts,
        "simulated": false,
    }, nil
}

func main() {
    if err := ensureDirs(); err != nil {
        log.Fatalf("ensure dirs: %v", err)
    }

    // Initialize GPhoto2 wrapper
    gp = NewGPhotoWrapper()

    // Start MJPEG server
    mjpeg := NewMJPEGServer(mjpegPort)
    if err := mjpeg.Start(); err != nil {
        log.Fatalf("start mjpeg: %v", err)
    }

    // Socket.IO server with CORS allowed for dev client
    allowOrigin := func(r *http.Request) bool { return true }
    server := socketio.NewServer(&engineio.Options{
        Transports: []transport.Transport{
            &polling.Transport{CheckOrigin: allowOrigin},
            &websocket.Transport{CheckOrigin: allowOrigin},
        },
    })
    go server.Serve()
    defer server.Close()

    server.OnConnect("/", func(s socketio.Conn) error {
        log.Printf("Client terhubung: %s", s.ID())
        return nil
    })

    server.OnEvent("/", "detect-camera", func(s socketio.Conn) {
        cams, _ := gp.DetectCamera()
        connected := len(cams) > 0
        payload := map[string]any{
            "success": connected,
            "cameras": cams,
            "count":   len(cams),
        }
        s.Emit("camera-detected", payload)
    })

    server.OnEvent("/", "start-preview", func(s socketio.Conn, data map[string]any) {
        log.Printf("📹 Starting preview stream...")
        
        // Stop any existing stream first
        if mjpeg.IsActive() {
            log.Printf("⚠️ Stopping existing stream before starting new one...")
            mjpeg.stopStream()
            time.Sleep(500 * time.Millisecond) // Brief pause to ensure cleanup
        }
        
        if ok, errMsg, url := mjpeg.StartStream(); ok {
            log.Printf("✅ MJPEG stream started successfully")
            s.Emit("mjpeg-stream-started", map[string]any{"success": true, "streamUrl": url, "port": mjpegPort})
            s.Emit("preview-started", map[string]any{"success": true, "mjpeg": true})
            return
        } else {
            log.Printf("❌ MJPEG start failed: %s", errMsg)
        }
        
        // Fallback: frame-by-frame preview using gphoto2
        fps := 4
        if v, ok := data["fps"].(float64); ok && v > 0 {
            fps = int(v)
        }
        res := gp.StartPreviewStream(func(event string, payload any) {
            s.Emit(event, payload)
        }, fps)
        if success, ok := res["success"].(bool); ok && success {
            s.Emit("preview-started", map[string]any{"success": true, "mjpeg": false, "fps": fps})
        } else {
            s.Emit("preview-started", map[string]any{"success": false, "mjpeg": false, "error": res["error"]})
        }
    })

    server.OnEvent("/", "stop-preview", func(s socketio.Conn) {
        log.Printf("🛑 Stopping preview stream...")
        mjpeg.stopStream()
        _ = gp.StopPreviewStream()
        s.Emit("mjpeg-stream-stopped", map[string]any{"success": true})
        log.Printf("✅ Preview stream stopped")
    })

    // Explicit handler to stop only MJPEG stream (used by client before capture)
    server.OnEvent("/", "stop-mjpeg", func(s socketio.Conn) {
        if mjpeg.IsActive() {
            log.Printf("🛑 Stopping MJPEG stream (explicit)...")
            mjpeg.stopStream()
            s.Emit("mjpeg-stream-stopped", map[string]any{"success": true})
        }
    })

    server.OnEvent("/", "capture-photo", func(s socketio.Conn) {
        log.Printf("📸 Capturing photo...")
        
        // Stop mjpeg while capturing to release USB
        wasActive := mjpeg.IsActive()
        if wasActive {
            log.Printf("⚠️ Stopping stream for capture...")
            mjpeg.stopStream()
            s.Emit("mjpeg-stream-stopped", map[string]any{"success": true})
            
            // Wait longer to ensure camera is fully released
            log.Printf("⏳ Waiting for camera to be ready...")
            time.Sleep(500 * time.Millisecond)
        }
        
        res, err := gp.CaptureImage()
        if err != nil {
            log.Printf("❌ Capture failed: %v", err)
            s.Emit("photo-captured", map[string]any{"success": false, "error": err.Error()})
            return
        }
        
        log.Printf("✅ Photo captured successfully: %v", res["filename"])
        
        // Notify current client and broadcast
        s.Emit("photo-captured", res)
        
        // Format response for client as expected
        clientRes := map[string]any{
            "Filename":  res["filename"],
            "Path":      res["url"],
            "Timestamp": res["timestamp"],
            "Simulated": res["simulated"],
        }
        server.BroadcastToNamespace("/", "photoCaptured", clientRes)
        
        // Add additional wait time after capture before allowing restart
        if wasActive {
            log.Printf("⏳ Cooling down after capture...")
            time.Sleep(250 * time.Millisecond)
        }
    })

    server.OnEvent("/", "set-effect", func(s socketio.Conn, data map[string]any) {
        effectName, ok := data["effect"].(string)
        if !ok {
            s.Emit("effect-changed", map[string]any{"success": false, "error": "Invalid effect name"})
            return
        }

        effect := EffectType(effectName)
        params := EffectParams{
            Intensity: 0.5,
            Radius:    1.0,
            PixelSize: 10,
        }

        // Parse params if provided
        if paramsData, ok := data["params"].(map[string]any); ok {
            if intensity, ok := paramsData["intensity"].(float64); ok {
                params.Intensity = intensity
            }
            if radius, ok := paramsData["radius"].(float64); ok {
                params.Radius = radius
            }
            if pixelSize, ok := paramsData["pixelSize"].(float64); ok {
                params.PixelSize = int(pixelSize)
            }
        }

        // Apply to both MJPEG and GPhoto wrapper
        mjpeg.SetEffect(effect, params)
        gp.SetEffect(effect, params)

        log.Printf("🎨 Effect set to: %s with params: %+v", effect, params)
        s.Emit("effect-changed", map[string]any{
            "success": true,
            "effect":  effectName,
            "params":  params,
        })
        
        // Broadcast to all clients
        server.BroadcastToNamespace("/", "effectChanged", map[string]any{
            "effect": effectName,
            "params": params,
        })
    })

    server.OnEvent("/", "get-effect", func(s socketio.Conn) {
        effect, params := mjpeg.GetCurrentEffect()
        s.Emit("current-effect", map[string]any{
            "effect": string(effect),
            "params": params,
        })
    })

    server.OnDisconnect("/", func(s socketio.Conn, reason string) {
        log.Printf("Client terputus: %s (%s)", s.ID(), reason)
        mjpeg.stopStream()
    })

    // HTTP API and static assets
    mux := http.NewServeMux()
    mux.HandleFunc("/api/status", apiStatusHandler)
    mux.HandleFunc("/api/photos", apiPhotosHandler)
    // proxies might hit /api/preview single-frame; implement a lightweight stub
    mux.HandleFunc("/api/preview", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        res, err := gp.CapturePreviewFrame()
        if err != nil {
            _ = json.NewEncoder(w).Encode(map[string]any{"success": false, "error": err.Error()})
            return
        }
        _ = json.NewEncoder(w).Encode(res)
    })

    // DELETE endpoint for photos
    mux.HandleFunc("/api/photos/", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodDelete {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }
        
        // Extract filename from URL path /api/photos/filename
        pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
        if len(pathParts) < 3 {
            http.Error(w, "Invalid URL", http.StatusBadRequest)
            return
        }
        filename := pathParts[2]
        
        filePath := filepath.Join(uploadsDir(), filename)
        if err := os.Remove(filePath); err != nil {
            w.Header().Set("Content-Type", "application/json")
            _ = json.NewEncoder(w).Encode(map[string]any{"success": false, "error": "Gagal menghapus foto"})
            return
        }
        
        // Broadcast photo deletion to all clients
        server.BroadcastToNamespace("/", "photoDeleted", map[string]any{"filename": filename})
        
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]any{"success": true})
    })

    // static /uploads with compression headers
    mux.HandleFunc("/uploads/", func(w http.ResponseWriter, r *http.Request) {
        filePath := filepath.Join(uploadsDir(), strings.TrimPrefix(r.URL.Path, "/uploads/"))
        
        // Prevent directory traversal
        if strings.Contains(filePath, "..") {
            http.Error(w, "Forbidden", http.StatusForbidden)
            return
        }
        
        fileInfo, err := os.Stat(filePath)
        if err != nil {
            http.Error(w, "File not found", http.StatusNotFound)
            return
        }
        
        if fileInfo.IsDir() {
            http.Error(w, "Forbidden", http.StatusForbidden)
            return
        }
        
        // Set cache headers
        w.Header().Set("Cache-Control", "public, max-age=86400") // 1 day
        w.Header().Set("Vary", "Accept-Encoding")
        
        // Check if client accepts webp (for future webp conversion)
        // acceptsWebp := strings.Contains(r.Header.Get("Accept"), "image/webp")
        
        // For now, serve original file with proper headers
        // In future, we can add webp conversion here
        http.ServeFile(w, r, filePath)
    })

    // mount socket.io
    mux.Handle("/socket.io/", server)

    httpServer := &http.Server{
        Addr:    fmt.Sprintf(":%d", apiPort),
        Handler: withCORS(mux),
    }

    go func() {
        log.Printf("Server berjalan pada http://localhost:%d", apiPort)
        log.Printf("Mode: %s", func() string { cams, _ := gp.DetectCamera(); if len(cams) > 0 {return "Kamera Nyata"}; return "Simulasi" }())
        if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("api server error: %v", err)
        }
    }()

    // block forever
    select {}
}

func withCORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
}