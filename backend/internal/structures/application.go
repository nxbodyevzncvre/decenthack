package structures

import "time"

type Status string

const (
	StatusPending  Status = "pending"
	StatusApproved Status = "approved"
	StatusRejected Status = "rejected"
)

type Application struct {
	id                    int       `json:"application_id"`
	start_date            string    `json:"start_date"`
	end_date              string    `json"end_date"`
	status                Status    `json:"status"`
	rejection_reason      string    `json:"rejection_reason, omitempty"`
	restricted_zone_check int       `json:"restricted_zone_check, omitempty"`
	created_at            time.Time `json:"created_at, omitempty"`
	last_update           time.Time `json:"last_update, omitempty"`
	pilot_id              int       `json:"pilot_id"`
	drone_id              int       `json:"drone_id"`
}
