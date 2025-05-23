package repository

import "database/sql"

type RoutesRepository struct {
	DB *sql.DB
}
