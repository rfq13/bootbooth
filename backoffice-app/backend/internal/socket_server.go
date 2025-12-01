package backend

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type boothRegister struct {
	Name     string `json:"name"`
	Location string `json:"location"`
	OutletID string `json:"outlet_id"`
}

// Socket.IO message types
type socketMessage struct {
	Type    string      `json:"type,omitempty"`
	Event   string      `json:"event,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	ID      int         `json:"id,omitempty"`
	Nsp     string      `json:"nsp,omitempty"`
	Ack     bool        `json:"ack,omitempty"`
}

type socketClient struct {
	conn        *websocket.Conn
	id          string
	boothInfo   *boothInfo
	send        chan socketMessage
	hub         *websocketHub
	mu          sync.Mutex
}

type websocketHub struct {
	clients    map[string]*socketClient
	register   chan *socketClient
	unregister chan *socketClient
	broadcast  chan socketMessage
	booths     *boothHub
	hub        *hub
	mu         sync.RWMutex
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

func newWebSocketHub(booths *boothHub, hub *hub) *websocketHub {
	return &websocketHub{
		clients:    make(map[string]*socketClient),
		register:   make(chan *socketClient),
		unregister: make(chan *socketClient),
		broadcast:  make(chan socketMessage),
		booths:     booths,
		hub:        hub,
	}
}

func (h *websocketHub) run() {
	l := jsonLogger{}
	l.Println(map[string]any{
		"event": "websocket_hub_started",
		"message": "WebSocket hub started",
	})

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.id] = client
			h.mu.Unlock()
			
			l.Println(map[string]any{
				"event": "socket_client_connected",
				"socket_id": client.id,
			})

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.id]; ok {
				delete(h.clients, client.id)
				close(client.send)
				
				// Handle booth disconnection
				if client.boothInfo != nil {
					h.booths.unregister(client.id)
					h.booths.markDisconnected(client.id)
					
					h.hub.Broadcast(map[string]any{
						"type": "BOOTH_DISCONNECTED",
						"booth_id": client.id,
					})
					
					l.Println(map[string]any{
						"event": "socket_client_disconnected",
						"socket_id": client.id,
						"reason": "websocket disconnected",
					})
				}
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for _, client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client.id)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (c *socketClient) readPump() {
	l := jsonLogger{}
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512 * 1024) // 512KB
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				l.Println(map[string]any{
					"event": "socket_error",
					"socket_id": c.id,
					"error": err.Error(),
				})
			}
			break
		}

		// Parse Socket.IO message
		var msg socketMessage
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			l.Println(map[string]any{
				"event": "socket_message_parse_error",
				"socket_id": c.id,
				"error": err.Error(),
			})
			continue
		}

		c.handleMessage(msg)
	}
}

func (c *socketClient) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteJSON(message); err != nil {
				l := jsonLogger{}
				l.Println(map[string]any{
					"event": "socket_write_error",
					"socket_id": c.id,
					"error": err.Error(),
				})
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *socketClient) handleMessage(msg socketMessage) {
	l := jsonLogger{}
	
	switch msg.Event {
	case "register":
		if data, ok := msg.Data.(map[string]interface{}); ok {
			var p boothRegister
			if name, ok := data["name"].(string); ok {
				p.Name = name
			}
			if location, ok := data["location"].(string); ok {
				p.Location = location
			}
			if outletID, ok := data["outlet_id"].(string); ok {
				p.OutletID = outletID
			}

			info := boothInfo{
				ID:          c.id,
				Name:        strings.TrimSpace(p.Name),
				Location:    strings.TrimSpace(p.Location),
				OutletID:    strings.TrimSpace(p.OutletID),
				ConnectedAt: time.Now(),
			}
			
			c.boothInfo = &info
			c.hub.booths.register(info)
			oid := c.hub.booths.resolveOutletID(info.OutletID)
			c.hub.booths.upsertDB(c.id, info.Name, info.Location, info.OutletID, oid)
			c.hub.hub.Broadcast(map[string]any{
				"type":     "BOOTH_CONNECTED",
				"booth_id": info.ID,
				"name":     info.Name,
				"outlet_id": info.OutletID,
			})

			// Send registration confirmation
			c.send <- socketMessage{
				Event: "registered",
				Data: map[string]any{
					"success":   true,
					"message":   "Registration successful",
					"booth_id":  info.ID,
				},
			}

			l.Println(map[string]any{
				"event":      "booth_registered",
				"socket_id":  info.ID,
				"booth_name": info.Name,
				"location":   info.Location,
				"outlet_id":  info.OutletID,
			})
		}
	}
}

func newSocketIOServer(booths *boothHub, hub *hub) (*websocketHub, error) {
	l := jsonLogger{}
	l.Println(map[string]any{
		"event": "socket_server_started",
		"message": "WebSocket server initialized",
	})

	wsHub := newWebSocketHub(booths, hub)
	go wsHub.run()

	return wsHub, nil
}

func (h *websocketHub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	l := jsonLogger{}
	l.Println(map[string]any{
		"event": "socket_request_received",
		"method": r.Method,
		"path": r.URL.Path,
		"query": r.URL.RawQuery,
		"user_agent": r.Header.Get("User-Agent"),
	})

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		l.Println(map[string]any{
			"event": "websocket_upgrade_error",
			"error": err.Error(),
		})
		return
	}

	// Generate unique client ID
	clientID := generateSocketID()
	
	client := &socketClient{
		conn: conn,
		id:   clientID,
		hub:  h,
		send: make(chan socketMessage, 256),
	}

	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in new goroutines
	go client.writePump()
	go client.readPump()
}

func generateSocketID() string {
	return newUUID()
}