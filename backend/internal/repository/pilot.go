package repository

import (
	"database/sql"

	"github.com/gofiber/fiber/v2/log"
	"github.com/qwaq-dev/decenthack/internal/structures"
	"github.com/qwaq-dev/decenthack/pkg/logger/sl"
)

type PilotRepository struct {
	DB *sql.DB
}

func (p *PilotRepository) InsertPilot(pilot *structures.Pilot) (int, error) {
	result, err := p.DB.Exec("INSERT INTO Pilot (firstname, lastname, middlename, phone, password) VALUES (?, ?, ?, ?, ?)",
		pilot.Firstname, pilot.Lastname, pilot.Middlename, pilot.Phone, pilot.Password)
	if err != nil {
		log.Error(sl.Err(err))
		return 0, err
	}

	pilotId, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return int(pilotId), nil
}

func (p *PilotRepository) SelectPilot(phone string) (*structures.Pilot, error) {
	pilot := new(structures.Pilot)

	err := p.DB.QueryRow("SELECT pilot_id, firstname, lastname, middlename, password FROM Pilot WHERE phone = ?",
		phone).Scan(&pilot.Id, &pilot.Firstname, &pilot.Lastname, &pilot.Middlename, &pilot.Password)
	if err != nil {
		return nil, err
	}

	return pilot, nil
}

func (p *PilotRepository) SelectPilotById(id int) (*structures.Pilot, error) {
	pilot := new(structures.Pilot)

	err := p.DB.QueryRow("SELECT firstname, lastname, middlename, phone, password FROM Pilot WHERE pilot_id = ?",
		id).Scan(&pilot.Firstname, &pilot.Lastname, &pilot.Middlename, &pilot.Phone, &pilot.Password)
	if err != nil {
		return nil, err
	}

	return pilot, nil
}
