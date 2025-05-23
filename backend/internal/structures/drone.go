package structures

type Drone struct {
	id            int    `json:"drone_id"`
	serial_number string `json:"serial_number"`
	model_id      int    `json:"model_id"`
}
