package structures

import "time"

type Application struct {
	Id                    int       `json:"application_id"`
	Start_date            string    `json:"start_date"`
	End_date              string    `json"end_date"`
	Status                Status    `json:"status"`
	Rejection_reason      string    `json:"rejection_reason, omitempty"`
	Restricted_zone_check int       `json:"restricted_zone_check, omitempty"`
	Created_at            time.Time `json:"created_at, omitempty"`
	Last_update           time.Time `json:"last_update, omitempty"`
	Pilot_id              int       `json:"pilot_id"`
	Drone_id              int       `json:"drone_id"`
}

type CreateApplicationRequest struct {
	StartDate           string    `json:"start_date"`
	EndDate             string    `json:"end_date"`
	Status              Status    `json:"status"`
	RejectionReason     string    `json:"rejection_reason,omitempty"`
	RestrictedZoneCheck int       `json:"restricted_zone_check,omitempty"`
	CreatedAt           time.Time `json:"created_at,omitempty"`
	LastUpdate          time.Time `json:"last_update,omitempty"`
	PilotId             int       `json:"pilot_id"`
	DroneId             int       `json:"drone_id"`
	Latitude            float64   `json:"latitude"`
	Longtitude          float64   `json:"longtitude"`
	Altitude            float64   `json:"altitude"`
	PointOrder          int       `json:"point_order,omitempty"`
}

type AllPitlotsApl struct {
	Id           int       `json:"id"`
	StartDate    string    `json:"start_date"`
	Status       Status    `json:"status"`
	CreatedAt    time.Time `json:"created_at,omitempty"`
	Serialnumber string    `json:"serial_number"`
	Latitude     float64   `json:"latitude"`
	Longtitude   float64   `json:"longtitude"`
	Altitude     float64   `json:"altitude"`
}
