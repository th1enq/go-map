package models

import "time"

type StayPoint struct {
	ID            uint      `json:"id"`
	UserID        uint      `json:"user_id"`
	TrajectoryID  uint      `json:"trajectory_id"`
	LocationID    uint      `json:"location_id"`
	ClusterID     uint      `json:"cluster_id"`
	Latitude      float64   `json:"latitude"`
	Longitude     float64   `json:"longitude"`
	ArrivalTime   time.Time `json:"arrival_time"`
	DepartureTime time.Time `json:"departure_time"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
