package backend

import (
	"context"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
    Addr string
    ShutdownTimeout time.Duration
    ReadTimeout time.Duration
    WriteTimeout time.Duration
    IdleTimeout time.Duration
}

func envDuration(key string, def time.Duration) time.Duration { v := os.Getenv(key); if v == "" { return def }; d, err := time.ParseDuration(v); if err != nil { return def }; return d }
func envString(key, def string) string { v := os.Getenv(key); if v == "" { return def }; return v }
func envInt(key string, def int) int { v := os.Getenv(key); if v == "" { return def }; i, err := strconv.Atoi(v); if err != nil { return def }; return i }
// 
type Server struct {
    Cfg Config
    Http *http.Server
    CertFile string
    KeyFile string
}

func NewServer() *Server {
    h := buildRouter()
    cfg := Config{
        Addr: envString("BACKOFFICE_ADDR", ":8080"),
        ShutdownTimeout: envDuration("BACKOFFICE_SHUTDOWN_TIMEOUT", 10*time.Second),
        ReadTimeout: envDuration("BACKOFFICE_READ_TIMEOUT", 5*time.Second),
        WriteTimeout: envDuration("BACKOFFICE_WRITE_TIMEOUT", 10*time.Second),
        IdleTimeout: envDuration("BACKOFFICE_IDLE_TIMEOUT", 60*time.Second),
    }
    srv := &http.Server{ Addr: cfg.Addr, Handler: h, ReadTimeout: cfg.ReadTimeout, WriteTimeout: cfg.WriteTimeout, IdleTimeout: cfg.IdleTimeout }
    cert := envString("BACKOFFICE_TLS_CERT", "")
    key := envString("BACKOFFICE_TLS_KEY", "")
    return &Server{ Cfg: cfg, Http: srv, CertFile: cert, KeyFile: key }
}

func (s *Server) Shutdown(ctx context.Context) { s.Http.Shutdown(ctx) }
func (s *Server) ListenAndServe() error {
    // Only enable TLS when both cert and key paths are provided and exist
    if cf := strings.TrimSpace(s.CertFile); cf != "" {
        if kf := strings.TrimSpace(s.KeyFile); kf != "" {
            if _, err1 := os.Stat(cf); err1 == nil {
                if _, err2 := os.Stat(kf); err2 == nil {
                    return s.Http.ListenAndServeTLS(cf, kf)
                }
            }
        }
    }
    return s.Http.ListenAndServe()
}
