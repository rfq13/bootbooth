package backend

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

func buildRouter() http.Handler {
    s := NewService(newRepo())
    mux := http.NewServeMux()
    hub := newHub()
    var db = func() *sql.DB { d, _ := NewDB(); return d }()
    booths := newBoothHub(db)
    
    // Create a completely separate router for public endpoints (no middleware at all)
    publicRouter := http.NewServeMux()
    publicRouter.HandleFunc("/socket-test", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        w.Header().Set("Access-Control-Allow-Credentials", "true")
        w.WriteHeader(200)
        json.NewEncoder(w).Encode(map[string]string{
            "message": "Socket.IO server is running",
            "path": "/socket.io/",
            "port": "3002",
            "status": "active",
        })
    })
    
    // Socket.IO for localbooth
    socketIOSrv, err := newSocketIOServer(booths, hub)
    if err != nil {
        fmt.Printf("Error creating Socket.IO server: %v\n", err)
    } else {
        go func() {
            if err := socketIOSrv.Serve(); err != nil {
                fmt.Printf("Error serving Socket.IO: %v\n", err)
            }
        }()
        publicRouter.Handle("/socket.io/", socketIOSrv)
    }
    
    // public endpoints
    mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"ok": "true"}) })
    mux.HandleFunc("/auth/login", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body map[string]string
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil { writeError(w, 400, "invalid_json"); return }
        email := strings.TrimSpace(body["email"])
        password := strings.TrimSpace(body["password"])
        if email == "" || password == "" { writeError(w, 400, "missing_fields"); return }
        role := "admin"
        if strings.Contains(strings.ToLower(email), "super") { role = "super_admin" }
        secret := envString("BACKOFFICE_JWT_SECRET", "dev-secret")
        ttl := time.Hour * 8
        token, _ := makeJWT(map[string]any{"sub": email, "role": role}, ttl, secret)
        csrf := b64([]byte(time.Now().Format(time.RFC3339Nano)))
        http.SetCookie(w, &http.Cookie{Name: "csrf_token", Value: csrf, Path: "/", SameSite: http.SameSiteLaxMode})
        writeJSON(w, 200, map[string]any{"token": token, "role": role})
    })
    // SSE events stream
    mux.HandleFunc("/events", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "text/event-stream")
        w.Header().Set("Cache-Control", "no-cache")
        w.Header().Set("Connection", "keep-alive")
        flusher, ok := w.(http.Flusher)
        if !ok { writeError(w, 500, "stream_unavailable"); return }
        ch := hub.Subscribe()
        defer hub.Unsubscribe(ch)
        for {
            select {
            case <-r.Context().Done():
                return
            case msg := <-ch:
                w.Write([]byte("data: "))
                w.Write(msg)
                w.Write([]byte("\n\n"))
                flusher.Flush()
            }
        }
    })
    // public API endpoints (no auth required)
    publicMux := http.NewServeMux()
    publicMux.HandleFunc("/api/booth/register", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        type loc struct{ Lat float64 `json:"lat"`; Lng float64 `json:"lng"` }
        var body struct{ BoothName string `json:"booth_name"`; Location loc `json:"location"` }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil { writeError(w, 400, "invalid_json"); return }
        name := strings.TrimSpace(body.BoothName)
        if len(name) < 3 || len(name) > 50 { writeError(w, 400, "invalid_name"); return }
        lat := body.Location.Lat
        lng := body.Location.Lng
        if lat < -90 || lat > 90 || lng < -180 || lng > 180 { writeError(w, 400, "invalid_location"); return }
        id := newUUID()
        createdAt := time.Now().UTC().Format(time.RFC3339)
        identity := map[string]any{"id": id, "booth_name": name, "location": map[string]any{"lat": lat, "lng": lng}, "created_at": createdAt}
        writeJSON(w, 200, map[string]any{"success": true, "data": identity})
    })
    // protected endpoints
    authMux := http.NewServeMux()
    authMux.HandleFunc("/session/", func(w http.ResponseWriter, r *http.Request) {
        if r.Method == http.MethodGet && hasSuffix(r.URL.Path, "/status") {
            path := r.URL.Path
            id := path[len("/session/") : len(path)-len("/status")]
            v, _ := s.GetSessionStatus(r.Context(), id)
            writeJSON(w, 200, v); return
        }
        if r.Method == http.MethodPost && hasSuffix(r.URL.Path, "/override") {
            path := r.URL.Path
            id := path[len("/session/") : len(path)-len("/override")]
            var body map[string]string
            json.NewDecoder(r.Body).Decode(&body)
            admin := body["admin_id"]
            v, _ := s.OverrideSession(r.Context(), id, admin)
            writeJSON(w, 200, v); return
        }
        writeError(w, 404, "not_found")
    })
    authMux.Handle("/outlets", requireRole("super_admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { v, _ := s.ListOutlets(r.Context()); writeJSON(w, 200, v) })))
    authMux.Handle("/booths", requireRole("super_admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, booths.list()) })))
    authMux.Handle("/booths/db", requireRole("super_admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, booths.listDB()) })))
    authMux.Handle("/admin-users", requireRole("super_admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { v, _ := s.ListAdminUsers(r.Context()); writeJSON(w, 200, v) })))
    authMux.HandleFunc("/bookings", func(w http.ResponseWriter, r *http.Request) { v, _ := s.ListBookings(r.Context(), r.URL.Query().Get("status")); writeJSON(w, 200, v) })
    mux.HandleFunc("/booking", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body map[string]string
        json.NewDecoder(r.Body).Decode(&body)
        user := strings.TrimSpace(body["user_name"])
        outlet := strings.TrimSpace(body["outlet_name"])
        v, _ := s.CreateBooking(r.Context(), user, outlet)
        writeJSON(w, 201, v)
    })
    mux.HandleFunc("/payment/confirm", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        raw, _ := io.ReadAll(r.Body)
        secret := os.Getenv("PAYMENT_WEBHOOK_SECRET")
        if secret != "" {
            sig := r.Header.Get("X-Signature")
            mac := hmac.New(sha256.New, []byte(secret))
            mac.Write(raw)
            expected := hex.EncodeToString(mac.Sum(nil))
            if sig == "" || !hmac.Equal([]byte(strings.ToLower(sig)), []byte(strings.ToLower(expected))) {
                writeError(w, http.StatusForbidden, "invalid_signature"); return
            }
        }
        var body map[string]string
        _ = json.Unmarshal(raw, &body)
        id := strings.TrimSpace(body["booking_id"])
        v, _ := s.ConfirmPayment(r.Context(), id)
        writeJSON(w, 200, v)
        hub.Broadcast(map[string]any{"type": "SESSION_APPROVED", "session_id": id})
    })
    authMux.Handle("/config/system", requireRole("super_admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.Method == http.MethodGet { v, _ := s.GetSystemConfig(r.Context()); writeJSON(w, 200, v); return }
        if r.Method == http.MethodPut {
            r.ParseForm()
            sm := r.FormValue("session_duration_minutes")
            tm := r.FormValue("arrival_tolerance_minutes")
            sMin := atoi(sm)
            tMin := atoi(tm)
            v, _ := s.UpdateSystemConfig(r.Context(), sMin, tMin)
            writeJSON(w, 200, v); return
        }
        writeError(w, 405, "method_not_allowed")
    })))
    authMux.HandleFunc("/session/arrival", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body map[string]string
        json.NewDecoder(r.Body).Decode(&body)
        id := strings.TrimSpace(body["id"])
        cfg, _ := s.GetSystemConfig(r.Context())
        tol := atoi(toString(cfg["arrival_tolerance_minutes"]))
        v, _ := s.Arrival(r.Context(), id, time.Now().Unix(), tol)
        writeJSON(w, 200, v)
        if v["status"] == "EXPIRED" { hub.Broadcast(map[string]any{"type": "SESSION_EXPIRED", "session_id": id}) }
    })
    authMux.HandleFunc("/session/start", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body map[string]string
        json.NewDecoder(r.Body).Decode(&body)
        id := strings.TrimSpace(body["id"])
        v, _ := s.Start(r.Context(), id)
        writeJSON(w, 200, v)
    })
    authMux.HandleFunc("/session/finish", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body map[string]string
        json.NewDecoder(r.Body).Decode(&body)
        id := strings.TrimSpace(body["id"])
        v, _ := s.Finish(r.Context(), id)
        writeJSON(w, 200, v)
    })
    // Handle all other routes with auth middleware
    protectedHandler := requireAuth(requireCSRF(withCORS(withRateLimit(withLogging(mux)))))
    
    // Create a final handler that routes between public and protected
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Handle public routes directly (no middleware)
        if r.URL.Path == "/socket-test" {
            w.Header().Set("Content-Type", "application/json")
            w.Header().Set("Access-Control-Allow-Origin", "*")
            w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
            w.Header().Set("Access-Control-Allow-Credentials", "true")
            w.WriteHeader(200)
            json.NewEncoder(w).Encode(map[string]string{
                "message": "Socket.IO server is running",
                "path": "/socket.io/",
                "port": "3002",
                "status": "active",
            })
            return
        }
        
        if strings.HasPrefix(r.URL.Path, "/socket.io/") {
            // Socket.IO server menangani header sendiri, jadi kita langsung serve saja
            socketIOSrv.ServeHTTP(w, r)
            return
        }
        
        // Handle all other routes with auth middleware
        protectedHandler.ServeHTTP(w, r)
    })
}

