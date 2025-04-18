package models

type OverpassResponse struct {
	Elements []struct {
		Type   string            `json:"type"`
		ID     int64             `json:"id"`
		Lat    float64           `json:"lat"`
		Lon    float64           `json:"lon"`
		Tags   map[string]string `json:"tags"`
		Center struct {
			Lat float64 `json:"lat"`
			Lon float64 `json:"lon"`
		} `json:"center"`
	} `json:"elements"`
}
