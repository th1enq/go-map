package models

import (
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Activity struct {
	gorm.Model
	Name        string         `json:"name" gorm:"type:varchar(255);not null"`
	Description string         `json:"description" gorm:"type:text"`
	Categories  datatypes.JSON `json:"categories" gorm:"type:jsonb;default:'[]'"`
}

func (Activity) TableName() string {
	return "activities"
}

func (a *Activity) BeforeSave(tx *gorm.DB) (err error) {
	if string(a.Categories) == "" || string(a.Categories) == "null" {
		a.Categories = datatypes.JSON([]byte("[]"))
	}
	return nil
}
