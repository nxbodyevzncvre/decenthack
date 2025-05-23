package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/qwaq-dev/decenthack/internal/config"
	"github.com/qwaq-dev/decenthack/internal/handlers"
	"github.com/qwaq-dev/decenthack/internal/repository"
	"github.com/qwaq-dev/decenthack/pkg/jwt/middleware"
)

func InitRoutes(
	app *fiber.App,
	cfg *config.Config,
	pilotRepo repository.PilotRepository,
	droneRepo repository.DroneRepository,
	applicationRepo repository.ApplicationRepository,
	routesRepo repository.RoutesRepository,
	zonesRepo repository.ZonesRepository,
) {
	authorizedGroup := app.Group("/auth")
	authorizedGroup.Use(middleware.JWTMiddleware(cfg.JWTSecretKey))

	pilot := app.Group("/pilot")
	drone := authorizedGroup.Group("/drone")
	application := authorizedGroup.Group("/application")
	routes := authorizedGroup.Group("/routes")
	zones := authorizedGroup.Group("/zones")

	droneHandler := handlers.NewDroneHandler(droneRepo, *cfg)
	pilotHandler := handlers.NewPilotHandler(pilotRepo, *cfg)
	applicationHandler := handlers.NewApplicationHandler(applicationRepo, *cfg)
	routesHandler := handlers.NewRoutesHandler(routesRepo, *cfg)
	zonesHandler := handlers.NewZonesHandler(zonesRepo, *cfg)

	pilot.Post("/sign-in", pilotHandler.SignIn)
	pilot.Post("/sign-up", pilotHandler.SignUp)

	drone.Post("/create", droneHandler.CreateDrone)
	drone.Post("/pilot/:id", pilotHandler.PilotById)
	drone.Get("/drone/:id", droneHandler.DroneById)
	drone.Get("/drones", droneHandler.AllDrones)
	drone.Delete("/delete/:id", droneHandler.DeleteDrone)

	application.Post("/create", applicationHandler.CreateApplication)
	application.Delete("/delete/:id", applicationHandler.DeleteApplication)
	application.Get("/status", applicationHandler.ApplicationStatus)

	routes.Post("/create", routesHandler.CreateRoute)

	zones.Post("/create", zonesHandler.CreateZone)
}
