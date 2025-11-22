package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    backend "backoffice/backend/internal"
)

func main() {
    srv := backend.NewServer()
    go func() { log.Println("http", srv.Http.Addr); log.Println(srv.ListenAndServe()) }()
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
    <-stop
    ctx, cancel := context.WithTimeout(context.Background(), srv.Cfg.ShutdownTimeout)
    defer cancel()
    srv.Shutdown(ctx)
}