package services

import (
	"encoding/json"
	"errors"

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
