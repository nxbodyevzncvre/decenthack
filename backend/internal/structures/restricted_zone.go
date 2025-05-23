package structures

type RestrictedZone struct {
	id         int     `json:"restrictedZone_id"`
	latitude   float64 `json:"latitude"`
	longtitude float64 `json:"longtitude"`
	altitude   float64 `json:"altitude"`
}
