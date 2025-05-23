package structures

type Pilot struct {
	id         int    `json:"pilot_id"`
	firstname  string `json:"firstname"`
	lastname   string `json:"lastname"`
	middlename string `json:"middlename"`
	phone      string `json:"phone"`
	password   string `json:"password"`
}
