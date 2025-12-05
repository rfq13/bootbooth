package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    backend "backoffice/backend/internal"
)

func loadDotEnv(paths ...string) {
    for _, p := range paths {
        f, err := os.Open(p)
        if err != nil { continue }
        defer f.Close()
        buf := make([]byte, 64*1024)
        n, _ := f.Read(buf)
        data := string(buf[:n])
        start := 0
        for i := 0; i <= len(data); i++ {
            if i == len(data) || data[i] == '\n' || data[i] == '\r' {
                line := data[start:i]
                start = i + 1
                if len(line) == 0 { continue }
                if line[0] == '#' { continue }
                eq := -1
                for j := 0; j < len(line); j++ { if line[j] == '=' { eq = j; break } }
                if eq <= 0 { continue }
                k := line[:eq]
                v := line[eq+1:]
                if len(v) >= 2 && ((v[0] == '"' && v[len(v)-1] == '"') || (v[0] == '\'' && v[len(v)-1] == '\'')) {
                    v = v[1:len(v)-1]
                }
                if os.Getenv(k) == "" { os.Setenv(k, v) }
            }
        }
    }
}

func main() {
    loadDotEnv(".env")
    srv := backend.NewServer()
    go func() { log.Println("http", srv.Http.Addr); log.Println(srv.ListenAndServe()) }()
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
    <-stop
    ctx, cancel := context.WithTimeout(context.Background(), srv.Cfg.ShutdownTimeout)
    defer cancel()
    srv.Shutdown(ctx)
}
