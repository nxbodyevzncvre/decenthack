package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/qwaq-dev/decenthack/internal/config"
	"github.com/qwaq-dev/decenthack/internal/repository"
)

type ApplicationHandler struct {
	repo repository.ApplicationRepository
	cfg  config.Config
}

func NewApplicationHandler(repo repository.ApplicationRepository, cfg config.Config) *ApplicationHandler {
	return &ApplicationHandler{repo: repo, cfg: cfg}
}

func (a *ApplicationHandler) CreateApplication(c *fiber.Ctx) error {
	return nil
}

func (a *ApplicationHandler) DeleteApplication(c *fiber.Ctx) error {
	return nil
}

func (a *ApplicationHandler) ApplicationStatus(c *fiber.Ctx) error {
	return nil
}
