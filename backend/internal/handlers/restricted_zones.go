package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/log"
	"github.com/nxbodyevzncvre/decenthack/internal/config"
	"github.com/nxbodyevzncvre/decenthack/internal/repository"
	"github.com/nxbodyevzncvre/decenthack/internal/structures"
)

type ZonesHandler struct {
	repo repository.ZonesRepository
	cfg  config.Config
}

func NewZonesHandler(repo repository.ZonesRepository, cfg config.Config) *ZonesHandler {
	return &ZonesHandler{repo: repo, cfg: cfg}
}

func (z *ZonesHandler) CreateZone(c *fiber.Ctx) error {
	zone := new(structures.RestrictedZone)

	if err := c.BodyParser(zone); err != nil {
		log.Error(err)
		return c.Status(500).JSON(fiber.Map{"error": "Error with parsing body"})
	}

	err := z.repo.InsertZone(zone)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with inserting zone"})
	}

	return c.Status(200).JSON(fiber.Map{"zone": zone})
}

func (z *ZonesHandler) AllZones(c *fiber.Ctx) error {
	zones, err := z.repo.GetAllZones()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with getting all zones"})
	}

	return c.Status(200).JSON(fiber.Map{"zones": zones})
}

func (z *ZonesHandler) DeleteZone(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))

	err := z.repo.DeleteZone(id)
	if err != nil {
		log.Error(err)
		return c.Status(500).JSON(fiber.Map{"error": "Error with deleting zone"})
	}

	return c.Status(200).JSON(fiber.Map{"success": "Zone has been deleted successfully"})
}
