package repository

import "database/sql"

type ApplicationRepository struct {
	DB *sql.DB
}
