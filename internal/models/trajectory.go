package models

import (
	"time"

	"gorm.io/datatypes"
)

type GPSPoint struct {
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Altitude  float64   `json:"altitude"`
	Timestamp time.Time `json:"timestamp"`
}

type Trajectory struct {
	ID        uint           `json:"id"`
	UserID    uint           `json:"user_id"`
	Name      string         `json:"name"`
	Points    datatypes.JSON `json:"points"`
	StartTime time.Time      `json:"start_time"`
	EndTime   time.Time      `json:"end_time"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}
