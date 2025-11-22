package backend

import (
    "database/sql"
    "sync"
    "time"
)

type boothInfo struct {
    ID string
    Name string
    Location string
    OutletID string
    ConnectedAt time.Time
}

type boothHub struct { mu sync.Mutex; booths map[string]boothInfo; db *sql.DB }

func newBoothHub(db *sql.DB) *boothHub { return &boothHub{ booths: map[string]boothInfo{}, db: db } }

func (h *boothHub) register(info boothInfo) { h.mu.Lock(); h.booths[info.ID] = info; h.mu.Unlock() }
func (h *boothHub) unregister(id string) { h.mu.Lock(); delete(h.booths, id); h.mu.Unlock() }
func (h *boothHub) list() []boothInfo { h.mu.Lock(); defer h.mu.Unlock(); out := make([]boothInfo, 0, len(h.booths)); for _, v := range h.booths { out = append(out, v) }; return out }

func (h *boothHub) upsertDB(socketID, name, location, outletCode string, outletID int) {
    if h.db == nil { return }
    q := `INSERT INTO booths (socket_id, name, location, outlet_code, outlet_id, connected, connected_at, last_seen_at)
VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
ON CONFLICT (socket_id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  outlet_code = EXCLUDED.outlet_code,
  outlet_id = EXCLUDED.outlet_id,
  connected = TRUE,
  last_seen_at = NOW()`
    _, _ = h.db.Exec(q, socketID, name, location, outletCode, outletID)
}

func (h *boothHub) markDisconnected(socketID string) {
    if h.db == nil { return }
    q := `UPDATE booths SET connected = FALSE, last_seen_at = NOW() WHERE socket_id = $1`
    _, _ = h.db.Exec(q, socketID)
}

func (h *boothHub) listDB() []map[string]any {
    if h.db == nil { return []map[string]any{} }
    rows, err := h.db.Query(`SELECT id, socket_id, name, location, outlet_code, outlet_id, connected, connected_at, last_seen_at FROM booths ORDER BY connected DESC, connected_at DESC`)
    if err != nil { return []map[string]any{} }
    defer rows.Close()
    out := []map[string]any{}
    for rows.Next() {
        var id, outletID int; var sid, name, loc, code string; var connected bool; var ca, ls time.Time
        _ = rows.Scan(&id, &sid, &name, &loc, &code, &outletID, &connected, &ca, &ls)
        out = append(out, map[string]any{"id": id, "socket_id": sid, "name": name, "location": loc, "outlet_code": code, "outlet_id": outletID, "connected": connected, "connected_at": ca, "last_seen_at": ls})
    }
    return out
}

func (h *boothHub) resolveOutletID(code string) int {
    if h.db == nil { return 0 }
    // try as integer id first
    var oid int
    // numeric parse attempt
    // if numeric string provided, use it directly
    var tryNumeric bool
    if len(code) > 0 {
        tryNumeric = true
        for i := 0; i < len(code); i++ { if code[i] < '0' || code[i] > '9' { tryNumeric = false; break } }
    }
    if tryNumeric {
        // verify exists
        _ = h.db.QueryRow(`SELECT id FROM outlets WHERE id = $1`, code).Scan(&oid)
        if oid > 0 { return oid }
    }
    // fallback: match by code column if exists
    _ = h.db.QueryRow(`SELECT id FROM outlets WHERE code = $1`, code).Scan(&oid)
    if oid > 0 { return oid }
    // fallback: match by name case-insensitive
    _ = h.db.QueryRow(`SELECT id FROM outlets WHERE LOWER(name) = LOWER($1)`, code).Scan(&oid)
    return oid
}