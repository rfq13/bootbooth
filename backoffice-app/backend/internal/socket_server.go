package backend

import (
	"strings"
	"time"

	socketio "github.com/googollee/go-socket.io"
)

type boothRegister struct { Name string `json:"name"`; Location string `json:"location"`; OutletID string `json:"outlet_id"` }

func newSocketIOServer(booths *boothHub, hub *hub) (*socketio.Server, error) {
    srv := socketio.NewServer(nil)
    
    // Log server start
    l := jsonLogger{}
    l.Println(map[string]any{
        "event": "socket_server_started",
        "message": "Socket.IO server initialized",
    })
    
    srv.OnConnect("/", func(s socketio.Conn) error {
        if s == nil {
            l.Println(map[string]any{
                "event": "socket_connect_error",
                "error": "socket connection is nil",
            })
            return nil
        }
        s.SetContext("")
        // Log koneksi untuk debugging
        l.Println(map[string]any{
            "event": "socket_client_connected",
            "socket_id": s.ID(),
            "remote_addr": s.RemoteAddr().String(),
            "url": s.URL(),
        })
        
        // Send immediate acknowledgment to prevent timeout
        s.Emit("connected", map[string]any{
            "message": "Connection established",
            "socket_id": s.ID(),
        })
        
        l.Println(map[string]any{
            "event": "socket_ack_sent",
            "socket_id": s.ID(),
        })
        
        return nil
    })
    
    srv.OnError("/", func(s socketio.Conn, e error) {
        socketID := "unknown"
        if s != nil {
            socketID = s.ID()
        }
        l.Println(map[string]any{
            "event": "socket_error",
            "socket_id": socketID,
            "error": e.Error(),
        })
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
        
        l := jsonLogger{}
        l.Println(map[string]any{
            "event": "booth_registered",
            "socket_id": info.ID,
            "booth_name": info.Name,
            "location": info.Location,
            "outlet_id": info.OutletID,
        })
    })
    
    srv.OnDisconnect("/", func(s socketio.Conn, reason string) {
        l := jsonLogger{}
        socketID := "unknown"
        if s != nil {
            socketID = s.ID()
            booths.unregister(socketID)
            booths.markDisconnected(socketID)
        }
        l.Println(map[string]any{
            "event": "socket_client_disconnected",
            "socket_id": socketID,
            "reason": reason,
        })
        if s != nil {
            hub.Broadcast(map[string]any{
                "type":"BOOTH_DISCONNECTED",
                "booth_id":socketID,
            })
        }
    })
    
    return srv, nil
}