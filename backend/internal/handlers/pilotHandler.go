package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/log"
	"github.com/qwaq-dev/decenthack/internal/config"
	"github.com/qwaq-dev/decenthack/internal/repository"
	"github.com/qwaq-dev/decenthack/internal/structures"
	generatetoken "github.com/qwaq-dev/decenthack/pkg/jwt/generateToken"
	"github.com/qwaq-dev/decenthack/pkg/logger/sl"
	"golang.org/x/crypto/bcrypt"
)

type PilotHandler struct {
	repo repository.PilotRepository
	cfg  config.Config
}

func NewPilotHandler(repo repository.PilotRepository, cfg config.Config) *PilotHandler {
	return &PilotHandler{repo: repo, cfg: cfg}
}

func (p *PilotHandler) SignIn(c *fiber.Ctx) error {
	req := new(structures.Pilot)

	if err := c.BodyParser(req); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with parsing body"})
	}

	if req.Password == "" || req.Phone == "" {
		return c.Status(400).JSON(fiber.Map{"error": "username and password are required"})
	}

	pilot, err := p.repo.SelectPilot(req.Phone)
	if err != nil {
		log.Error(sl.Err(err))
		return c.Status(500).JSON(fiber.Map{"error": "Pilot not found"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(pilot.Password), []byte(req.Password)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Invalid password"})
	}

	accessToken, err := generatetoken.GenerateAccessToken(pilot.Id, p.cfg.JWTSecretKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with generating JWT"})
	}

	return c.Status(200).JSON(fiber.Map{"access_token": accessToken})
}

func (p *PilotHandler) SignUp(c *fiber.Ctx) error {
	pilot := new(structures.Pilot)

	if err := c.BodyParser(pilot); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Error with parsing body"})
	}

	if pilot.Firstname == "" || pilot.Lastname == "" || pilot.Middlename == "" || pilot.Password == "" || pilot.Phone == "" {
		return c.Status(400).JSON(fiber.Map{"error": "All fields required"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(pilot.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with hash"})
	}

	pilot.Password = string(hash)

	pilotId, err := p.repo.InsertPilot(pilot)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with inserting data"})
	}

	accessToken, err := generatetoken.GenerateAccessToken(pilotId, p.cfg.JWTSecretKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error with generating JWT"})
	}

	return c.Status(200).JSON(fiber.Map{"access_token": accessToken})
}

func (p *PilotHandler) PilotById(c *fiber.Ctx) error {
	pilotId, _ := c.Locals("userId").(int)

	pilot, err := p.repo.SelectPilotById(pilotId)
	if err != nil {
		log.Error(err)
		return c.Status(500).JSON(fiber.Map{"error": "Error with selecting pilot by id"})
	}

	return c.Status(200).JSON(fiber.Map{"pilot": pilot})
}
