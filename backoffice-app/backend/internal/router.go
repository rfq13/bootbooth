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
    
    // WebSocket server for localbooth
    l := jsonLogger{}
    l.Println(map[string]any{
        "event": "socket_server_initialization_start",
        "message": "Creating WebSocket server",
    })
    
    socketIOSrv, err := newSocketIOServer(booths, hub)
    if err != nil {
        l.Println(map[string]any{
            "event": "socket_server_creation_failed",
            "error": err.Error(),
        })
        fmt.Printf("Error creating WebSocket server: %v\n", err)
    } else {
        l.Println(map[string]any{
            "event": "socket_server_created_successfully",
            "message": "WebSocket server created successfully",
        })
        l.Println(map[string]any{
            "event": "socket_server_registered",
            "path": "/socket.io/",
        })
    }
    
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
            "message": "WebSocket server is running",
            "path": "/socket.io/",
            "port": "3002",
            "status": "active",
        })
    })
    
    // Test endpoint untuk socket.io direct access
    publicRouter.HandleFunc("/socket-test-direct", func(w http.ResponseWriter, r *http.Request) {
        l := jsonLogger{}
        l.Println(map[string]any{
            "event": "socket_test_direct_called",
            "method": r.Method,
            "path": r.URL.Path,
            "query": r.URL.RawQuery,
        })
        
        // Test direct websocket server access
        if socketIOSrv != nil {
            l.Println(map[string]any{
                "event": "socket_server_not_nil",
                "message": "WebSocket server is available",
            })
            socketIOSrv.ServeHTTP(w, r)
        } else {
            l.Println(map[string]any{
                "event": "socket_server_is_nil",
                "message": "WebSocket server is nil",
            })
            w.WriteHeader(500)
            json.NewEncoder(w).Encode(map[string]string{"error": "WebSocket server is nil"})
        }
    })
    
    // public endpoints
    mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"ok": "true"}) })
    mux.HandleFunc("/auth/login", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body map[string]string
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil { writeError(w, 400, "invalid_json"); return }
        email := strings.TrimSpace(body["email"])
        password := strings.TrimSpace(body["password"])
        if email == "" || password == "" { writeError(w, 400, "missing_fields"); return }

        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()

        var uid int
        var ph, ps, role string
        q := `SELECT u.id, u.password_hash, u.password_salt, r.code FROM users u JOIN roles r ON u.role_id = r.id WHERE LOWER(u.email) = LOWER($1)`
        err := db.QueryRow(q, email).Scan(&uid, &ph, &ps, &role)
        if err != nil {
            allow := strings.EqualFold(envString("DEV_LOGIN_FALLBACK", "false"), "true")
            if !allow { writeError(w, http.StatusUnauthorized, "invalid_credentials"); return }
            role = "admin"
            if strings.Contains(strings.ToLower(email), "super") { role = "super_admin" }
        } else {
            pepper := envString("PASSWORD_PEPPER", "")
            if hashPassword(password, ps, pepper) != ph {
                writeError(w, http.StatusUnauthorized, "invalid_credentials"); return
            }
        }

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
    publicMux.HandleFunc("/terms", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet { writeError(w, 405, "method_not_allowed"); return }
        q := r.URL.Query()
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        if strings.EqualFold(q.Get("active"), "true") {
            row := db.QueryRow(`SELECT id, major, minor, version_code, status, effective_date, version_notes, content, published_at FROM terms_versions WHERE status='active' ORDER BY published_at DESC NULLS LAST, id DESC LIMIT 1`)
            var id, major, minor int; var code, status, notes string; var eff, pub sql.NullTime; var content json.RawMessage
            if err := row.Scan(&id,&major,&minor,&code,&status,&eff,&notes,&content,&pub); err != nil { writeError(w, 404, "not_found"); return }
            writeJSON(w, 200, map[string]any{"id":id,"major":major,"minor":minor,"version_code":code,"status":status,"effective_date":eff.Time,"version_notes":notes,"content":json.RawMessage(content)})
            return
        }
        if idStr := q.Get("id"); idStr != "" {
            id := atoi(idStr)
            row := db.QueryRow(`SELECT id, major, minor, version_code, status, effective_date, version_notes, content, published_at FROM terms_versions WHERE id=$1`, id)
            var tid, major, minor int; var code, status, notes string; var eff, pub sql.NullTime; var content json.RawMessage
            if err := row.Scan(&tid,&major,&minor,&code,&status,&eff,&notes,&content,&pub); err != nil { writeError(w, 404, "not_found"); return }
            writeJSON(w, 200, map[string]any{"id":tid,"major":major,"minor":minor,"version_code":code,"status":status,"effective_date":eff.Time,"version_notes":notes,"content":json.RawMessage(content)})
            return
        }
        rows, _ := db.Query(`SELECT id, major, minor, version_code, status, effective_date, version_notes, published_at FROM terms_versions ORDER BY id DESC LIMIT 20`)
        defer rows.Close()
        out := []map[string]any{}
        for rows.Next() { var id, major, minor int; var code, status, notes string; var eff, pub sql.NullTime; _ = rows.Scan(&id,&major,&minor,&code,&status,&eff,&notes,&pub); out = append(out, map[string]any{"id":id,"major":major,"minor":minor,"version_code":code,"status":status,"effective_date":eff.Time,"version_notes":notes,"published_at":pub.Time}) }
        writeJSON(w, 200, out)
    })
    publicHandler := withCORS(withRateLimit(withLogging(publicMux)))
    // protected endpoints
    authMux := http.NewServeMux()
    // public registration
    mux.HandleFunc("/auth/register", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body map[string]string
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil { writeError(w, 400, "invalid_json"); return }
        email := strings.TrimSpace(body["email"])
        password := strings.TrimSpace(body["password"])
        if email == "" || password == "" { writeError(w, 400, "missing_fields"); return }
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        var exists int
        _ = db.QueryRow(`SELECT COUNT(1) FROM users WHERE LOWER(email)=LOWER($1)`, email).Scan(&exists)
        if exists > 0 { writeError(w, 409, "email_exists"); return }
        salt := genSalt()
        pepper := envString("PASSWORD_PEPPER", "")
        hash := hashPassword(password, salt, pepper)
        var roleID int
        _ = db.QueryRow(`SELECT id FROM roles WHERE code='user'`).Scan(&roleID)
        if roleID == 0 { writeError(w, 500, "role_missing"); return }
        var uid int
        err := db.QueryRow(`INSERT INTO users (email, password_hash, password_salt, role_id, is_verified) VALUES ($1,$2,$3,$4,false) RETURNING id`, email, hash, salt, roleID).Scan(&uid)
        if err != nil { writeError(w, 500, "register_failed"); return }
        tok := newUUID()
        exp := time.Now().Add(24 * time.Hour)
        _, _ = db.Exec(`INSERT INTO email_verifications (user_id, token, expires_at) SELECT id, $1, $2 FROM users WHERE email=$3`, tok, exp, email)
        var tid int
        _ = db.QueryRow(`SELECT id FROM terms_versions WHERE status='active' ORDER BY published_at DESC NULLS LAST, id DESC LIMIT 1`).Scan(&tid)
        if tid > 0 {
            _, _ = db.Exec(`INSERT INTO user_terms_agreements (user_id, terms_version_id) VALUES ($1,$2) ON CONFLICT (user_id, terms_version_id) DO NOTHING`, uid, tid)
        }
        writeJSON(w, 201, map[string]any{"success": true})
    })
    // forgot password
    mux.HandleFunc("/auth/forgot", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body map[string]string
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil { writeError(w, 400, "invalid_json"); return }
        email := strings.TrimSpace(body["email"])
        if email == "" { writeError(w, 400, "missing_fields"); return }
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        var uid int
        _ = db.QueryRow(`SELECT id FROM users WHERE LOWER(email)=LOWER($1)`, email).Scan(&uid)
        if uid == 0 { writeJSON(w, 200, map[string]any{"success": true}); return }
        tok := newUUID(); exp := time.Now().Add(2 * time.Hour)
        _, _ = db.Exec(`INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1,$2,$3)`, uid, tok, exp)
        writeJSON(w, 200, map[string]any{"success": true})
    })
    // verify email
    mux.HandleFunc("/auth/verify", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body map[string]string
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil { writeError(w, 400, "invalid_json"); return }
        token := strings.TrimSpace(body["token"])
        if token == "" { writeError(w, 400, "missing_fields"); return }
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        var uid int; var exp time.Time; var used bool
        err := db.QueryRow(`SELECT user_id, expires_at, used FROM email_verifications WHERE token=$1`, token).Scan(&uid, &exp, &used)
        if err != nil || used || time.Now().After(exp) { writeError(w, 400, "invalid_token"); return }
        _, _ = db.Exec(`UPDATE users SET is_verified=true WHERE id=$1`, uid)
        _, _ = db.Exec(`UPDATE email_verifications SET used=true WHERE token=$1`, token)
        writeJSON(w, 200, map[string]any{"success": true})
    })
    // bootstrap super admin (one-time)
    mux.HandleFunc("/auth/bootstrap-superadmin", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        raw, _ := io.ReadAll(r.Body)
        var body map[string]string
        _ = json.Unmarshal(raw, &body)
        token := strings.TrimSpace(body["token"]) // bootstrap token
        expected := envString("BOOTSTRAP_TOKEN", "")
        if expected == "" || token == "" || token != expected { writeError(w, http.StatusForbidden, "forbidden"); return }
        email := strings.TrimSpace(body["email"])
        password := strings.TrimSpace(body["password"])
        if email == "" || password == "" { writeError(w, 400, "missing_fields"); return }
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        var cnt int
        _ = db.QueryRow(`SELECT COUNT(1) FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code='super_admin'`).Scan(&cnt)
        if cnt > 0 { writeJSON(w, 200, map[string]any{"success": true}); return }
        salt := genSalt(); pepper := envString("PASSWORD_PEPPER", ""); hash := hashPassword(password, salt, pepper)
        var roleID int
        _ = db.QueryRow(`SELECT id FROM roles WHERE code='super_admin'`).Scan(&roleID)
        if roleID == 0 { writeError(w, 500, "role_missing"); return }
        _, err := db.Exec(`INSERT INTO users (email, password_hash, password_salt, role_id, is_verified) VALUES ($1,$2,$3,$4,true)`, email, hash, salt, roleID)
        if err != nil { writeError(w, 500, "bootstrap_failed"); return }
        writeJSON(w, 201, map[string]any{"success": true})
    })
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
    authMux.Handle("/bookings", requireRole("admin", "super_admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        v, _ := s.ListBookings(r.Context(), r.URL.Query().Get("status"));
        writeJSON(w, 200, v)
    })))
    // transactions endpoints
    authMux.HandleFunc("/transactions", func(w http.ResponseWriter, r *http.Request) {
        role, _ := r.Context().Value(ctxRole).(string)
        if role != "user" { writeError(w, http.StatusForbidden, "forbidden"); return }
        if r.Method == http.MethodGet {
            email, _ := r.Context().Value(ctxSub).(string)
            db := func() *sql.DB { d, _ := NewDB(); return d }()
            if db == nil { writeError(w, 500, "db_unavailable"); return }
            defer db.Close()
            var uid int
            _ = db.QueryRow(`SELECT id FROM users WHERE LOWER(email)=LOWER($1)`, email).Scan(&uid)
            rows, _ := db.Query(`SELECT id, amount, currency, status, description, payment_ref, created_at, updated_at FROM transactions WHERE user_id=$1 ORDER BY created_at DESC`, uid)
            defer rows.Close()
            out := []map[string]any{}
            for rows.Next() {
                var id int; var amt float64; var cur, st, desc, pref string; var ca, ua time.Time
                _ = rows.Scan(&id, &amt, &cur, &st, &desc, &pref, &ca, &ua)
                out = append(out, map[string]any{"id": id, "amount": amt, "currency": cur, "status": st, "description": desc, "payment_ref": pref, "created_at": ca, "updated_at": ua})
            }
            writeJSON(w, 200, out); return
        }
        if r.Method == http.MethodPost {
            var body struct{ Amount float64 `json:"amount"`; Currency string `json:"currency"`; Description string `json:"description"`; Items []struct{ Name string `json:"name"`; Quantity int `json:"quantity"`; Price float64 `json:"price"` } `json:"items"` }
            if err := json.NewDecoder(r.Body).Decode(&body); err != nil { writeError(w, 400, "invalid_json"); return }
            if body.Amount <= 0 || len(body.Items) == 0 { writeError(w, 400, "invalid_transaction"); return }
            cur := body.Currency; if cur == "" { cur = "IDR" }
            email, _ := r.Context().Value(ctxSub).(string)
            db := func() *sql.DB { d, _ := NewDB(); return d }()
            if db == nil { writeError(w, 500, "db_unavailable"); return }
            defer db.Close()
            var uid int; _ = db.QueryRow(`SELECT id FROM users WHERE LOWER(email)=LOWER($1)`, email).Scan(&uid)
            tx, _ := db.Begin()
            var id int
            _ = tx.QueryRow(`INSERT INTO transactions (user_id, amount, currency, status, description) VALUES ($1,$2,$3,'created',$4) RETURNING id`, uid, body.Amount, cur, body.Description).Scan(&id)
            for _, it := range body.Items { _, _ = tx.Exec(`INSERT INTO transaction_items (transaction_id, name, quantity, price) VALUES ($1,$2,$3,$4)`, id, it.Name, it.Quantity, it.Price) }
            _, _ = tx.Exec(`INSERT INTO transaction_logs (transaction_id, activity) VALUES ($1,$2)`, id, "created")
            _ = tx.Commit()
            writeJSON(w, 201, map[string]any{"id": id})
            return
        }
        writeError(w, 405, "method_not_allowed")
    })
    authMux.HandleFunc("/transactions/validate", func(w http.ResponseWriter, r *http.Request) {
        role, _ := r.Context().Value(ctxRole).(string)
        if role != "user" { writeError(w, http.StatusForbidden, "forbidden"); return }
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body struct{ ID int `json:"id"` }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID <= 0 { writeError(w, 400, "invalid_json"); return }
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        _, _ = db.Exec(`UPDATE transactions SET status='validated', updated_at=NOW() WHERE id=$1`, body.ID)
        _, _ = db.Exec(`INSERT INTO transaction_logs (transaction_id, activity) VALUES ($1,$2)`, body.ID, "validated")
        writeJSON(w, 200, map[string]any{"success": true})
    })
    authMux.HandleFunc("/transactions/pay", func(w http.ResponseWriter, r *http.Request) {
        role, _ := r.Context().Value(ctxRole).(string)
        if role != "user" { writeError(w, http.StatusForbidden, "forbidden"); return }
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body struct{ ID int `json:"id"` }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID <= 0 { writeError(w, 400, "invalid_json"); return }
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        ref := newUUID()
        _, _ = db.Exec(`UPDATE transactions SET status='pending', payment_ref=$2, updated_at=NOW() WHERE id=$1`, body.ID, ref)
        _, _ = db.Exec(`INSERT INTO transaction_logs (transaction_id, activity) VALUES ($1,$2)`, body.ID, "pending")
        payURL := "/payments/mock?tid=" + strconv.Itoa(body.ID) + "&ref=" + ref
        writeJSON(w, 200, map[string]any{"payment_url": payURL, "ref": ref})
    })
    // terms admin create/publish
    authMux.Handle("/admin/terms", requireRole("admin","super_admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body struct{ Content json.RawMessage `json:"content"`; EffectiveDate string `json:"effective_date"`; VersionNotes string `json:"version_notes"` }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil || len(body.Content) == 0 { writeError(w, 400, "invalid_json"); return }
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        var major, minor int
        _ = db.QueryRow(`SELECT COALESCE(MAX(major),1), COALESCE(MAX(minor),0) FROM terms_versions`).Scan(&major, &minor)
        minor = minor + 1
        code := fmt.Sprintf("v%d.%d", major, minor)
        var eff sql.NullTime
        if t, err := time.Parse(time.RFC3339, strings.TrimSpace(body.EffectiveDate)); err == nil { eff.Time = t; eff.Valid = true }
        var uid int
        sub, _ := r.Context().Value(ctxSub).(string)
        _ = db.QueryRow(`SELECT id FROM users WHERE LOWER(email)=LOWER($1)`, sub).Scan(&uid)
        var id int
        _ = db.QueryRow(`INSERT INTO terms_versions (major, minor, version_code, status, effective_date, version_notes, content, created_by) VALUES ($1,$2,$3,'draft',$4,$5,$6,$7) RETURNING id`, major, minor, code, eff, body.VersionNotes, body.Content, uid).Scan(&id)
        writeJSON(w, 201, map[string]any{"id": id, "version_code": code})
    })))
    authMux.Handle("/admin/terms/publish", requireRole("super_admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body struct{ ID int `json:"id"` }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID <= 0 { writeError(w, 400, "invalid_json"); return }
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        _, _ = db.Exec(`UPDATE terms_versions SET status='archived' WHERE status='active'`)
        _, _ = db.Exec(`UPDATE terms_versions SET status='active', published_at=NOW() WHERE id=$1`, body.ID)
        writeJSON(w, 200, map[string]any{"success": true})
    })))
    authMux.HandleFunc("/terms/agreement-status", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet { writeError(w, 405, "method_not_allowed"); return }
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        var tid int
        if idStr := r.URL.Query().Get("terms_id"); idStr != "" { tid = atoi(idStr) } else { _ = db.QueryRow(`SELECT id FROM terms_versions WHERE status='active' ORDER BY published_at DESC NULLS LAST, id DESC LIMIT 1`).Scan(&tid) }
        sub, _ := r.Context().Value(ctxSub).(string)
        var uid int; _ = db.QueryRow(`SELECT id FROM users WHERE LOWER(email)=LOWER($1)`, sub).Scan(&uid)
        var cnt int; _ = db.QueryRow(`SELECT COUNT(1) FROM user_terms_agreements WHERE user_id=$1 AND terms_version_id=$2`, uid, tid).Scan(&cnt)
        writeJSON(w, 200, map[string]any{"agreed": cnt > 0, "terms_id": tid})
    })
    authMux.HandleFunc("/terms/agree", func(w http.ResponseWriter, r *http.Request) {
        role, _ := r.Context().Value(ctxRole).(string)
        if role == "" { writeError(w, http.StatusUnauthorized, "unauthorized"); return }
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body struct{ TermsID int `json:"terms_id"` }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.TermsID <= 0 { writeError(w, 400, "invalid_json"); return }
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        sub, _ := r.Context().Value(ctxSub).(string)
        var uid int; _ = db.QueryRow(`SELECT id FROM users WHERE LOWER(email)=LOWER($1)`, sub).Scan(&uid)
        _, _ = db.Exec(`INSERT INTO user_terms_agreements (user_id, terms_version_id) VALUES ($1,$2) ON CONFLICT (user_id, terms_version_id) DO NOTHING`, uid, body.TermsID)
        writeJSON(w, 200, map[string]any{"success": true})
    })
    // create user by admin/super_admin
    authMux.HandleFunc("/auth/users/create", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        roleActor, _ := r.Context().Value(ctxRole).(string)
        var body map[string]string
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil { writeError(w, 400, "invalid_json"); return }
        email := strings.TrimSpace(body["email"])
        password := strings.TrimSpace(body["password"])
        roleCode := strings.TrimSpace(body["role_code"]) // admin|outlet|kasir
        outletIDStr := strings.TrimSpace(body["outlet_id"]) // optional
        if email == "" || password == "" || roleCode == "" { writeError(w, 400, "missing_fields"); return }
        // permission gate
        if roleCode == "admin" && roleActor != "super_admin" { writeError(w, http.StatusForbidden, "forbidden"); return }
        if (roleCode == "outlet" || roleCode == "kasir") && !(roleActor == "super_admin" || roleActor == "admin") { writeError(w, http.StatusForbidden, "forbidden"); return }
        db := func() *sql.DB { d, _ := NewDB(); return d }()
        if db == nil { writeError(w, 500, "db_unavailable"); return }
        defer db.Close()
        var exists int
        _ = db.QueryRow(`SELECT COUNT(1) FROM users WHERE LOWER(email)=LOWER($1)`, email).Scan(&exists)
        if exists > 0 { writeError(w, 409, "email_exists"); return }
        var roleID int
        _ = db.QueryRow(`SELECT id FROM roles WHERE code=$1`, roleCode).Scan(&roleID)
        if roleID == 0 { writeError(w, 400, "invalid_role"); return }
        salt := genSalt(); pepper := envString("PASSWORD_PEPPER", ""); hash := hashPassword(password, salt, pepper)
        var outletID any
        if outletIDStr != "" { outletID = atoi(outletIDStr) } else { outletID = nil }
        _, err := db.Exec(`INSERT INTO users (email, password_hash, password_salt, role_id, outlet_id, is_verified) VALUES ($1,$2,$3,$4,$5,true)`, email, hash, salt, roleID, outletID)
        if err != nil { writeError(w, 500, "create_failed"); return }
        writeJSON(w, 201, map[string]any{"success": true})
    })
    authMux.HandleFunc("/booking", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost { writeError(w, 405, "method_not_allowed"); return }
        var body map[string]string
        json.NewDecoder(r.Body).Decode(&body)
        user := strings.TrimSpace(body["user_name"])
        outlet := strings.TrimSpace(body["outlet_name"])
        v, _ := s.CreateBooking(r.Context(), user, outlet)
        writeJSON(w, 201, v)
    })
    authMux.HandleFunc("/payment/confirm", func(w http.ResponseWriter, r *http.Request) {
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
        if tid := strings.TrimSpace(body["transaction_id"]); tid != "" {
            db := func() *sql.DB { d, _ := NewDB(); return d }()
            if db == nil { writeError(w, 500, "db_unavailable"); return }
            defer db.Close()
            st := strings.ToLower(strings.TrimSpace(body["status"]))
            switch st {
            case "success":
                _, _ = db.Exec(`UPDATE transactions SET status='paid', updated_at=NOW() WHERE id=$1`, atoi(tid))
            case "failed":
                _, _ = db.Exec(`UPDATE transactions SET status='failed', updated_at=NOW() WHERE id=$1`, atoi(tid))
            default:
                _, _ = db.Exec(`UPDATE transactions SET status='pending', updated_at=NOW() WHERE id=$1`, atoi(tid))
            }
            _, _ = db.Exec(`INSERT INTO payment_logs (transaction_id, gateway, status, raw) VALUES ($1,$2,$3,$4)`, atoi(tid), "mock", st, string(raw))
            _, _ = db.Exec(`INSERT INTO transaction_logs (transaction_id, activity) VALUES ($1,$2)`, atoi(tid), "webhook:"+st)
            hub.Broadcast(map[string]any{"type": "TRANSACTION_STATUS", "transaction_id": tid, "status": st})
            writeJSON(w, 200, map[string]any{"success": true}); return
        }
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
    
    // Handle auth routes that require authentication but no CSRF
    authHandler := requireAuth(withCORS(withRateLimit(withLogging(authMux))))
    
    // Create a final handler that routes between public and protected
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Println("DEBUG RAW PATH:", r.URL.Path)

        if r.Method == http.MethodOptions {
            withCORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.WriteHeader(http.StatusNoContent)
            })).ServeHTTP(w, r)
            return
        }

        // Handle public routes directly (no middleware)
        if r.URL.Path == "/socket-test" {
            w.Header().Set("Content-Type", "application/json")
            w.Header().Set("Access-Control-Allow-Origin", "*")
            w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
            w.Header().Set("Access-Control-Allow-Credentials", "true")
            w.WriteHeader(200)
            json.NewEncoder(w).Encode(map[string]string{
                "message": "WebSocket server is running",
                "path": "/socket.io/",
                "port": "3002",
                "status": "active",
            })
            return
        }
        
        if strings.HasPrefix(r.URL.Path, "/socket.io/") {
            l := jsonLogger{}
            l.Println(map[string]any{
                "event": "socket_request_received",
                "method": r.Method,
                "path": r.URL.Path,
                "query": r.URL.RawQuery,
                "user_agent": r.Header.Get("User-Agent"),
            })
            
            // Debug: Check if socketIOSrv is nil
            if socketIOSrv == nil {
                l.Println(map[string]any{
                    "event": "socket_server_is_nil_in_handler",
                    "error": "socketIOSrv is nil when handling request",
                })
                w.WriteHeader(500)
                json.NewEncoder(w).Encode(map[string]string{"error": "Socket.IO server is nil"})
                return
            }
            
            l.Println(map[string]any{
                "event": "socket_server_about_to_serve",
                "message": "About to call WebSocket handler",
            })
            
            withLogging(withCORS(socketIOSrv)).ServeHTTP(w, r)
            
            l.Println(map[string]any{
                "event": "socket_server_serve_completed",
                "message": "WebSocket handler completed",
            })
            return
        }
        
        // Health check endpoint - no auth required
        if r.URL.Path == "/healthz" {
            writeJSON(w, 200, map[string]string{"ok": "true"})
            return
        }
        
        // Route public endpoints
        if r.URL.Path == "/api/booth/register" || r.URL.Path == "/terms" {
            publicHandler.ServeHTTP(w, r)
            return
        }
        
        // Route auth endpoints (bookings, outlets, booths, admin-users)
        if strings.HasPrefix(r.URL.Path, "/bookings") || strings.HasPrefix(r.URL.Path, "/outlets") || strings.HasPrefix(r.URL.Path, "/booths") || strings.HasPrefix(r.URL.Path, "/admin-users") {
            authHandler.ServeHTTP(w, r)
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
