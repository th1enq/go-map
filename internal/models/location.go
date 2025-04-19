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
	Latitude    float64          `json:"latitude"`
	Longitude   float64          `json:"longitude"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Category    LocationCategory `json:"category"`
	VisitCount  int              `json:"visit_count"`
	FirstVisit  time.Time        `json:"first_visit"`
	LastVisit   time.Time        `json:"last_visit"`
	Popularity  float64          `json:"popularity"` // Score based on visit frequency and user count
	ClusterID   uint             `json:"cluster_id"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

// POI (Point of Interest) represents specific points within a location
type POI struct {
	ID          uint             `json:"id"`
	LocationID  uint             `json:"location_id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Category    LocationCategory `json:"category"`
	Latitude    float64          `json:"latitude"`
	Longitude   float64          `json:"longitude"`
	VisitCount  int              `json:"visit_count"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

// UserLocation represents the many-to-many relationship between users and locations
type UserLocation struct {
	UserID     uint      `json:"user_id"`
	LocationID uint      `json:"location_id"`
	VisitCount int       `json:"visit_count"`
	FirstVisit time.Time `json:"first_visit"`
	LastVisit  time.Time `json:"last_visit"`
	Rating     float64   `json:"rating"` // User's rating of the location
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
