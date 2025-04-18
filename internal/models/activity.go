package models

import (
	"gorm.io/datatypes"
)

type Activity struct {
	ID          uint           `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Categories  datatypes.JSON `json:"categories"`
	Latitude    float64        `json:"latitude"`
	Longitude   float64        `json:"longitude"`
	Category    string         `json:"category"`
	Tag         string         `json:"tag"`
	Activities  []string       `json:"activities"`
}
