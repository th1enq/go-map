package models

import (
	"time"

	"gorm.io/datatypes"
)

type StayPoint struct {
	ID           uint           `json:"id"`
	UserID       uint           `json:"user_id"`
	TrajectoryID uint           `json:"trajectory_id"`
	Latitude     float64        `json:"latitude"`
	Longitude    float64        `json:"longitude"`
	ArrivalTime  time.Time      `json:"arrival_time"`
	LeaveTime    time.Time      `json:"leave_time"`
	Activities   datatypes.JSON `json:"activities"`
}