func hasSuffix(path, suffix string) bool { return len(path) >= len(suffix) && path[len(path)-len(suffix):] == suffix }

func newRepo() repository {
    return repository{
        outlets: []map[string]any{
            {"id": "out-1", "name": "Booth A", "address": "Hall 1"},
            {"id": "out-2", "name": "Booth B", "address": "Hall 2"},
        },
        adminUsers: []map[string]any{
            {"id": "adm-1", "name": "Alice", "email": "alice@example.com", "outlet_name": "Booth A"},
            {"id": "adm-2", "name": "Bob", "email": "bob@example.com", "outlet_name": "Booth B"},
        },
        bookings: []map[string]any{
            {"id": "bk-1", "user_name": "John", "outlet_name": "Booth A", "status": "AWAITING_CUSTOMER", "booking_time": "2025-11-17T12:00:00Z"},
            {"id": "bk-2", "user_name": "Mary", "outlet_name": "Booth B", "status": "PAID", "booking_time": "2025-11-17T12:30:00Z"},
            {"id": "bk-3", "user_name": "Lara", "outlet_name": "Booth A", "status": "EXPIRED", "booking_time": "2025-11-16T18:00:00Z"},
        },
        systemConfig: map[string]any{"session_duration_minutes": 20, "arrival_tolerance_minutes": 15},
    }
}

