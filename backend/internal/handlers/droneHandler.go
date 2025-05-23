package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/qwaq-dev/decenthack/internal/config"
	"github.com/qwaq-dev/decenthack/internal/repository"
)

type DroneHandler struct {
	repo repository.DroneRepository
	cfg  config.Config
}

func NewDroneHandler(repo repository.DroneRepository, cfg config.Config) *DroneHandler {
	return &DroneHandler{repo: repo, cfg: cfg}
}

func (d *DroneHandler) CreateDrone(c *fiber.Ctx) error {
	return nil
}

func (d *DroneHandler) DeleteDrone(c *fiber.Ctx) error {
	return nil
}

func (d *DroneHandler) DroneById(c *fiber.Ctx) error {
	return nil
}
