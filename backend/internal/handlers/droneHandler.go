package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/log"
	"github.com/qwaq-dev/decenthack/internal/config"
	"github.com/qwaq-dev/decenthack/internal/repository"
	"github.com/qwaq-dev/decenthack/internal/structures"
)

type DroneHandler struct {
	repo repository.DroneRepository
	cfg  config.Config
}

func NewDroneHandler(repo repository.DroneRepository, cfg config.Config) *DroneHandler {
	return &DroneHandler{repo: repo, cfg: cfg}
}

func (d *DroneHandler) CreateDrone(c *fiber.Ctx) error {
	drone := new(structures.Drone)

	if err := c.BodyParser(drone); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with parsing body"})
	}

	if drone.Brand_name == "" || drone.Model_name == "" || drone.Serial_number == "" {
		return c.Status(500).JSON(fiber.Map{"error": "All fields required"})
	}

	err := d.repo.InsertDrone(drone)
	if err != nil {
		log.Error(err)
		return c.Status(200).JSON(fiber.Map{"error": "Error with database"})
	}

	return c.Status(200).JSON(fiber.Map{"message": "Drone has been added"})
}

func (d *DroneHandler) DroneById(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))

	drone, err := d.repo.SelectDroneById(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with selecting drone"})
	}
	return c.Status(200).JSON(fiber.Map{"drone": drone})
}

func (d *DroneHandler) AllDrones(c *fiber.Ctx) error {
	drones, err := d.repo.SelectAllDrones()

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with selecting drone"})
	}

	return c.Status(200).JSON(fiber.Map{"drone": drones})
}

func (d *DroneHandler) DeleteDrone(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))

	err := d.repo.DeleteDrone(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with deleting drone"})
	}

	return c.Status(200).JSON(fiber.Map{"success": "Drone has been deleted"})
}
