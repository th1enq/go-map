package algorithms

import "math"

const (
	EarthRadiusKm = 6371.0 // Earth's radius in kilometers
)

func Distance(lat1, lon1, lat2, lon2 float64) float64 {
	// Convert degrees to radians
	lat1Rad := lat1 * (math.Pi / 180.0)
	lon1Rad := lon1 * (math.Pi / 180.0)
	lat2Rad := lat2 * (math.Pi / 180.0)
	lon2Rad := lon2 * (math.Pi / 180.0)

	// Haversine formula
	dLat := lat2Rad - lat1Rad
	dLon := lon2Rad - lon1Rad

	a := (math.Sin(dLat/2) * math.Sin(dLat/2)) + (math.Cos(lat1Rad) * math.Cos(lat2Rad) * math.Sin(dLon/2) * math.Sin(dLon/2))
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return EarthRadiusKm * c
}
