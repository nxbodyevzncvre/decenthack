package structures

type Routes struct {
	Id             int     `json:"route_id"`
	Latitude       float64 `json:"latitude"`
	Longtitude     float64 `json:"longtitude"`
	Altitude       float64 `json:"altitude"`
	Point_order    int     `json:"point_order, omitempty"`
	Application_id int     `json:"application_id, omitempty"`
}
