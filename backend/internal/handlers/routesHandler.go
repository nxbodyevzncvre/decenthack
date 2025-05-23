package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/qwaq-dev/decenthack/internal/config"
	"github.com/qwaq-dev/decenthack/internal/repository"
)

type RoutesHandler struct {
	repo repository.RoutesRepository
	cfg  config.Config
}

func NewRoutesHandler(repo repository.RoutesRepository, cfg config.Config) *RoutesHandler {
	return &RoutesHandler{repo: repo, cfg: cfg}
}

func (r *RoutesHandler) CreateRoute(c *fiber.Ctx) error {
	return nil
}
