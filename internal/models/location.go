package models

import (
	"gorm.io/datatypes"
)

type Location struct {
	ID          uint           `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Latitude    float64        `json:"latitude"`
	Longitude   float64        `json:"longitude"`
	Activities  datatypes.JSON `json:"activities"`
	UserID      uint           `json:"user_id"`
	VisitCount  int            `json:"visit_count"`
}
