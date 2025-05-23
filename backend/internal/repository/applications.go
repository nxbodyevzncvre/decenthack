package repository

import (
	"database/sql"
	"time"

	"github.com/gofiber/fiber/v2/log"
	"github.com/qwaq-dev/decenthack/internal/structures"
)

type ApplicationRepository struct {
	DB *sql.DB
}

func (a *ApplicationRepository) CreateApplication(req structures.CreateApplicationRequest) error {
	tx, err := a.DB.Begin()
	if err != nil {
		return err
	}

	res, err := tx.Exec(`
		INSERT INTO Application (start_date, end_date, status, rejection_reason, restricted_zone_check, created_at, last_update, pilot_id, drone_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		req.StartDate, req.EndDate, req.Status, req.RejectionReason, req.RestrictedZoneCheck, time.Now(), time.Now(), req.PilotId, req.DroneId)
	if err != nil {
		tx.Rollback()
		return err
	}

	applicationID, err := res.LastInsertId()
	if err != nil {
		tx.Rollback()
		return err
	}

	_, err = tx.Exec(`
		INSERT INTO Route (latitude, longtitude, altitude, point_order, application_id)
		VALUES (?, ?, ?, ?, ?)`,
		req.Latitude, req.Longtitude, req.Altitude, req.PointOrder, applicationID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func (a *ApplicationRepository) DeleteApplication(id int) error {
	tx, err := a.DB.Begin()
	if err != nil {
		return err
	}

	res, err := tx.Exec("DELETE FROM Application WHERE application_id = ?", id)
	if err != nil {
		tx.Rollback()
		return err
	}

	applicationId, err := res.LastInsertId()
	if err != nil {
		tx.Rollback()
		return err
	}

	_, err = tx.Exec("DELETE FROM Route WHERE application_id = ?", applicationId)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func (a *ApplicationRepository) AllPilotsAplications(id int) ([]structures.AllPitlotsApl, error) {
	var applications []structures.AllPitlotsApl

	rows, err := a.DB.Query(`SELECT a.application_id, a.start_date, a.status, a.created_at, d.serial_number, r.latitude, r.longtitude, r.altitude
							FROM Application a 
							JOIN Drone d ON a.drone_id=d.drone_id
							JOIN Route r ON r.application_id=a.application_id
							WHERE a.pilot_id = ?`, id)
	if err != nil {
		log.Error(err)
		return applications, err
	}

	defer rows.Close()

	applicationMap := make(map[int]*structures.AllPitlotsApl)

	for rows.Next() {
		var application structures.AllPitlotsApl

		var createdAtBytes []byte
		err := rows.Scan(&application.Id, &application.StartDate, &application.Status,
			&createdAtBytes, &application.Serialnumber, &application.Latitude, &application.Longtitude, &application.Altitude)
		if err != nil {
			log.Error(err)
			return applications, nil
		}

		application.CreatedAt, err = time.Parse("2006-01-02 15:04:05", string(createdAtBytes))
		if err != nil {
			log.Error("invalid datetime format from DB:", err)
			return applications, nil
		}

		applicationMap[application.Id] = &application
	}

	for _, application := range applicationMap {
		applications = append(applications, *application)
	}

	return applications, nil
}
