package models

// Direction represents a single step in the route with maneuver information
type Direction struct {
	Type     string    `json:"type"`
	Location []float64 `json:"location"`
}

// Route represents a complete route between two points
type Route struct {
	Geometry   string      `json:"geometry"`
	Distance   float64     `json:"distance"` // in kilometers
	Duration   float64     `json:"duration"` // in minutes
	Directions []Direction `json:"directions"`
}
