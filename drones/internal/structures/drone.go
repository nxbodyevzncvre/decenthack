package structures

type Drone struct {
	Id            int    `json:"drone_id"`
	Serial_number string `json:"serial_number"`
	Model_name    string `json:"model_name"`
	Brand_name    string `json:"brand_name"`
}