type repository struct{
    outlets []map[string]any
    adminUsers []map[string]any
    bookings []map[string]any
    systemConfig map[string]any
}

func (r repository) ListOutlets() ([]map[string]any, error) { return r.outlets, nil }
func (r repository) ListAdminUsers() ([]map[string]any, error) { return r.adminUsers, nil }
func (r repository) ListBookings(status string) ([]map[string]any, error) {
    if status == "" { return r.bookings, nil }
    out := []map[string]any{}
    for _, b := range r.bookings { if b["status"] == status { out = append(out, b) } }
    return out, nil
}
func (r repository) GetSessionStatus(id string) (map[string]any, error) {
    for _, b := range r.bookings { if b["id"] == id { return map[string]any{"status": b["status"]}, nil } }
    return map[string]any{"status": "UNKNOWN"}, nil
}
func (r repository) OverrideSession(id, admin string) (map[string]any, error) {
    for i, b := range r.bookings { if b["id"] == id { r.bookings[i]["status"] = "OVERRIDDEN"; r.bookings[i]["override_by"] = admin } }
    return map[string]any{"id": id, "status": "OVERRIDDEN", "override_by": admin}, nil
}
func (r repository) CreateBooking(userName, outletName string) (map[string]any, error) {
    id := newUUID()
    b := map[string]any{"id": id, "user_name": userName, "outlet_name": outletName, "status": "PENDING_PAYMENT", "booking_time": time.Now().UTC().Format(time.RFC3339)}
    r.bookings = append(r.bookings, b)
    return b, nil
}
func (r repository) ConfirmPayment(bookingID string) (map[string]any, error) {
    for i, b := range r.bookings { if b["id"] == bookingID { r.bookings[i]["status"] = "PAID"; r.bookings[i]["paid_at"] = time.Now().UTC().Format(time.RFC3339); return r.bookings[i], nil } }
    return map[string]any{"id": bookingID, "status": "UNKNOWN"}, nil
}
func (r repository) Arrival(id string, nowUnix int64, toleranceMinutes int) (map[string]any, error) {
    for i, b := range r.bookings { if b["id"] == id {
        btStr, _ := b["booking_time"].(string)
        bt, _ := time.Parse(time.RFC3339, btStr)
        late := time.Unix(nowUnix, 0).After(bt.Add(time.Duration(toleranceMinutes) * time.Minute))
        if late { r.bookings[i]["status"] = "EXPIRED" } else { r.bookings[i]["status"] = "ARRIVED" }
        return r.bookings[i], nil
    } }
    return map[string]any{"id": id, "status": "UNKNOWN"}, nil
}
func (r repository) Start(id string) (map[string]any, error) {
    for i, b := range r.bookings { if b["id"] == id { r.bookings[i]["status"] = "ONGOING"; r.bookings[i]["start_at"] = time.Now().UTC().Format(time.RFC3339); return r.bookings[i], nil } }
    return map[string]any{"id": id, "status": "UNKNOWN"}, nil
}
func (r repository) Finish(id string) (map[string]any, error) {
    for i, b := range r.bookings { if b["id"] == id { r.bookings[i]["status"] = "DONE"; r.bookings[i]["finish_at"] = time.Now().UTC().Format(time.RFC3339); return r.bookings[i], nil } }
    return map[string]any{"id": id, "status": "UNKNOWN"}, nil
}
func (r repository) GetSystemConfig() (map[string]any, error) { return r.systemConfig, nil }
func (r repository) UpdateSystemConfig(sessionMinutes int, toleranceMinutes int) (map[string]any, error) {
    r.systemConfig["session_duration_minutes"] = sessionMinutes
    r.systemConfig["arrival_tolerance_minutes"] = toleranceMinutes
    return r.systemConfig, nil
}

