package repository

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/qwaq-dev/drones/internal/structures"
)

type Repository struct {
	db *sql.DB
}

func New(databaseURL string) (*Repository, error) {
	db, err := sql.Open("mysql", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Repository{db: db}, nil
}

func (r *Repository) Close() error {
	return r.db.Close()
}

// Метод для получения конкретной заявки по ID с полем tested
func (r *Repository) GetApplicationById(id int) (*structures.Application, error) {
	query := `
		SELECT application_id, drone_id, pilot_id, status, COALESCE(tested, 0) as tested
		FROM Application 
		WHERE application_id = ?
	`

	var app structures.Application
	err := r.db.QueryRow(query, id).Scan(&app.Id, &app.Drone_id, &app.Pilot_id, &app.Status, &app.Tested)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("application with id %d not found", id)
		}
		return nil, fmt.Errorf("failed to get application: %w", err)
	}

	return &app, nil
}

func (r *Repository) UpdateApplicationTested(id int, tested int) error {
	query := `
		UPDATE Application 
		SET tested = ?, last_update = NOW() 
		WHERE application_id = ?
	`

	result, err := r.db.Exec(query, tested, id)
	if err != nil {
		return fmt.Errorf("failed to update application tested flag: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no application found with id %d", id)
	}

	log.Printf("Updated application %d tested flag to %d", id, tested)
	return nil
}

func (r *Repository) GetPendingApplications() ([]structures.Application, error) {
	query := `
		SELECT application_id, start_date, end_date, status, 
		       COALESCE(rejection_reason, '') as rejection_reason,
		       COALESCE(restricted_zone_check, 0) as restricted_zone_check,
		       created_at, last_update, pilot_id, drone_id, tested
		FROM Application 
		WHERE status = 'pending'
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var applications []structures.Application
	for rows.Next() {
		var app structures.Application
		var createdAtStr, lastUpdateStr string

		err := rows.Scan(
			&app.Id, &app.Start_date, &app.End_date, &app.Status,
			&app.Rejection_reason, &app.Restricted_zone_check,
			&createdAtStr, &lastUpdateStr, &app.Pilot_id, &app.Drone_id, &app.Tested,
		)
		if err != nil {
			log.Printf("Error scanning application: %v", err)
			continue
		}

		if createdAtStr != "" {
			if parsedTime, err := time.Parse("2006-01-02 15:04:05", createdAtStr); err == nil {
				app.Created_at = parsedTime
			}
		}

		if lastUpdateStr != "" {
			if parsedTime, err := time.Parse("2006-01-02 15:04:05", lastUpdateStr); err == nil {
				app.Last_update = parsedTime
			}
		}

		applications = append(applications, app)
	}

	return applications, nil
}

func (r *Repository) UpdateApplicationStatus(id int, status structures.Status, reason string) error {
	query := `
		UPDATE Application 
		SET status = ?, rejection_reason = ?, last_update = NOW() 
		WHERE application_id = ?
	`
	_, err := r.db.Exec(query, status, reason, id)
	return err
}

func (r *Repository) GetRouteByApplicationId(applicationId int) ([]structures.RoutePoint, error) {
	query := `
		SELECT route_id, latitude, longtitude, altitude, point_order, application_id
		FROM Route 
		WHERE application_id = ? 
		ORDER BY point_order ASC
	`

	rows, err := r.db.Query(query, applicationId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var route []structures.RoutePoint
	for rows.Next() {
		var point structures.RoutePoint
		err := rows.Scan(
			&point.Id, &point.Latitude, &point.Longitude,
			&point.Altitude, &point.PointOrder, &point.ApplicationId,
		)
		if err != nil {
			log.Printf("Error scanning route point: %v", err)
			continue
		}
		route = append(route, point)
	}

	return route, nil
}

func (r *Repository) GetRestrictedZones() ([]structures.RestrictedZone, error) {
	query := `
		SELECT zone_id, latitude, longtitude, altitude, name, radius
		FROM Restricted_zones
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var zones []structures.RestrictedZone
	for rows.Next() {
		var zone structures.RestrictedZone
		err := rows.Scan(
			&zone.Id, &zone.Latitude, &zone.Longtitude,
			&zone.Altitude, &zone.Name, &zone.Radius,
		)
		if err != nil {
			log.Printf("Error scanning restricted zone: %v", err)
			continue
		}
		zones = append(zones, zone)
	}

	return zones, nil
}

func (r *Repository) SaveDronePosition(position structures.DronePosition) error {
	query := `
		INSERT INTO drone_positions 
		(application_id, drone_id, latitude, longitude, altitude, speed, heading, timestamp, route_progress)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
		latitude = VALUES(latitude),
		longitude = VALUES(longitude),
		altitude = VALUES(altitude),
		speed = VALUES(speed),
		heading = VALUES(heading),
		timestamp = VALUES(timestamp),
		route_progress = VALUES(route_progress)
	`

	_, err := r.db.Exec(query,
		position.ApplicationId, position.DroneId,
		position.Latitude, position.Longitude, position.Altitude,
		position.Speed, position.Heading, position.Timestamp, position.RouteProgress,
	)
	return err
}
