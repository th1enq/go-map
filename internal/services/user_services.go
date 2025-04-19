package services

import (
	"errors"

	"github.com/th1enq/go-map/internal/db"
	"github.com/th1enq/go-map/internal/models"
	"gorm.io/gorm"
)

type UserServices struct {
	DB *db.DB
}

func NewUserServices(db *db.DB) *UserServices {
	return &UserServices{
		DB: db,
	}
}

func (r *UserServices) GetByID(id uint) (*models.User, error) {
	var user models.User
	if err := r.DB.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserServices) GetByUserName(username string) (*models.User, error) {
	var user models.User
	if err := r.DB.Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (r *UserServices) FindOrCreateByFolder(folder string) (*models.User, error) {
	var user models.User
	err := r.DB.Where("username = ?", folder).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		user = models.User{
			Username: folder,
			Email:    folder + "@geolife.local",
		}
		if err := r.DB.Create(&user).Error; err != nil {
			return nil, err
		}
		return &user, nil
	}
	if err != nil {
		return nil, err
	}

	// Kiểm tra xem user đã có dữ liệu chưa
	var trajectoryCount int64
	if err := r.DB.Model(&models.Trajectory{}).Where("user_id = ?", user.ID).Count(&trajectoryCount).Error; err != nil {
		return nil, err
	}

	// Nếu user đã có dữ liệu, trả về lỗi
	if trajectoryCount > 0 {
		return &user, errors.New("user data already imported")
	}

	return &user, nil
}

func (r *UserServices) Create(user *models.User) (uint, error) {
	if err := r.DB.Create(user).Error; err != nil {
		return 0, err
	}
	return user.ID, nil
}

func (r *UserServices) Update(user *models.User) error {
	if err := r.DB.Save(user).Error; err != nil {
		return err
	}
	return nil
}

func (r *UserServices) Delete(id uint) error {
	if err := r.DB.Delete(&models.User{}, id).Error; err != nil {
		return err
	}
	return nil
}

func (r *UserServices) GetAll() ([]models.User, error) {
	var users []models.User
	if err := r.DB.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (r *UserServices) Count() (int64, error) {
	var count int64
	if err := r.DB.Model(&models.User{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}
