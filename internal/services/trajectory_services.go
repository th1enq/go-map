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

func (s *TrajectoryServices) GetTrajectoryByID(id uint) (*models.Trajectory, error) {
	var trajectory models.Trajectory
	err := s.DB.First(&trajectory, id).Error
	if err != nil {
		return nil, err
	}
	return &trajectory, nil
}

func (s *TrajectoryServices) GetTrajectoryPoints(trajectoryID uint) ([]map[string]interface{}, error) {
	var points []map[string]interface{}
	rows, err := s.DB.Raw(`
		SELECT 
			id, 
			trajectory_id, 
			latitude, 
			longitude, 
			altitude, 
			time,
			EXTRACT(EPOCH FROM time)::bigint as timestamp
		FROM trajectory_points 
		WHERE trajectory_id = ? 
		ORDER BY time ASC
	`, trajectoryID).Rows()

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var id, trajectoryID uint
		var latitude, longitude, altitude float64
		var time string
		var timestamp int64

		if err := rows.Scan(&id, &trajectoryID, &latitude, &longitude, &altitude, &time, &timestamp); err != nil {
			return nil, err
		}

		point := map[string]interface{}{
			"id":            id,
			"trajectory_id": trajectoryID,
			"lat":           latitude,
			"lng":           longitude,
			"altitude":      altitude,
			"time":          time,
			"timestamp":     timestamp,
		}

		points = append(points, point)
	}

	return points, nil
}

func (s *TrajectoryServices) GetTrajectoryPointsCount(trajectoryID uint) (int, error) {
	var count int
	err := s.DB.Raw(`
		SELECT COUNT(*) FROM trajectory_points WHERE trajectory_id = ?
	`, trajectoryID).Scan(&count).Error

	return count, err
}

func (s *TrajectoryServices) CreateTrajectory(userID uint, startTime, endTime string, points []map[string]any) (*models.Trajectory, error) {
	// Tạo trajectory
	trajectory := models.Trajectory{
		UserID:    userID,
		StartTime: func() time.Time {
			parsedTime, err := time.Parse(time.RFC3339, startTime)
			if err != nil {
				panic("invalid startTime format, must be RFC3339")
			}
			return parsedTime
		}(),
		EndTime: func() time.Time {
			parsedTime, err := time.Parse(time.RFC3339, endTime)
			if err != nil {
				panic("invalid endTime format, must be RFC3339")
			}
			return parsedTime
		}(),
	}

	// Bắt đầu transaction
	tx := s.DB.Begin()

	// Lưu trajectory
	if err := tx.Create(&trajectory).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Thêm các điểm vào trajectory
	if points != nil && len(points) > 0 {
		for _, point := range points {
			// Lấy dữ liệu từ map
			lat, latOk := point["lat"].(float64)
			lng, lngOk := point["lng"].(float64)
			if !latOk || !lngOk {
				tx.Rollback()
				return nil, errors.New("invalid point data: lat and lng must be numbers")
			}

			// Lấy thời gian, có thể là timestamp hoặc string
			var timeStr string
			if timestamp, ok := point["timestamp"].(string); ok {
				timeStr = timestamp
			} else {
				// Sử dụng thời gian hiện tại nếu không có
				timeStr = time.Now().Format(time.RFC3339)
			}

			// Tạo query raw để insert điểm
			err := tx.Exec(`
				INSERT INTO trajectory_points (trajectory_id, latitude, longitude, time)
				VALUES (?, ?, ?, ?)
			`, trajectory.ID, lat, lng, timeStr).Error

			if err != nil {
				tx.Rollback()
				return nil, err
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return &trajectory, nil
}

func (s *TrajectoryServices) UpdateTrajectory(trajectory *models.Trajectory, points []map[string]any) error {
	// Bắt đầu transaction
	tx := s.DB.Begin()

	// Cập nhật trajectory
	if err := tx.Save(trajectory).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Xóa các điểm cũ
	if err := tx.Exec("DELETE FROM trajectory_points WHERE trajectory_id = ?", trajectory.ID).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Thêm các điểm mới
	if points != nil && len(points) > 0 {
		for _, point := range points {
			// Lấy dữ liệu từ map
			lat, latOk := point["lat"].(float64)
			lng, lngOk := point["lng"].(float64)
			if !latOk || !lngOk {
				tx.Rollback()
				return errors.New("invalid point data: lat and lng must be numbers")
			}

			// Lấy thời gian, có thể là timestamp hoặc string
			var timeStr string
			if timestamp, ok := point["timestamp"].(string); ok {
				timeStr = timestamp
			} else {
				// Sử dụng thời gian hiện tại nếu không có
				timeStr = time.Now().Format(time.RFC3339)
			}

			// Tạo query raw để insert điểm
			err := tx.Exec(`
				INSERT INTO trajectory_points (trajectory_id, latitude, longitude, time)
				VALUES (?, ?, ?, ?)
			`, trajectory.ID, lat, lng, timeStr).Error

			if err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	// Commit transaction
	return tx.Commit().Error
}

func (s *TrajectoryServices) DeleteTrajectory(id uint) error {
	// Bắt đầu transaction
	tx := s.DB.Begin()

	// Xóa các điểm trước
	if err := tx.Exec("DELETE FROM trajectory_points WHERE trajectory_id = ?", id).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Xóa trajectory
	if err := tx.Delete(&models.Trajectory{}, id).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Commit transaction
	return tx.Commit().Error
}

func (s *TrajectoryServices) GetTrajectoryCount() (int64, error) {
	var count int64
	err := s.DB.Model(&models.Trajectory{}).Count(&count).Error
	return count, err
}
