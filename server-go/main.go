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
    // Use existing Node uploads dir to keep client paths
    // server-go sits alongside server/, so go up one and into server/uploads
    return filepath.Join("..", "server", "uploads")
}

func ensureDirs() error {
    if err := os.MkdirAll(uploadsDir(), 0755); err != nil {
        return err
    }
    previews := filepath.Join("..", "server", "previews")
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
    type photo struct { Filename, Path string; Timestamp int64 }
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
        photos = append(photos, photo{Filename: name, Path: "/uploads/" + name, Timestamp: ts})
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
        if ok, errMsg, url := mjpeg.StartStream(); ok {
            s.Emit("mjpeg-stream-started", map[string]any{"success": true, "streamUrl": url, "port": mjpegPort})
            s.Emit("preview-started", map[string]any{"success": true, "mjpeg": true})
            return
        } else {
            log.Printf("MJPEG start failed: %s", errMsg)
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
        mjpeg.stopStream()
        _ = gp.StopPreviewStream()
        s.Emit("mjpeg-stream-stopped", map[string]any{"success": true})
    })

    server.OnEvent("/", "capture-photo", func(s socketio.Conn) {
        // stop mjpeg while capturing to release USB
        wasActive := mjpeg.IsActive()
        if wasActive {
            mjpeg.stopStream()
            s.Emit("mjpeg-stream-stopped", map[string]any{"success": true})
            time.Sleep(3 * time.Second)
        }
        res, err := gp.CaptureImage()
        if err != nil {
            s.Emit("photo-captured", map[string]any{"success": false, "error": err.Error()})
            return
        }
        // notify current client and broadcast
        s.Emit("photo-captured", res)
        server.BroadcastToNamespace("/", "photoCaptured", res)
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

    // static /uploads
    mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadsDir()))))

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