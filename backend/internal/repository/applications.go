package repository

import (
	"database/sql"

	"github.com/gofiber/fiber/v2/log"
	"github.com/qwaq-dev/decenthack/internal/structures"
)

type ApplicationRepository struct {
	DB *sql.DB
}

func (a *ApplicationRepository) CreateApplication(application structures.Application) error {

	_, err := a.DB.Exec("INSERT application_id, start_date, end_date, status, rejection_reason, restricted_zone_check, created_at, last_update, pilot_id, drone_id")
	if err != nil {
		log.Error(err)
		return err
	}
	return nil
}
