package backend

import (
	"fmt"
	"strings"
	"time"

	socketio "github.com/googollee/go-socket.io"
)

type boothRegister struct { Name string `json:"name"`; Location string `json:"location"`; OutletID string `json:"outlet_id"` }

func newSocketIOServer(booths *boothHub, hub *hub) (*socketio.Server, error) {
    srv := socketio.NewServer(nil)
    
    srv.OnConnect("/", func(s socketio.Conn) error {
        s.SetContext("")
        // Log koneksi untuk debugging
        fmt.Printf("Client connected: %s\n", s.ID())
        return nil
    })
    
    srv.OnEvent("/", "register", func(s socketio.Conn, p boothRegister) {
        info := boothInfo{
            ID: s.ID(),
            Name: strings.TrimSpace(p.Name),
            Location: strings.TrimSpace(p.Location),
            OutletID: strings.TrimSpace(p.OutletID),
            ConnectedAt: time.Now(),
        }
        booths.register(info)
        oid := booths.resolveOutletID(info.OutletID)
        booths.upsertDB(s.ID(), info.Name, info.Location, info.OutletID, oid)
        hub.Broadcast(map[string]any{
            "type":"BOOTH_CONNECTED",
            "booth_id":info.ID,
            "name":info.Name,
            "outlet_id":info.OutletID,
        })
        
        // Kirim konfirmasi ke client
        s.Emit("registered", map[string]any{
            "success": true,
            "message": "Registration successful",
            "booth_id": info.ID,
        })
        
        fmt.Printf("Booth registered: %s, Name: %s, Location: %s\n", info.ID, info.Name, info.Location)
    })
    
    srv.OnDisconnect("/", func(s socketio.Conn, reason string) {
        fmt.Printf("Client disconnected: %s, reason: %s\n", s.ID(), reason)
        booths.unregister(s.ID())
        booths.markDisconnected(s.ID())
        hub.Broadcast(map[string]any{
            "type":"BOOTH_DISCONNECTED",
            "booth_id":s.ID(),
        })
    })
    
    return srv, nil
}