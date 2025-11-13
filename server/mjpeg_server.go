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
	mu      sync.Mutex // Add mutex for individual client operations
	closed  bool       // Track if client is closed
}

type MJPEGServer struct {
	port         int
	server       *http.Server
	clientsMu    sync.RWMutex // Use RWMutex for better read performance
	clients      map[*streamClient]struct{}
	streamProc   *exec.Cmd
	isStreaming  bool
	frameBuffer  []byte
	bufferMu     sync.Mutex
	effects      *ImageEffects
}

func NewMJPEGServer(port int) *MJPEGServer {
	return &MJPEGServer{
		port:        port,
		clients:     make(map[*streamClient]struct{}),
		frameBuffer: make([]byte, 0, 1024*512),
		effects:     NewImageEffects(),
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

		client := &streamClient{
			w:       w,
			flusher: flusher,
			closed:  false,
		}
		
		m.clientsMu.Lock()
		m.clients[client] = struct{}{}
		m.clientsMu.Unlock()

		// Write initial boundary safely
		if err := client.safeWrite([]byte("--frame\r\n")); err != nil {
			m.removeClient(client)
			return
		}
		client.safeFlush()

		// Wait for disconnect
		<-r.Context().Done()
		m.removeClient(client)
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

// Safe write method for streamClient
func (c *streamClient) safeWrite(data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	if c.closed {
		return http.ErrServerClosed
	}
	
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in write: %v", r)
			c.closed = true
		}
	}()
	
	_, err := c.w.Write(data)
	return err
}

// Safe flush method for streamClient
func (c *streamClient) safeFlush() {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	if c.closed || c.flusher == nil {
		return
	}
	
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in flush: %v", r)
			c.closed = true
		}
	}()
	
	c.flusher.Flush()
}

// Mark client as closed
func (c *streamClient) close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.closed = true
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

	// Clear old frame buffer before starting new stream
	m.bufferMu.Lock()
	m.frameBuffer = make([]byte, 0, 1024*512)
	m.bufferMu.Unlock()

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

// SetEffect allows changing the effect dynamically
func (m *MJPEGServer) SetEffect(effect EffectType, params EffectParams) {
	m.effects.SetEffect(effect, params)
	log.Printf("🎨 MJPEG Effect changed to: %s", effect)
}

// GetCurrentEffect returns the current effect
func (m *MJPEGServer) GetCurrentEffect() (EffectType, EffectParams) {
	return m.effects.GetEffect()
}

func (m *MJPEGServer) stopStream() {
	if !m.isStreaming {
		return
	}
	log.Printf("🛑 Menghentikan stream...")
	m.isStreaming = false

	if m.streamProc != nil && m.streamProc.Process != nil {
		// Send interrupt signal
		if err := m.streamProc.Process.Signal(syscall.SIGINT); err != nil {
			log.Printf("⚠️ Gagal mengirim SIGINT ke proses stream: %v", err)
		}

		// Wait with timeout
		done := make(chan struct{})
		go func() {
			_ = m.streamProc.Wait()
			close(done)
		}()

		select {
		case <-done:
			log.Printf("✅ Stream process terminated gracefully")
		case <-time.After(2 * time.Second):
			log.Printf("⚠️ Stream process timeout, killing...")
			if err := m.streamProc.Process.Kill(); err != nil {
				log.Printf("⚠️ Gagal membunuh proses stream: %v", err)
			}
			<-done // Wait for kill to complete
		}

		m.streamProc = nil
	} else {
		log.Printf("⚠️ Tidak ada proses stream yang aktif untuk dihentikan")
	}

	// Clear frame buffer after stopping
	m.bufferMu.Lock()
	m.frameBuffer = make([]byte, 0, 1024*512)
	m.bufferMu.Unlock()

	m.closeAllClients()

	log.Printf("✅ Stream stopped completely")
}

func (m *MJPEGServer) closeAllClients() {
	m.clientsMu.Lock()
	clients := make([]*streamClient, 0, len(m.clients))
	for c := range m.clients {
		clients = append(clients, c)
	}
	m.clients = make(map[*streamClient]struct{})
	m.clientsMu.Unlock()

	for _, c := range clients {
		c.close()
		_ = c.safeWrite([]byte("\r\n--frame--\r\n"))
		c.safeFlush()
	}
}

func (m *MJPEGServer) removeClient(c *streamClient) {
	m.clientsMu.Lock()
	delete(m.clients, c)
	m.clientsMu.Unlock()
	
	c.close()
	_ = c.safeWrite([]byte("\r\n--frame--\r\n"))
	c.safeFlush()
}

func (m *MJPEGServer) sendFrameToClients(frame []byte) {
	// Apply effects to frame before sending
	processedFrame, err := m.effects.ApplyEffect(frame)
	if err != nil {
		// If effect processing fails, use original frame
		processedFrame = frame
	}

	header := []byte("Content-Type: image/jpeg\r\nContent-Length: ")
	length := []byte(strconv.Itoa(len(processedFrame)))
	footer := []byte("\r\n\r\n")
	boundary := []byte("\r\n--frame\r\n")

	m.clientsMu.RLock()
	clients := make([]*streamClient, 0, len(m.clients))
	for c := range m.clients {
		clients = append(clients, c)
	}
	m.clientsMu.RUnlock()

	// Track clients that failed
	var failedClients []*streamClient

	for _, c := range clients {
		// Try to send frame
		if err := c.safeWrite(header); err != nil {
			failedClients = append(failedClients, c)
			continue
		}
		if err := c.safeWrite(length); err != nil {
			failedClients = append(failedClients, c)
			continue
		}
		if err := c.safeWrite(footer); err != nil {
			failedClients = append(failedClients, c)
			continue
		}
		if err := c.safeWrite(processedFrame); err != nil {
			failedClients = append(failedClients, c)
			continue
		}
		if err := c.safeWrite(boundary); err != nil {
			failedClients = append(failedClients, c)
			continue
		}
		
		c.safeFlush()
	}

	// Remove failed clients
	if len(failedClients) > 0 {
		m.clientsMu.Lock()
		for _, c := range failedClients {
			delete(m.clients, c)
		}
		m.clientsMu.Unlock()
	}
}

func (m *MJPEGServer) IsActive() bool { return m.isStreaming }
func (m *MJPEGServer) StreamURL() string {
	return "http://localhost:" + strconv.Itoa(m.port) + "/camera"
}
func (m *MJPEGServer) ClientCount() int { return m.clientCount() }

func (m *MJPEGServer) clientCount() int {
	m.clientsMu.RLock()
	defer m.clientsMu.RUnlock()
	return len(m.clients)
}

func boolToString(b bool) string {
	if b {
		return "true"
	}
	return "false"
}