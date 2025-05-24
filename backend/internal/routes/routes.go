package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nxbodyevzncvre/decenthack/internal/config"
	"github.com/nxbodyevzncvre/decenthack/internal/handlers"
	"github.com/nxbodyevzncvre/decenthack/internal/repository"
	"github.com/nxbodyevzncvre/decenthack/pkg/jwt/middleware"
)

func InitRoutes(
	app *fiber.App,
	cfg *config.Config,
	pilotRepo repository.PilotRepository,
	droneRepo repository.DroneRepository,
	applicationRepo repository.ApplicationRepository,
	zonesRepo repository.ZonesRepository,
) {
	authorizedGroup := app.Group("/auth")
	authorizedGroup.Use(middleware.JWTMiddleware(cfg.JWTSecretKey))

	pilot := app.Group("/pilot")
	drone := authorizedGroup.Group("/drone")
	application := authorizedGroup.Group("/application")
	zones := authorizedGroup.Group("/zones")

	droneHandler := handlers.NewDroneHandler(droneRepo, *cfg)
	pilotHandler := handlers.NewPilotHandler(pilotRepo, *cfg)
	applicationHandler := handlers.NewApplicationHandler(applicationRepo, *cfg)
	zonesHandler := handlers.NewZonesHandler(zonesRepo, *cfg)

	pilot.Post("/sign-in", pilotHandler.SignIn)
	pilot.Post("/sign-up", pilotHandler.SignUp)

	drone.Post("/create", droneHandler.CreateDrone)
	drone.Get("/pilot", pilotHandler.PilotById)
	drone.Get("/drone/:id", droneHandler.DroneById)
	drone.Get("/drones", droneHandler.AllDrones)
	drone.Delete("/delete/:id", droneHandler.DeleteDrone)

	application.Post("/create", applicationHandler.CreateApplication)
	application.Delete("/delete/:id", applicationHandler.DeleteApplication)
	application.Get("/status", applicationHandler.ApplicationStatus)
	application.Get("/applications", applicationHandler.AllApplications)

	zones.Post("/create", zonesHandler.CreateZone)
	zones.Get("/", zonesHandler.AllZones)
	zones.Delete("/delete/:id", zonesHandler.DeleteZone)

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"services": fiber.Map{
				"http":      "running",
				"grpc":      "running",
				"websocket": "running",
			},
		})
	})
}
