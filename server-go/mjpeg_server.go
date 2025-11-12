package main

import (
    "bytes"
    "context"
    "log"
    "net/http"
    "os/exec"
    "strconv"
    "sync"
    "syscall"
    "time"
)

type streamClient struct {
    w       http.ResponseWriter
    flusher http.Flusher
}

type MJPEGServer struct {
    port         int
    server       *http.Server
    clientsMu    sync.Mutex
    clients      map[*streamClient]struct{}
    streamProc   *exec.Cmd
    isStreaming  bool
    frameBuffer  []byte
    bufferMu     sync.Mutex
}

func NewMJPEGServer(port int) *MJPEGServer {
    return &MJPEGServer{
        port:        port,
        clients:     make(map[*streamClient]struct{}),
        frameBuffer: make([]byte, 0, 1024*512),
    }
}

func (m *MJPEGServer) setupRoutes() {
    mux := http.NewServeMux()

    // CORS middleware
    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        http.NotFound(w, r)
    })

    mux.HandleFunc("/camera", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "multipart/x-mixed-replace; boundary=--frame")
        w.Header().Set("Cache-Control", "no-cache")
        w.Header().Set("Pragma", "no-cache")
        w.Header().Set("Connection", "close")
        w.Header().Set("Access-Control-Allow-Origin", "*")

        flusher, ok := w.(http.Flusher)
        if !ok {
            http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
            return
        }

        client := &streamClient{w: w, flusher: flusher}
        m.clientsMu.Lock()
        m.clients[client] = struct{}{}
        m.clientsMu.Unlock()

        // initial boundary
        _, _ = w.Write([]byte("--frame\r\n"))
        flusher.Flush()

        // remove client on disconnect
        go func() {
            <-r.Context().Done()
            m.removeClient(client)
        }()
    })

    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        _, _ = w.Write([]byte(`{"status":"ok","streaming":` + boolToString(m.isStreaming) + `,"clients":` + strconv.Itoa(m.clientCount()) + `}`))
    })

    m.server = &http.Server{
        Addr:    ":" + strconv.Itoa(m.port),
        Handler: mux,
    }
}

func (m *MJPEGServer) Start() error {
    if m.server != nil {
        return nil
    }
    m.setupRoutes()
    go func() {
        log.Printf("✅ MJPEG server berjalan di port %d", m.port)
        if err := m.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Printf("MJPEG server error: %v", err)
        }
    }()
    return nil
}

func (m *MJPEGServer) Stop() error {
    if m.server == nil {
        return nil
    }
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()
    m.stopStream()
    m.closeAllClients()
    err := m.server.Shutdown(ctx)
    m.server = nil
    return err
}

func (m *MJPEGServer) StartStream() (bool, string, string) {
    if m.isStreaming {
        return false, "Stream sudah aktif", ""
    }

    cmd := exec.Command("gphoto2", "--stdout", "--capture-movie")
    stdout, err := cmd.StdoutPipe()
    if err != nil {
        return false, err.Error(), ""
    }
    stderr, _ := cmd.StderrPipe()

    if err := cmd.Start(); err != nil {
        return false, err.Error(), ""
    }
    m.streamProc = cmd
    m.isStreaming = true

    go func() {
        // consume stderr to avoid blocking; filter known message
        buf := make([]byte, 4096)
        for m.isStreaming {
            n, err := stderr.Read(buf)
            if n > 0 {
                msg := string(buf[:n])
                if !bytes.Contains([]byte(msg), []byte("Capturing preview frames as movie")) {
                    log.Printf("⚠️ GPhoto2 error: %s", msg)
                }
            }
            if err != nil {
                break
            }
        }
    }()

    go func() {
        // parse JPEG frames by markers
        startMarker := []byte{0xff, 0xd8}
        endMarker := []byte{0xff, 0xd9}
        readBuf := make([]byte, 64*1024)
        for m.isStreaming {
            n, err := stdout.Read(readBuf)
            if n > 0 {
                m.bufferMu.Lock()
                m.frameBuffer = append(m.frameBuffer, readBuf[:n]...)
                // keep buffer size under 1MB
                if len(m.frameBuffer) > 1024*1024 {
                    m.frameBuffer = m.frameBuffer[len(m.frameBuffer)-1024*512:]
                }

                // search frames
                for {
                    si := bytes.Index(m.frameBuffer, startMarker)
                    if si == -1 {
                        break
                    }
                    ei := bytes.Index(m.frameBuffer[si+2:], endMarker)
                    if ei != -1 {
                        ei = si + 2 + ei
                        frame := make([]byte, ei-si+2)
                        copy(frame, m.frameBuffer[si:ei+2])
                        m.frameBuffer = m.frameBuffer[ei+2:]
                        m.bufferMu.Unlock()
                        m.sendFrameToClients(frame)
                        m.bufferMu.Lock()
                    } else {
                        break
                    }
                }
                m.bufferMu.Unlock()
            }
            if err != nil {
                break
            }
        }

        // cleanup when stream ends
        m.stopStream()
    }()

    log.Printf("🎥 Streaming dimulai...")
    return true, "", m.StreamURL()
}

func (m *MJPEGServer) stopStream() {
    if !m.isStreaming {
        return
    }
    log.Printf("🛑 Menghentikan stream...")
    m.isStreaming = false
    if m.streamProc != nil {
        _ = m.streamProc.Process.Signal(syscall.SIGINT)
        // give it a moment, then kill if needed
        done := make(chan struct{})
        go func() { _ = m.streamProc.Wait(); close(done) }()
        select {
        case <-done:
        case <-time.After(2 * time.Second):
            _ = m.streamProc.Process.Kill()
        }
        m.streamProc = nil
    }
    m.closeAllClients()
}

func (m *MJPEGServer) closeAllClients() {
    m.clientsMu.Lock()
    for c := range m.clients {
        // best-effort end of stream
        _, _ = c.w.Write([]byte("\r\n--frame--\r\n"))
        c.flusher.Flush()
        delete(m.clients, c)
    }
    m.clientsMu.Unlock()
}

func (m *MJPEGServer) removeClient(c *streamClient) {
    m.clientsMu.Lock()
    if _, ok := m.clients[c]; ok {
        _, _ = c.w.Write([]byte("\r\n--frame--\r\n"))
        c.flusher.Flush()
        delete(m.clients, c)
    }
    m.clientsMu.Unlock()
}

func (m *MJPEGServer) sendFrameToClients(frame []byte) {
    header := []byte("Content-Type: image/jpeg\r\nContent-Length: ")
    length := []byte(strconv.Itoa(len(frame)))
    footer := []byte("\r\n\r\n")
    boundary := []byte("\r\n--frame\r\n")

    m.clientsMu.Lock()
    for c := range m.clients {
        // write header
        _, _ = c.w.Write(header)
        _, _ = c.w.Write(length)
        _, _ = c.w.Write(footer)
        // write frame
        _, _ = c.w.Write(frame)
        // write boundary
        _, _ = c.w.Write(boundary)
        c.flusher.Flush()
    }
    m.clientsMu.Unlock()
}

func (m *MJPEGServer) IsActive() bool { return m.isStreaming }
func (m *MJPEGServer) StreamURL() string { return "http://localhost:" + strconv.Itoa(m.port) + "/camera" }
func (m *MJPEGServer) ClientCount() int { return m.clientCount() }

func (m *MJPEGServer) clientCount() int {
    m.clientsMu.Lock()
    defer m.clientsMu.Unlock()
    return len(m.clients)
}

func boolToString(b bool) string {
    if b {
        return "true"
    }
    return "false"
}