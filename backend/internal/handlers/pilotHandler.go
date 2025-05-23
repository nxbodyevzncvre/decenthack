package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/qwaq-dev/decenthack/internal/config"
	"github.com/qwaq-dev/decenthack/internal/repository"
)

type PilotHandler struct {
	repo repository.PilotRepository
	cfg  config.Config
}

func NewPilotHandler(repo repository.PilotRepository, cfg config.Config) *PilotHandler {
	return &PilotHandler{repo: repo, cfg: cfg}
}

func (p *PilotHandler) SignIn(c *fiber.Ctx) error {
	return nil
}

func (p *PilotHandler) SignUp(c *fiber.Ctx) error {
	return nil
}

func (p *PilotHandler) AllPilots(c *fiber.Ctx) error {
	return nil
}

func (p *PilotHandler) PilotById(c *fiber.Ctx) error {
	return nil
}
