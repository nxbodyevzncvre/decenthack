package structures

import "time"

type Status string
type FlightState string

const (
	FlightStateActive FlightState = "active"
	FlightStatePaused FlightState = "paused"
)
const (
	StatusPending    Status = "pending"
	StatusProcessing Status = "processing"
	StatusApproved   Status = "approved"
	StatusExecuting  Status = "executing"
	StatusCompleted  Status = "completed"
	StatusRejected   Status = "rejected"
	StatusCancelled  Status = "cancelled"
)

type DronePosition struct {
	ApplicationId int       `json:"application_id"`
	DroneId       int       `json:"drone_id"`
	Latitude      float64   `json:"latitude"`
	Longitude     float64   `json:"longitude"`
	Altitude      float64   `json:"altitude"`
	Speed         float64   `json:"speed"`
	Heading       float64   `json:"heading"`
	Timestamp     time.Time `json:"timestamp"`
	RouteProgress float64   `json:"route_progress"`
}

type ActiveFlight struct {
	ApplicationId    int           `json:"application_id"`
	DroneId          int           `json:"drone_id"`
	PilotId          int           `json:"pilot_id"`
	Route            []RoutePoint  `json:"route"`
	CurrentWaypoint  int           `json:"current_waypoint"`
	StartTime        time.Time     `json:"start_time"`
	EstimatedEndTime time.Time     `json:"estimated_end_time"`
	Status           Status        `json:"status"`
	CurrentPosition  DronePosition `json:"current_position"`

	// Новые поля для паузы
	State           FlightState `json:"state"`
	PauseStartTime  *time.Time  `json:"pause_start_time,omitempty"`
	PauseEndTime    *time.Time  `json:"pause_end_time,omitempty"`
	FlightStartTime time.Time   `json:"flight_start_time"` // Время начала полета для расчета паузы
	DemoMode        bool        `json:"demo_mode"`         // Флаг демо-режима
}
type RoutePoint struct {
	Id            int     `json:"route_id"`
	Latitude      float64 `json:"latitude"`
	Longitude     float64 `json:"longitude"`
	Altitude      float64 `json:"altitude"`
	PointOrder    int     `json:"point_order"`
	ApplicationId int     `json:"application_id"`
}

type Notification struct {
	Type          string      `json:"type"`
	ApplicationId int         `json:"application_id"`
	Message       string      `json:"message"`
	Data          interface{} `json:"data"`
	Timestamp     time.Time   `json:"timestamp"`
}
