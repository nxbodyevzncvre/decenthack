package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	fiberLog "github.com/gofiber/fiber/v2/log"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/websocket/v2"
	"github.com/nxbodyevzncvre/decenthack/internal/config"
	"github.com/nxbodyevzncvre/decenthack/internal/repository"
	"github.com/nxbodyevzncvre/decenthack/internal/routes"
	"github.com/nxbodyevzncvre/decenthack/internal/server"
	ws "github.com/nxbodyevzncvre/decenthack/internal/websocket"
	"github.com/nxbodyevzncvre/decenthack/pkg/logger/sl"
)

func main() {
	app := fiber.New()
	cfg := config.MustLoad()
	db, err := repository.InitDataBase(cfg.Database)

	if err != nil {
		fiberLog.Error("Error with connecting to db", sl.Err(err))
	}

	wsHub := ws.NewHub()
	go wsHub.Run()

	go func() {
		log.Println("🚀 Starting gRPC server on port 1234...")
		if err := server.StartGRPCServer(wsHub, "1234"); err != nil {
			log.Fatalf("Failed to start gRPC server: %v", err)
		}
	}()

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))

	droneRepo := &repository.DroneRepository{DB: db}
	pilotRepo := &repository.PilotRepository{DB: db}
	applicationRepo := &repository.ApplicationRepository{DB: db}
	zonesRepo := &repository.ZonesRepository{DB: db}

	app.Use("/ws", ws.WebSocketUpgrade)
	app.Get("/ws", websocket.New(wsHub.HandleWebSocket))

	routes.InitRoutes(app, cfg, *pilotRepo, *droneRepo, *applicationRepo, *zonesRepo)

	log.Println("Server starting...")
	log.Printf("HTTP API on %s", cfg.Port)
	log.Println("gRPC server on :1234")
	log.Println("WebSocket endpoint: /ws")

	err = app.Listen(cfg.Port)
	if err != nil {
		fiberLog.Error(err)
	}
}
