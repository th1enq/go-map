package services

import (
	"errors"

	"github.com/th1enq/go-map/internal/models"

	"gorm.io/gorm"
)

type LocationServices struct {
	DB *gorm.DB
}

func NewLocationServices(db *gorm.DB) *LocationServices {
	return &LocationServices{DB: db}
}

func (r *LocationServices) GetAll() ([]models.Location, error) {
	var locations []models.Location
	result := r.DB.Find(&locations)
	if result.Error != nil {
		return nil, result.Error
	}
	return locations, nil
}
func (r *LocationServices) GetByID(id uint) (*models.Location, error) {
	var location models.Location
	result := r.DB.First(&location, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("location not found")
		}
		return nil, result.Error
	}
	return &location, nil
}

func (r *LocationServices) Create(location models.Location) (uint, error) {
	result := r.DB.Create(&location)
	if result.Error != nil {
		return 0, result.Error
	}
	return location.ID, nil
}

func (r *LocationServices) Update(location models.Location) error {
	result := r.DB.Save(&location)
	return result.Error
}

func (r *LocationServices) Delete(id uint) error {
	result := r.DB.Delete(&models.Location{}, id)
	return result.Error
}

func (r *LocationServices) IncrementVisitCount(id uint) error {
	result := r.DB.Model(&models.Location{}).Where("id = ?", id).
		UpdateColumn("visit_count", gorm.Expr("visit_count + ?", 1))
	return result.Error
}

func (r *LocationServices) SearchByActivity(lat, lng float64, activity string, radiusKm float64) ([]models.Location, error) {
	var locations []models.Location
	result := r.DB.Raw(`
		SELECT * FROM locations 
		WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
		AND activities::text LIKE ?
	`, lng, lat, radiusKm*1000, "%"+activity+"%").Scan(&locations)

	if result.Error != nil {
		return nil, result.Error
	}

	return locations, nil
}

func (r *LocationServices) FindMostVisited(lat, lng float64, radiusKm float64, limit int) ([]models.Location, error) {
	var locations []models.Location

	result := r.DB.Raw(`
		SELECT * FROM locations 
		WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
		ORDER BY visit_count DESC
		LIMIT ?
	`, lng, lat, radiusKm*1000, limit).Scan(&locations)

	if result.Error != nil {
		return nil, result.Error
	}

	return locations, nil
}

func (r *LocationServices) FindNearby(lat, lng float64, radiusKm float64) ([]models.Location, error) {
	var locations []models.Location

	result := r.DB.Raw(`
		SELECT * FROM locations 
		WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
	`, lng, lat, radiusKm*1000).Scan(&locations)

	if result.Error != nil {
		return nil, result.Error
	}

	return locations, nil
}

func (r *LocationServices) GetByUser(userID uint) ([]models.Location, error) {
	var locations []models.Location
	result := r.DB.Where("user_id = ?", userID).Find(&locations)
	if result.Error != nil {
		return nil, result.Error
	}
	return locations, nil
}
