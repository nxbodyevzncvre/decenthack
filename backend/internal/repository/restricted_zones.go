package repository

import (
	"database/sql"

	"github.com/gofiber/fiber/v2/log"
	"github.com/qwaq-dev/decenthack/internal/structures"
)

type ZonesRepository struct {
	DB *sql.DB
}

func (z *ZonesRepository) InsertZone(zone *structures.RestrictedZone) error {
	_, err := z.DB.Exec("INSERT INTO Restricted_zones (latitude, longtitude, altitude, name, radius) VALUES (?, ?, ?, ?, ?)",
		zone.Latitude, zone.Longtitude, zone.Altitude, zone.Name, zone.Radius)
	if err != nil {
		log.Error(err)
		return err
	}

	return nil
}

func (z *ZonesRepository) GetAllZones() ([]structures.RestrictedZone, error) {
	var zones []structures.RestrictedZone

	rows, err := z.DB.Query("SELECT * FROM Restricted_zones")
	if err != nil {
		log.Error(err)
		return zones, err
	}

	defer rows.Close()

	zonesMap := make(map[int]*structures.RestrictedZone)

	for rows.Next() {
		var zone structures.RestrictedZone

		err := rows.Scan(&zone.Id, &zone.Latitude, &zone.Longtitude, &zone.Altitude, &zone.Name, &zone.Radius)
		if err != nil {
			log.Error(err)
			return zones, err
		}

		zonesMap[zone.Id] = &zone
	}

	for _, zone := range zonesMap {
		zones = append(zones, *zone)
	}

	return zones, nil
}

func (z *ZonesRepository) DeleteZone(id int) error {
	_, err := z.DB.Exec("DELETE FROM Restricted_zones WHERE zone_id = ?", id)
	if err != nil {
		log.Error(err)
		return err
	}

	return nil
}
