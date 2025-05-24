package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/log"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/nxbodyevzncvre/decenthack/internal/config"
	"github.com/nxbodyevzncvre/decenthack/internal/grpcserver"
	"github.com/nxbodyevzncvre/decenthack/internal/repository"
	"github.com/nxbodyevzncvre/decenthack/internal/routes"
	"github.com/nxbodyevzncvre/decenthack/pkg/logger/sl"
)

func main() {
	app := fiber.New()
	cfg := config.MustLoad()
	db, err := repository.InitDataBase(cfg.Database)

	store := grpcserver.NewDroneCoordinatesStore()

	go grpcserver.StartGRPCServer(store)

	if err != nil {
		log.Error("Error with connecting to db", sl.Err(err))
	}

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

	routes.InitRoutes(app, cfg, *pilotRepo, *droneRepo, *applicationRepo, *zonesRepo)

	go func() {
		err = app.Listen(cfg.Port)
		if err != nil {
			log.Error(err)
		}
	}()

	select {}
}
