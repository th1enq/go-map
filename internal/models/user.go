package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
)

type UserRole string

const (
	RoleUser      UserRole = "user"
	RoleAdmin     UserRole = "admin"
	RoleModerator UserRole = "moderator"
)

type User struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	Role      UserRole  `json:"role"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	LastLogin time.Time `json:"last_login"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SetPassword - Mã hóa và thiết lập mật khẩu cho user
func (u *User) SetPassword(password string) error {
	if password == "" {
		return nil // Không thay đổi mật khẩu nếu chuỗi trống
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword - Kiểm tra mật khẩu có khớp với hash đã lưu không
func (u *User) CheckPassword(password string) error {
	return bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
}
