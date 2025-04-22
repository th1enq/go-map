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

// Các hàm bổ sung cho admin
func (s *LocationServices) GetAllLocations() ([]models.Location, error) {
	var locations []models.Location
	err := s.DB.Find(&locations).Error
	if err != nil {
		return nil, err
	}
	return locations, nil
}

func (s *LocationServices) GetLocationByID(id uint) (*models.Location, error) {
	var location models.Location
	err := s.DB.First(&location, id).Error
	if err != nil {
		return nil, err
	}
	return &location, nil
}

func (s *LocationServices) CreateLocation(location *models.Location) error {
	err := s.DB.Create(&location).Error
	return err
}

func (s *LocationServices) UpdateLocation(location *models.Location) error {
	return s.DB.Save(location).Error
}

func (s *LocationServices) DeleteLocation(id uint) error {
	return s.DB.Delete(&models.Location{}, id).Error
}

func (s *LocationServices) GetLocationCount() (int64, error) {
	var count int64
	err := s.DB.Model(&models.Location{}).Count(&count).Error
	return count, err
}

// GetByUserPaginated retrieves locations for a specific user with pagination
func (s *LocationServices) GetByUserPaginated(userID uint, offset, limit int) ([]models.Location, error) {
	var locations []models.Location
	result := s.DB.Where("user_id = ?", userID).Offset(offset).Limit(limit).Order("created_at DESC").Find(&locations)
	if result.Error != nil {
		return nil, result.Error
	}
	return locations, nil
}

// GetUserLocationsCount returns the total number of locations for a user
func (s *LocationServices) GetUserLocationsCount(userID uint) (int64, error) {
	var count int64
	result := s.DB.Model(&models.Location{}).Where("user_id = ?", userID).Count(&count)
	if result.Error != nil {
		return 0, result.Error
	}
	return count, nil
}

// GetLocationsPaginated returns locations with pagination
func (s *LocationServices) GetLocationsPaginated(offset, limit int) ([]models.Location, error) {
	var locations []models.Location
	result := s.DB.Offset(offset).Limit(limit).Order("id ASC").Find(&locations)
	if result.Error != nil {
		return nil, result.Error
	}
	return locations, nil
}
