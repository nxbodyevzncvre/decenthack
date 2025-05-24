package structures

type Pilot struct {
	Id         int    `json:"pilot_id, omitempty"`
	Firstname  string `json:"firstname, omitempty"`
	Lastname   string `json:"lastname, omitempty"`
	Middlename string `json:"middlename, omitempty"`
	Phone      string `json:"phone"`
	Password   string `json:"password"`
}
