package repository

import "database/sql"

type PilotRepository struct {
	DB *sql.DB
}
