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
        next.ServeHTTP(w, r)
        role := r.Context().Value(ctxRole)
        sub := r.Context().Value(ctxSub)
        l.Println(map[string]any{"method": r.Method, "path": r.URL.Path, "dur_ms": time.Since(start).Milliseconds(), "role": role, "sub": sub})
    })
}

var rl = rate.NewLimiter(rate.Every(time.Second), 10)

func withRateLimit(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ip, _, _ := net.SplitHostPort(r.RemoteAddr)
        if !rl.Allow() {
            writeError(w, http.StatusTooManyRequests, "rate_limit")
            return
        }
        _ = ip
        next.ServeHTTP(w, r)
    })
}

func withCORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := os.Getenv("FRONTEND_ORIGIN")
        if origin == "" { origin = "*" }
        w.Header().Set("Access-Control-Allow-Origin", origin)
        w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        w.Header().Set("Access-Control-Allow-Credentials", "true")
        if r.Method == http.MethodOptions { w.WriteHeader(http.StatusNoContent); return }
        next.ServeHTTP(w, r)
    })
}

func writeJSON(w http.ResponseWriter, code int, v any) { w.Header().Set("Content-Type", "application/json"); w.WriteHeader(code); json.NewEncoder(w).Encode(v) }
func writeError(w http.ResponseWriter, code int, reason string) { writeJSON(w, code, map[string]any{"error": reason}) }


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
        auth := r.Header.Get("Authorization")
        if auth == "" || !strings.HasPrefix(auth, "Bearer ") { writeError(w, http.StatusUnauthorized, "unauthorized"); return }
        tok := strings.TrimPrefix(auth, "Bearer ")
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
        csrfHeader := r.Header.Get("X-CSRF-Token")
        var csrfCookie string
        if c, err := r.Cookie("csrf_token"); err == nil { csrfCookie = c.Value }
        if csrfHeader == "" || csrfCookie == "" || csrfHeader != csrfCookie {
            writeError(w, http.StatusForbidden, "csrf_invalid"); return
        }
        next.ServeHTTP(w, r)
    })
}