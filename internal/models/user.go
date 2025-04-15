package models

import (
	"time"
)

type User struct {
	ID        uint      `json:"ID"`
	Username  string    `json:"user_name"`
	Password  string    `json:"-"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Role      string    `json:"role"`
}