func atoi(s string) int { i, _ := strconv.Atoi(s); return i }
func toString(v any) string { switch t := v.(type) { case string: return t; case int: return strconv.Itoa(t); case float64: return strconv.Itoa(int(t)); default: return "" } }
func newUUID() string {
    b := make([]byte, 16)
    _, _ = rand.Read(b)
    // version 4
    b[6] = (b[6] & 0x0f) | 0x40
    b[8] = (b[8] & 0x3f) | 0x80
    return hex.EncodeToString(b[0:4]) + "-" + hex.EncodeToString(b[4:6]) + "-" + hex.EncodeToString(b[6:8]) + "-" + hex.EncodeToString(b[8:10]) + "-" + hex.EncodeToString(b[10:16])
}



// SSE hub
type hub struct{ mu sync.Mutex; subs map[chan []byte]struct{} }
func newHub() *hub { return &hub{ subs: map[chan []byte]struct{}{} } }
func (h *hub) Subscribe() chan []byte { ch := make(chan []byte, 16); h.mu.Lock(); h.subs[ch] = struct{}{}; h.mu.Unlock(); return ch }
func (h *hub) Unsubscribe(ch chan []byte) { h.mu.Lock(); delete(h.subs, ch); close(ch); h.mu.Unlock() }
func (h *hub) Broadcast(v map[string]any) {
    b, _ := json.Marshal(v)
    h.mu.Lock()
    for ch := range h.subs {
        select {
        case ch <- b:
        default:
        }
    }
    h.mu.Unlock()
}