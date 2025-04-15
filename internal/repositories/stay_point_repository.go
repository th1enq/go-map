package repositories

import (
	"errors"

	"github.com/th1enq/go-map/internal/models"
	"gorm.io/gorm"
)

type StayPointRepository struct {
	DB *gorm.DB
}

func NewStayPointRepository(db *gorm.DB) *StayPointRepository {
	return &StayPointRepository{DB: db}
}

func (r *StayPointRepository) GetByUserID(userID uint) ([]models.StayPoint, error) {
	var staypoints []models.StayPoint
	result := r.DB.Where("user_id = ?", userID).Find(&staypoints)
	if result.Error != nil {
		return nil, result.Error
	}
	return staypoints, nil
}

func (r *StayPointRepository) GetByID(id uint) (*models.StayPoint, error) {
	var staypoint models.StayPoint
	result := r.DB.First(&staypoint, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("staypoint not found")
		}
		return nil, result.Error
	}
	return &staypoint, nil
}

func (r *StayPointRepository) GetByTrajectoryID(trajectoryID uint) ([]models.StayPoint, error) {
	var staypoints []models.StayPoint
	result := r.DB.Where("trajectory_id = ?", trajectoryID).Find(&staypoints)
	if result.Error != nil {
		return nil, result.Error
	}
	return staypoints, nil
}

func (r *StayPointRepository) Create(staypoint models.StayPoint) (uint, error) {
	result := r.DB.Create(&staypoint)
	if result.Error != nil {
		return 0, result.Error
	}
	return staypoint.ID, nil
}

func (r *StayPointRepository) Update(staypoint models.StayPoint) error {
	result := r.DB.Save(&staypoint)
	return result.Error
}

func (r *StayPointRepository) Delete(id uint) error {
	result := r.DB.Delete(&models.StayPoint{}, id)
	return result.Error
}

func (r *StayPointRepository) BatchCreate(staypoints []models.StayPoint) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		for i := range staypoints {
			if err := tx.Create(&staypoints[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *StayPointRepository) FindNearby(lat, lng float64, radiusKm float64) ([]models.StayPoint, error) {
	var staypoints []models.StayPoint

	result := r.DB.Raw(`
		SELECT * FROM staypoints 
		WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
	`, lng, lat, radiusKm*1000).Scan(&staypoints)

	if result.Error != nil {
		return nil, result.Error
	}

	return staypoints, nil
}

func (r *StayPointRepository) FindPopular(limit int) ([]models.StayPoint, error) {
	var staypoints []models.StayPoint

	result := r.DB.Raw(`
		WITH clusters AS (
			SELECT 
				id,
				ST_ClusterDBSCAN(geom, eps := 100, minpoints := 2) OVER () AS cluster_id
			FROM staypoints
		),
		cluster_counts AS (
			SELECT 
				cluster_id, 
				COUNT(*) as point_count
			FROM clusters
			WHERE cluster_id IS NOT NULL
			GROUP BY cluster_id
			ORDER BY point_count DESC
			LIMIT ?
		)
		SELECT s.* FROM staypoints s
		JOIN clusters c ON s.id = c.id
		JOIN cluster_counts cc ON c.cluster_id = cc.cluster_id
		LIMIT ?
	`, limit, limit).Scan(&staypoints)

	if result.Error != nil {
		return nil, result.Error
	}

	return staypoints, nil
}
