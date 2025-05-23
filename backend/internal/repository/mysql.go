package repository

import (
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
	"github.com/gofiber/fiber/v2/log"
	"github.com/qwaq-dev/decenthack/internal/config"
	"github.com/qwaq-dev/decenthack/pkg/logger/sl"
)

func InitDataBase(cfg config.Database) (*sql.DB, error) {
	db, err := sql.Open("mysql", fmt.Sprintf("%s:%s@/%s", cfg.DBusername, cfg.DBpassword, cfg.DBname))
	if err != nil {
		log.Error("Error with connecting to database", sl.Err(err))
		return nil, err
	}

	err = db.Ping()

	if err != nil {
		log.Error("Error with pinging database", sl.Err(err))
		return nil, err
	}

	log.Info("Database connect successfully")
	return db, nil
}
