package backend

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"golang.org/x/time/rate"
)

type jsonLogger struct{}

func (jsonLogger) Println(v ...any) { b, _ := json.Marshal(map[string]any{"ts": time.Now().UTC().Format(time.RFC3339), "msg": v}); log.Println(string(b)) }

func withLogging(next http.Handler) http.Handler {
    l := jsonLogger{}
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // Don't wrap response writer for WebSocket requests to allow hijacking
        // Don't wrap for SSE requests to allow flushing
        var rw http.ResponseWriter = w
        var statusCode = 200
        
        if !isWebSocketRequest(r) && !isSSERequest(r) {
            rw = &responseWriter{ResponseWriter: w, statusCode: 200}
        }
        
        next.ServeHTTP(rw, r)
        role := r.Context().Value(ctxRole)
        sub := r.Context().Value(ctxSub)
        
        // Get status code from responseWriter if it was used
        if respWriter, ok := rw.(*responseWriter); ok {
            statusCode = respWriter.statusCode
        }
        
        l.Println(map[string]any{
            "event": "request_completed",
            "method": r.Method,
            "path": r.URL.Path,
            "status": statusCode,
            "dur_ms": time.Since(start).Milliseconds(),
            "role": role,
            "sub": sub,
            "cors_origin": w.Header().Get("Access-Control-Allow-Origin"),
        })
    })
}

func isWebSocketRequest(r *http.Request) bool {
    return strings.ToLower(r.Header.Get("Connection")) == "upgrade" &&
           strings.ToLower(r.Header.Get("Upgrade")) == "websocket"
}

func isSSERequest(r *http.Request) bool {
    return strings.Contains(strings.ToLower(r.Header.Get("Accept")), "text/event-stream")
}

type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

// Implement http.Flusher interface if the underlying ResponseWriter supports it
func (rw *responseWriter) Flush() {
    if flusher, ok := rw.ResponseWriter.(http.Flusher); ok {
        flusher.Flush()
    }
}

var ipLimiters = struct{ m map[string]*rate.Limiter }{ m: map[string]*rate.Limiter{} }
func getLimiter(ip string) *rate.Limiter {
    if l, ok := ipLimiters.m[ip]; ok { return l }
    l := rate.NewLimiter(rate.Every(time.Minute/10), 10)
    ipLimiters.m[ip] = l
    return l
}

func withRateLimit(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ip, _, _ := net.SplitHostPort(r.RemoteAddr)
        l := getLimiter(ip)
        if !l.Allow() {
            writeError(w, http.StatusTooManyRequests, "rate_limit")
            return
        }
        next.ServeHTTP(w, r)
    })
}

func withCORS(next http.Handler) http.Handler {
    l := jsonLogger{}
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origins := os.Getenv("FRONTEND_ORIGIN")
        originList := strings.Split(origins, ",")
        origin := "*"
        if len(originList) == 1 && originList[0] != "" {
            origin = originList[0]
        } else if len(originList) > 1 {
            reqOrigin := r.Header.Get("Origin")
            for _, o := range originList {
                if strings.TrimSpace(o) == reqOrigin {
                    origin = reqOrigin
                    break
                }
            }
        }
        
        // Logging origin untuk ditampilkan di docker logs
        l.Println(map[string]any{
            "event": "origin_logging",
            "request_origin": r.Header.Get("Origin"),
            "allowed_origins_env": origins,
            "origin_list": originList,
            "final_origin": origin,
            "path": r.URL.Path,
            "method": r.Method,
            "headers": r.Header,
        })
        
        w.Header().Set("Access-Control-Allow-Origin", origin)
        w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token")
        w.Header().Set("Access-Control-Allow-Credentials", "true")
        w.Header().Set("Access-Control-Max-Age", "86400")
        
        // Log final CORS headers
        l.Println(map[string]any{
            "event": "cors_headers_set",
            "final_origin": origin,
            "allow_credentials": "true",
            "request_method": r.Method,
        })
        
        // normal OPTIONS handler
        if r.Method == http.MethodOptions {
            l.Println(map[string]any{
                "event": "cors_options_request",
                "status": "204",
                "path": r.URL.Path,
                "request_headers": r.Header,
            })
            w.WriteHeader(http.StatusNoContent)
            return
        }

        next.ServeHTTP(w, r)
    })
}

func writeJSON(w http.ResponseWriter, code int, v any) {
    w.Header().Set("Content-Type", "application/json");
    w.WriteHeader(code);
    json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, code int, reason string) {
    l := jsonLogger{}
    l.Println(map[string]any{
        "event": "error_response",
        "status_code": code,
        "error_reason": reason,
    })
    writeJSON(w, code, map[string]any{"error": reason})
}



