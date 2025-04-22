package main

import (
	"fmt"
	"log"

	"github.com/th1enq/go-map/config"
	"github.com/th1enq/go-map/internal/db"
	"github.com/th1enq/go-map/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	database, err := db.Load(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Find the admin user
	var admin models.User
	result := database.Where("email = ?", "admin@geolife.local").First(&admin)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			log.Fatalf("Admin user not found. Please run migrations first.")
		}
		log.Fatalf("Error finding admin user: %v", result.Error)
	}

	// Generate hashed password
	password := "123456789a"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// Update the admin password
	admin.Password = string(hashedPassword)
	result = database.Save(&admin)
	if result.Error != nil {
		log.Fatalf("Failed to update admin password: %v", result.Error)
	}

	fmt.Println("Admin password successfully updated to '123456789a'")
	fmt.Println("You can now log in with:")
	fmt.Println("Email: admin@geolife.local")
	fmt.Println("Password: 123456789a")
}
