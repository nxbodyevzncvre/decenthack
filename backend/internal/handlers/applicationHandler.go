package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/log"
	"github.com/nxbodyevzncvre/decenthack/internal/config"
	"github.com/nxbodyevzncvre/decenthack/internal/repository"
	"github.com/nxbodyevzncvre/decenthack/internal/structures"
)

type ApplicationHandler struct {
	repo repository.ApplicationRepository
	cfg  config.Config
}

func NewApplicationHandler(repo repository.ApplicationRepository, cfg config.Config) *ApplicationHandler {
	return &ApplicationHandler{repo: repo, cfg: cfg}
}

func (a *ApplicationHandler) CreateApplication(c *fiber.Ctx) error {
	pilotId, _ := c.Locals("userId").(int)

	var req structures.CreateApplicationRequest
	if err := c.BodyParser(&req); err != nil {
		log.Error(err)
		return c.Status(500).JSON(fiber.Map{"error": "Error parsing body"})
	}

	req.PilotId = pilotId

	err := a.repo.CreateApplication(req)
	if err != nil {
		log.Error(err)
		return c.Status(500).JSON(fiber.Map{"error": "Error with creating application"})
	}

	return c.Status(200).JSON(fiber.Map{"success": "application has been uploaded"})
}

func (a *ApplicationHandler) DeleteApplication(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))

	err := a.repo.DeleteApplication(id)
	if err != nil {
		log.Error(err)
		return c.Status(500).JSON(fiber.Map{"error": "Error with deleting application"})
	}

	return c.Status(200).JSON(fiber.Map{"success": "Application deleted successfully"})
}

func (a *ApplicationHandler) ApplicationStatus(c *fiber.Ctx) error {
	return nil
}

func (a *ApplicationHandler) AllApplications(c *fiber.Ctx) error {
	pilotId, _ := c.Locals("userId").(int)

	applications, err := a.repo.AllPilotsAplications(pilotId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with getting all applications"})
	}

	return c.Status(200).JSON(fiber.Map{"applications": applications})
}
