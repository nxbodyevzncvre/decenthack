package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/qwaq-dev/decenthack/internal/config"
	"github.com/qwaq-dev/decenthack/internal/repository"
)

type ZonesHandler struct {
	repo repository.ZonesRepository
	cfg  config.Config
}

func NewZonesHandler(repo repository.ZonesRepository, cfg config.Config) *ZonesHandler {
	return &ZonesHandler{repo: repo, cfg: cfg}
}

func (r *ZonesHandler) CreateZone(c *fiber.Ctx) error {
	return nil
}
