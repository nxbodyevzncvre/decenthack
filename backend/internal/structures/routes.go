package structures

type Routes struct {
	id             int     `json:"route_id"`
	latitude       float64 `json:"latitude"`
	longtitude     float64 `json:"longtitude"`
	altitude       float64 `json:"altitude"`
	point_order    int     `json:"point_order, omitempty"`
	application_id int     `json:"application_id, omitempty"`
}
