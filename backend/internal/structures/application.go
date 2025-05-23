package structures

import "time"

type Status string

const (
	StatusPending  Status = "pending"
	StatusApproved Status = "approved"
	StatusRejected Status = "rejected"
)

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
