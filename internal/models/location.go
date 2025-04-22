package models

import "time"

type LocationCategory string

const (
	CategoryTravel        LocationCategory = "travel"
	CategoryRestaurant    LocationCategory = "restaurant"
	CategoryEntertainment LocationCategory = "entertainment"
	CategorySport         LocationCategory = "sport"
	CategoryEducation     LocationCategory = "education"
)

type Location struct {
	ID          uint             `json:"id"`
	UserID      uint             `json:"user_id"`
	Latitude    float64          `json:"latitude"`
	Longitude   float64          `json:"longitude"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Category    LocationCategory `json:"category"`
	VisitCount  int              `json:"visit_count"`
	ClusterID   uint             `json:"cluster_id"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}
