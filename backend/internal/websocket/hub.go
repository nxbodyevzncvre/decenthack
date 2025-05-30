package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

type Hub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mutex      sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case conn := <-h.register:
			h.mutex.Lock()
			h.clients[conn] = true
			h.mutex.Unlock()

			welcomeMsg := map[string]interface{}{
				"type":      "connection",
				"message":   "WebSocket connected successfully",
				"timestamp": time.Now(),
				"clients":   len(h.clients),
			}
			if data, err := json.Marshal(welcomeMsg); err == nil {
				conn.WriteMessage(websocket.TextMessage, data)
			}

			log.Printf("WebSocket client connected. Total clients: %d", len(h.clients))

		case conn := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[conn]; ok {
				delete(h.clients, conn)
				conn.Close()
			}
			h.mutex.Unlock()
			log.Printf("WebSocket client disconnected. Total clients: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mutex.RLock()
			for conn := range h.clients {
				err := conn.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Printf("Error writing to WebSocket: %v", err)
					delete(h.clients, conn)
					conn.Close()
				}
			}
			h.mutex.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(message []byte) {
	select {
	case h.broadcast <- message:
	default:
		log.Println("Broadcast channel is full, dropping message")
	}
}

func (h *Hub) BroadcastJSON(data interface{}) error {
	message, err := json.Marshal(data)
	if err != nil {
		return err
	}
	h.Broadcast(message)
	return nil
}

func (h *Hub) HandleWebSocket(c *websocket.Conn) {
	remoteAddr := c.RemoteAddr().String()
	log.Printf("New WebSocket connection from %s", remoteAddr)

	h.register <- c

	defer func() {
		log.Printf("Closing WebSocket connection from %s", remoteAddr)
		h.unregister <- c
	}()

	for {
		messageType, message, err := c.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error from %s: %v", remoteAddr, err)
			} else {
				log.Printf("WebSocket connection closed normally from %s", remoteAddr)
			}
			break
		}

		if messageType == websocket.TextMessage {
			log.Printf("Received message from %s: %s", remoteAddr, string(message))
		}

		if messageType == websocket.PingMessage {
			c.WriteMessage(websocket.PongMessage, nil)
		}
	}
}

func WebSocketUpgrade(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		c.Locals("allowed", true)
		return c.Next()
	}
	return fiber.ErrUpgradeRequired
}
