// Package handlers provides HTTP request handlers for the application
package handlers

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/th1enq/go-map/internal/algorithms"
	"github.com/th1enq/go-map/internal/models"
	"github.com/th1enq/go-map/internal/services"
	"gorm.io/datatypes"
)

// LoadingDataHandler handles the loading and processing of trajectory data
type LoadingDataHandler struct {
	trajectoryService *services.TrajectoryServices
	stayPointService  *services.StayPointServices
	userService       *services.UserServices
}

// NewLoadingDataHandler creates a new instance of LoadingDataHandler
func NewLoadingDataHandler(
	trajectoryService *services.TrajectoryServices,
	stayPointService *services.StayPointServices,
	userService *services.UserServices,
) *LoadingDataHandler {
	return &LoadingDataHandler{
		trajectoryService: trajectoryService,
		stayPointService:  stayPointService,
		userService:       userService,
	}
}

// LoadGeolifeData loads trajectory data from the Geolife dataset
func (l *LoadingDataHandler) LoadGeolifeData(dataDir string) error {
	// Check if the data directory exists
	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		return fmt.Errorf("data directory not found: %s", dataDir)
	}

	// Iterate through user directories
	userDirs, err := os.ReadDir(filepath.Join(dataDir, "Data"))
	if err != nil {
		return fmt.Errorf("error reading Data directory: %w", err)
	}

	for _, userDir := range userDirs {
		if !userDir.IsDir() {
			continue
		}

		userFolder := userDir.Name()
		// Create or find corresponding user in the database
		user, err := l.userService.FindOrCreateByFolder(userFolder)
		if err != nil {
			if err.Error() == "user data already imported" {
				fmt.Printf("Skipping user %s: data already imported\n", userFolder)
				continue
			}
			fmt.Printf("Error getting user for folder %s: %v\n", userFolder, err)
			continue
		}

		userID := user.ID

		trajectoryPath := filepath.Join(dataDir, "Data", userFolder, "Trajectory")
		if _, err := os.Stat(trajectoryPath); os.IsNotExist(err) {
			continue
		}

		files, err := os.ReadDir(trajectoryPath)
		if err != nil {
			fmt.Printf("Error reading trajectory directory for user %s: %v\n", userFolder, err)
			continue
		}

		for _, file := range files {
			if filepath.Ext(file.Name()) != ".plt" {
				continue
			}

			filePath := filepath.Join(trajectoryPath, file.Name())
			err = l.processPLTFile(filePath, userID)
			if err != nil {
				fmt.Printf("Error processing file %s: %v\n", filePath, err)
				continue
			}
		}
	}

	return nil
}

// processPLTFile processes a single PLT file and extracts trajectory data
func (l *LoadingDataHandler) processPLTFile(filePath string, userID uint) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	// Skip first 6 lines (header)
	for i := 0; i < 6; i++ {
		if !scanner.Scan() {
			return fmt.Errorf("file too short, cannot skip header")
		}
	}

	var points []models.GPSPoint
	var startTime, endTime time.Time

	// Read data
	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Split(line, ",")

		if len(fields) < 7 {
			continue
		}

		lat, err := strconv.ParseFloat(fields[0], 64)
		if err != nil {
			continue
		}

		lng, err := strconv.ParseFloat(fields[1], 64)
		if err != nil {
			continue
		}

		altitude, err := strconv.ParseFloat(fields[3], 64)
		if err != nil {
			continue
		}

		// Parse date and time
		dateStr := fields[5] + " " + fields[6]
		timestamp, err := time.Parse("2006-01-02 15:04:05", dateStr)
		if err != nil {
			continue
		}

		point := models.GPSPoint{
			Latitude:  lat,
			Longitude: lng,
			Altitude:  altitude,
			Timestamp: timestamp,
		}

		points = append(points, point)

		// Update start and end times
		if startTime.IsZero() || timestamp.Before(startTime) {
			startTime = timestamp
		}
		if endTime.IsZero() || timestamp.After(endTime) {
			endTime = timestamp
		}
	}

	if len(points) == 0 {
		return nil
	}

	// Convert points to JSON
	pointsJSON, err := json.Marshal(points)
	if err != nil {
		return err
	}

	// Create new trajectory
	trajectory := models.Trajectory{
		UserID:    userID,
		Points:    datatypes.JSON(pointsJSON),
		StartTime: startTime,
		EndTime:   endTime,
	}

	// Save trajectory to database
	trajectoryID, err := l.trajectoryService.Create(trajectory)
	if err != nil {
		return err
	}

	// Update ID
	trajectory.ID = trajectoryID

	// Detect stay points
	stayPoints := algorithms.StayPointDetection(
		trajectory,
		200,            // 200m distance threshold
		30*time.Minute, // 30 minutes time threshold
	)

	// Save stay points to database
	if len(stayPoints) > 0 {
		err = l.stayPointService.BatchCreate(stayPoints)
		if err != nil {
			fmt.Printf("Error saving stay points: %v\n", err)
		}
	}

	return nil
}
