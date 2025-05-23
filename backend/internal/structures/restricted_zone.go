package structures

type RestrictedZone struct {
	Id         int     `json:"restrictedZone_id"`
	Latitude   float64 `json:"latitude"`
	Longtitude float64 `json:"longtitude"`
	Altitude   float64 `json:"altitude"`
}
