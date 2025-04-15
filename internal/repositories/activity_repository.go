package repositories

import (
	"errors"

	"github.com/th1enq/go-map/internal/models"
	"gorm.io/gorm"
)

type ActivityRepository struct {
	DB *gorm.DB
}

func NewActivityRepository(db *gorm.DB) *ActivityRepository {
	return &ActivityRepository{
		DB: db,
	}
}

func (r *ActivityRepository) GetAll() ([]models.Activity, error) {
	var activities []models.Activity
	if err := r.DB.Find(&activities).Error; err != nil {
		return nil, err
	}
	return activities, nil
}

func (r *ActivityRepository) GetByID(id uint) (*models.Activity, error) {
	var activity models.Activity
	if err := r.DB.First(&activity, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("activity not found")
		}
		return nil, err
	}
	return &activity, nil
}

func (r *ActivityRepository) GetByName(name string) (*models.Activity, error) {
	var activity models.Activity
	if err := r.DB.Where("name = ?", name).First(&activity).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("activity not found")
		}
		return nil, err
	}
	return &activity, nil
}

func (r *ActivityRepository) Create(activity *models.Activity) (uint, error) {
	if err := r.DB.Create(activity).Error; err != nil {
		return 0, err
	}
	return activity.ID, nil
}

func (r *ActivityRepository) Update(activity *models.Activity) error {
	if err := r.DB.Save(activity).Error; err != nil {
		return err
	}
	return nil
}

func (r *ActivityRepository) Delete(id uint) error {
	if err := r.DB.Delete(&models.Activity{}, id).Error; err != nil {
		return err
	}
	return nil
}

func (r *ActivityRepository) FindByCategory(category string) ([]models.Activity, error) {
	var activities []models.Activity

	result := r.DB.Raw(
		`SELECT * FROM activities 
		WHERE category::text LIKE ?`, "%"+category+"%").Scan(&activities)

	if result.Error != nil {
		return nil, result.Error
	}
	return activities, nil
}

func (r *ActivityRepository) SearchNearLocation(lat, lng float64, radiusKm float64) ([]models.Activity, error) {
	var activities []models.Activity

	result := r.DB.Raw(`
		WITH nearby_locations AS (
			SELECT activities FROM locations 
			WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
		)
		SELECT DISTINCT a.* FROM activities a
		WHERE EXISTS (
			SELECT 1 FROM nearby_locations nl, 
			jsonb_array_elements_text(nl.activities) as act
			WHERE act = a.name
		)
	`, lng, lat, radiusKm*1000).Scan(&activities)

	if result.Error != nil {
		return nil, result.Error
	}

	return activities, nil
}
