package services

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/th1enq/go-map/internal/db"
	"github.com/th1enq/go-map/internal/models"
	"gorm.io/gorm"
)

type TrajectoryServices struct {
	DB *db.DB
}

func NewTrajectoryServices(db *db.DB) *TrajectoryServices {
	return &TrajectoryServices{DB: db}
}

// GetTrajectorysByUserID retrieves all trajectories for a specific user
func (s *TrajectoryServices) GetTrajectorysByUserID(userID uint) ([]models.Trajectory, error) {
	var trajectories []models.Trajectory
	err := s.DB.Where("user_id = ?", userID).Find(&trajectories).Error
	return trajectories, err
}

// GetTrajectoryByID retrieves a trajectory by its ID
func (s *TrajectoryServices) GetTrajectoryByID(trajectoryID uint) (*models.Trajectory, error) {
	var trajectory models.Trajectory
	err := s.DB.First(&trajectory, trajectoryID).Error
	return &trajectory, err
}

func (r *TrajectoryServices) GetByUserID(userID uint) ([]models.Trajectory, error) {
	var trajectories []models.Trajectory
	result := r.DB.Where("user_id = ?", userID).Find(&trajectories)
	if result.Error != nil {
		return nil, result.Error
	}
	return trajectories, nil
}

func (r *TrajectoryServices) GetByID(id uint) (*models.Trajectory, error) {
	var trajectory models.Trajectory
	result := r.DB.First(&trajectory, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("trajectory not found")
		}
		return nil, result.Error
	}
	return &trajectory, nil
}

func (r *TrajectoryServices) Create(trajectory models.Trajectory) (uint, error) {
	result := r.DB.Create(&trajectory)
	if result.Error != nil {
		return 0, result.Error
	}
	return trajectory.ID, nil
}

func (r *TrajectoryServices) Update(trajectory models.Trajectory) error {
	result := r.DB.Save(&trajectory)
	return result.Error
}

func (r *TrajectoryServices) Delete(id uint) error {
	result := r.DB.Delete(&models.Trajectory{}, id)
	return result.Error
}

func (r *TrajectoryServices) GetGPSPoints(trajectoryID uint) ([]models.GPSPoint, error) {
	var trajectory models.Trajectory
	result := r.DB.First(&trajectory, trajectoryID)
	if result.Error != nil {
		return nil, result.Error
	}

	var points []models.GPSPoint
	err := json.Unmarshal([]byte(trajectory.Points), &points)
	if err != nil {
		return nil, err
	}

	return points, nil
}

func (r *TrajectoryServices) Count() (int64, error) {
	var count int64
	result := r.DB.Model(&models.Trajectory{}).Count(&count)
	if result.Error != nil {
		return 0, result.Error
	}
	return count, nil
}

