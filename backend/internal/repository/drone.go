package repository

import (
	"database/sql"

	"github.com/gofiber/fiber/v2/log"
	"github.com/nxbodyevzncvre/decenthack/internal/structures"
)

type DroneRepository struct {
	DB *sql.DB
}

func (d *DroneRepository) InsertDrone(drone *structures.Drone) error {
	res, err := d.DB.Exec("INSERT INTO Brand (brand_name) VALUES (?)", drone.Brand_name)
	if err != nil {
		return err
	}

	brandID, err := res.LastInsertId()
	if err != nil {
		return err
	}

	res, err = d.DB.Exec("INSERT INTO Model (model_name, brand_id) VALUES (?, ?)", drone.Model_name, brandID)
	if err != nil {
		return err
	}

	modelID, err := res.LastInsertId()
	if err != nil {
		return err
	}

	_, err = d.DB.Exec("INSERT INTO Drone (serial_number, model_id) VALUES (?, ?)", drone.Serial_number, modelID)
	if err != nil {
		return err
	}

	return nil
}

func (d *DroneRepository) SelectDroneById(id int) (*structures.Drone, error) {
	drone := new(structures.Drone)
	err := d.DB.QueryRow("SELECT m.model_name, d.serial_number, b.brand_name FROM Drone d JOIN Model m ON m.model_id=d.model_id JOIN Brand b ON m.brand_id=b.brand_id WHERE d.drone_id = ?", id).Scan(&drone.Model_name, &drone.Serial_number, &drone.Brand_name)
	if err != nil {
		log.Error(err)
		return drone, err
	}

	drone.Id = id

	return drone, nil
}

func (d *DroneRepository) SelectAllDrones() ([]structures.Drone, error) {
	var drones []structures.Drone

	rows, err := d.DB.Query("SELECT d.drone_id, d.serial_number, m.model_name, b.brand_name FROM Drone d JOIN Model m ON m.model_id=d.model_id JOIN Brand b ON m.brand_id=b.brand_id")
	if err != nil {
		log.Error(err)
		return nil, err
	}

	defer rows.Close()

	dronesMap := make(map[int]*structures.Drone)

	for rows.Next() {
		var drone structures.Drone

		err := rows.Scan(&drone.Id, &drone.Serial_number, &drone.Model_name, &drone.Brand_name)
		if err != nil {
			log.Error(err)
			return nil, err
		}

		dronesMap[drone.Id] = &drone
	}

	for _, drone := range dronesMap {
		drones = append(drones, *drone)
	}

	return drones, nil
}

func (d *DroneRepository) DeleteDrone(droneID int) error {
	tx, err := d.DB.Begin()
	if err != nil {
		return err
	}

	var modelID int
	err = tx.QueryRow("SELECT model_id FROM Drone WHERE drone_id = ?", droneID).Scan(&modelID)
	if err != nil {
		tx.Rollback()
		return err
	}

	_, err = tx.Exec("DELETE FROM Drone WHERE drone_id = ?", droneID)
	if err != nil {
		tx.Rollback()
		return err
	}

	var count int
	err = tx.QueryRow("SELECT COUNT(*) FROM Drone WHERE model_id = ?", modelID).Scan(&count)
	if err != nil {
		tx.Rollback()
		return err
	}

	if count == 0 {
		var brandID int
		err = tx.QueryRow("SELECT brand_id FROM Model WHERE model_id = ?", modelID).Scan(&brandID)
		if err != nil {
			tx.Rollback()
			return err
		}

		_, err = tx.Exec("DELETE FROM Model WHERE model_id = ?", modelID)
		if err != nil {
			tx.Rollback()
			return err
		}

		err = tx.QueryRow("SELECT COUNT(*) FROM Model WHERE brand_id = ?", brandID).Scan(&count)
		if err != nil {
			tx.Rollback()
			return err
		}

		if count == 0 {
			_, err = tx.Exec("DELETE FROM Brand WHERE brand_id = ?", brandID)
			if err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit()
}
