package backend

import (
    socketio "github.com/googollee/go-socket.io"
    "strings"
    "time"
)

type boothRegister struct { Name string `json:"name"`; Location string `json:"location"`; OutletID string `json:"outlet_id"` }

func newSocketIOServer(booths *boothHub, hub *hub) (*socketio.Server, error) {
    srv := socketio.NewServer(nil)
    srv.OnConnect("/", func(s socketio.Conn) error { s.SetContext(""); return nil })
    srv.OnEvent("/", "register", func(s socketio.Conn, p boothRegister) {
        info := boothInfo{ ID: s.ID(), Name: strings.TrimSpace(p.Name), Location: strings.TrimSpace(p.Location), OutletID: strings.TrimSpace(p.OutletID), ConnectedAt: time.Now() }
        booths.register(info)
        hub.Broadcast(map[string]any{"type":"BOOTH_CONNECTED","booth_id":info.ID,"name":info.Name,"outlet_id":info.OutletID})
    })
    srv.OnDisconnect("/", func(s socketio.Conn, reason string) {
        booths.unregister(s.ID())
        hub.Broadcast(map[string]any{"type":"BOOTH_DISCONNECTED","booth_id":s.ID()})
    })
    return srv, nil
}