func (r *TrajectoryServices) BatchCreate(trajectories []models.Trajectory) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		for i := range trajectories {
			if err := tx.Create(&trajectories[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// Các hàm bổ sung cho admin
func (s *TrajectoryServices) GetAllTrajectories() ([]models.Trajectory, error) {
	var trajectories []models.Trajectory
	err := s.DB.Find(&trajectories).Error
	if err != nil {
		return nil, err
	}
	return trajectories, nil
}

func (s *TrajectoryServices) GetTrajectoryPoints(trajectoryID uint) ([]map[string]interface{}, error) {
	var trajectory models.Trajectory
	if err := s.DB.First(&trajectory, trajectoryID).Error; err != nil {
		return nil, err
	}

	var pointsArray []models.GPSPoint
	if err := json.Unmarshal([]byte(trajectory.Points), &pointsArray); err != nil {
		return nil, err
	}

	points := make([]map[string]interface{}, len(pointsArray))
	for i, p := range pointsArray {
		points[i] = map[string]interface{}{
			"id":            i,
			"trajectory_id": trajectoryID,
			"lat":           p.Latitude,
			"lng":           p.Longitude,
			"altitude":      p.Altitude,
			"time":          p.Timestamp.Format(time.RFC3339),
			"timestamp":     p.Timestamp.Unix(),
		}
	}

	return points, nil
}

func (s *TrajectoryServices) GetTrajectoryPointsCount(trajectoryID uint) (int, error) {
	var count int
	err := s.DB.Raw(`
		SELECT jsonb_array_length(points) FROM trajectories WHERE id = ?
	`, trajectoryID).Scan(&count).Error

	return count, err
}

func (s *TrajectoryServices) CreateTrajectory(userID uint, startTime, endTime string, points []map[string]any) (*models.Trajectory, error) {
	// Convert points to GPSPoint array
	gpsPoints := make([]models.GPSPoint, len(points))
	for i, point := range points {
		lat, latOk := point["lat"].(float64)
		lng, lngOk := point["lng"].(float64)
		if !latOk || !lngOk {
			return nil, errors.New("invalid point data: lat and lng must be numbers")
		}

		// Parse time or use default
		var pointTime time.Time
		if timeStr, ok := point["timestamp"].(string); ok {
			parsedTime, err := time.Parse(time.RFC3339, timeStr)
			if err != nil {
				return nil, errors.New("invalid timestamp format, must be RFC3339")
			}
			pointTime = parsedTime
		} else {
			pointTime = time.Now()
		}

		// Get altitude if available
		alt := 0.0
		if altitude, ok := point["altitude"].(float64); ok {
			alt = altitude
		}

		gpsPoints[i] = models.GPSPoint{
			Latitude:  lat,
			Longitude: lng,
			Altitude:  alt,
			Timestamp: pointTime,
		}
	}

	// Serialize points to JSON
	pointsJSON, err := json.Marshal(gpsPoints)
	if err != nil {
		return nil, err
	}

	// Parse start and end times
	parsedStartTime, err := time.Parse(time.RFC3339, startTime)
	if err != nil {
		return nil, errors.New("invalid startTime format, must be RFC3339")
	}

	parsedEndTime, err := time.Parse(time.RFC3339, endTime)
	if err != nil {
		return nil, errors.New("invalid endTime format, must be RFC3339")
	}

	// Create trajectory
	trajectory := models.Trajectory{
		UserID:    userID,
		StartTime: parsedStartTime,
		EndTime:   parsedEndTime,
		Points:    pointsJSON,
	}

	// Save trajectory
	if err := s.DB.Create(&trajectory).Error; err != nil {
		return nil, err
	}

	return &trajectory, nil
}

func (s *TrajectoryServices) UpdateTrajectory(trajectory *models.Trajectory, points []map[string]any) error {
	// Begin transaction
	tx := s.DB.Begin()

	// If points are provided, update them
	if points != nil && len(points) > 0 {
		// Convert points to GPSPoint array
		gpsPoints := make([]models.GPSPoint, len(points))
		for i, point := range points {
			lat, latOk := point["lat"].(float64)
			lng, lngOk := point["lng"].(float64)
			if !latOk || !lngOk {
				tx.Rollback()
				return errors.New("invalid point data: lat and lng must be numbers")
			}

			// Parse time or use default
			var pointTime time.Time
			if timeStr, ok := point["timestamp"].(string); ok {
				parsedTime, err := time.Parse(time.RFC3339, timeStr)
				if err != nil {
					tx.Rollback()
					return errors.New("invalid timestamp format, must be RFC3339")
				}
				pointTime = parsedTime
			} else {
				pointTime = time.Now()
			}

			// Get altitude if available
			alt := 0.0
			if altitude, ok := point["altitude"].(float64); ok {
				alt = altitude
			}

			gpsPoints[i] = models.GPSPoint{
				Latitude:  lat,
				Longitude: lng,
				Altitude:  alt,
				Timestamp: pointTime,
			}
		}

		// Serialize points to JSON
		pointsJSON, err := json.Marshal(gpsPoints)
		if err != nil {
			tx.Rollback()
			return err
		}

		// Update trajectory with new points
		trajectory.Points = pointsJSON
	}

	// Save trajectory
	if err := tx.Save(trajectory).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Commit transaction
	return tx.Commit().Error
}

func (s *TrajectoryServices) DeleteTrajectory(id uint) error {
	// Since we're using a JSONB field for points now, we only need to delete the trajectory itself
	return s.DB.Delete(&models.Trajectory{}, id).Error
}

func (s *TrajectoryServices) GetTrajectoryCount() (int64, error) {
	var count int64
	err := s.DB.Model(&models.Trajectory{}).Count(&count).Error
	return count, err
}

// GetTrajectorysByUserIDPaginated retrieves trajectories for a specific user with pagination
func (s *TrajectoryServices) GetTrajectorysByUserIDPaginated(userID uint, offset, limit int) ([]models.Trajectory, error) {
	var trajectories []models.Trajectory
	err := s.DB.Where("user_id = ?", userID).Order("created_at DESC").Offset(offset).Limit(limit).Find(&trajectories).Error
	return trajectories, err
}

// GetUserTrajectoriesCount returns the total number of trajectories for a user
func (s *TrajectoryServices) GetUserTrajectoriesCount(userID uint) (int64, error) {
	var count int64
	err := s.DB.Model(&models.Trajectory{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

// GetTrajectoriesPaginated returns trajectories with pagination
func (s *TrajectoryServices) GetTrajectoriesPaginated(offset, limit int) ([]models.Trajectory, error) {
	var trajectories []models.Trajectory
	err := s.DB.Offset(offset).Limit(limit).Order("id ASC").Find(&trajectories).Error
	return trajectories, err
}