func b64(data []byte) string { return base64.RawURLEncoding.EncodeToString(data) }
func b64d(s string) ([]byte, error) { return base64.RawURLEncoding.DecodeString(s) }

func makeJWT(claims map[string]any, ttl time.Duration, secret string) (string, error) {
    header := map[string]any{"alg": "HS256", "typ": "JWT"}
    now := time.Now().Unix()
    claims["iat"] = now
    if ttl > 0 { claims["exp"] = now + int64(ttl.Seconds()) }
    hb, _ := json.Marshal(header)
    pb, _ := json.Marshal(claims)
    data := b64(hb) + "." + b64(pb)
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(data))
    sig := mac.Sum(nil)
    return data + "." + b64(sig), nil
}

func verifyJWT(token, secret string) (map[string]any, error) {
    parts := strings.Split(token, ".")
    if len(parts) != 3 { return nil, http.ErrNoCookie }
    data := parts[0] + "." + parts[1]
    sigBytes, err := b64d(parts[2])
    if err != nil { return nil, err }
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(data))
    if !hmac.Equal(sigBytes, mac.Sum(nil)) { return nil, http.ErrBodyNotAllowed }
    pb, err := b64d(parts[1])
    if err != nil { return nil, err }
    var claims map[string]any
    if err := json.Unmarshal(pb, &claims); err != nil { return nil, err }
    if exp, ok := claims["exp"].(float64); ok && time.Now().Unix() > int64(exp) { return nil, http.ErrNoLocation }
    return claims, nil
}

type ctxKey string
var ctxRole ctxKey = "role"
var ctxSub ctxKey = "sub"

func requireAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Skip authentication for public endpoints
        if r.URL.Path == "/socket-test" || strings.HasPrefix(r.URL.Path, "/socket.io/") {
            next.ServeHTTP(w, r)
            return
        }
        // Allow unauthenticated access to public auth endpoints
        switch r.URL.Path {
        case "/auth/login", "/auth/register", "/auth/forgot", "/auth/verify", "/healthz", "/terms", "/events":
            next.ServeHTTP(w, r)
            return
        }
        l := jsonLogger{}
        
        auth := r.Header.Get("Authorization")
        l.Println(map[string]any{
            "event": "auth_header_received",
            "header": auth,
        })
        if auth == "" || !strings.HasPrefix(auth, "Bearer ") { writeError(w, http.StatusUnauthorized, "unauthorized"); return }
        tok := strings.TrimPrefix(auth, "Bearer ")
        
        l.Println(map[string]any{
            "event": "token_received",
            "token": tok,
        })
        secret := envString("BACKOFFICE_JWT_SECRET", "dev-secret")
        if tok == "devtoken" && secret == "dev-secret" {
            ctx := context.WithValue(r.Context(), ctxRole, "admin")
            ctx = context.WithValue(ctx, ctxSub, "dev@local")
            next.ServeHTTP(w, r.WithContext(ctx)); return
        }
        claims, err := verifyJWT(tok, secret)
        if err != nil { writeError(w, http.StatusUnauthorized, "invalid_token"); return }
        role := ""
        if v, ok := claims["role"].(string); ok { role = v }
        sub := ""
        if v, ok := claims["sub"].(string); ok { sub = v }
        ctx := context.WithValue(r.Context(), ctxRole, role)
        ctx = context.WithValue(ctx, ctxSub, sub)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func requireRole(roles ...string) func(http.Handler) http.Handler {
    allowed := map[string]struct{}{}
    for _, r := range roles { allowed[r] = struct{}{} }
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            role, _ := r.Context().Value(ctxRole).(string)
            if _, ok := allowed[role]; !ok { writeError(w, http.StatusForbidden, "forbidden"); return }
            next.ServeHTTP(w, r)
        })
    }
}

func requireCSRF(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.Method == http.MethodGet || r.Method == http.MethodOptions { next.ServeHTTP(w, r); return }
        // Skip CSRF for public auth endpoints
        switch r.URL.Path {
        case "/auth/login", "/auth/register", "/auth/forgot", "/auth/verify":
            next.ServeHTTP(w, r)
            return
        }
        csrfHeader := r.Header.Get("X-CSRF-Token")
        var csrfCookie string
        if c, err := r.Cookie("csrf_token"); err == nil { csrfCookie = c.Value }
        if csrfHeader == "" || csrfCookie == "" || csrfHeader != csrfCookie {
            writeError(w, http.StatusForbidden, "csrf_invalid"); return
        }
        next.ServeHTTP(w, r)
    })
}
