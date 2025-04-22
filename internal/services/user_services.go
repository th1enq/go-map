package services

import (
	"errors"

	"github.com/th1enq/go-map/internal/db"
	"github.com/th1enq/go-map/internal/models"
	"golang.org/x/crypto/bcrypt"
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

// UpdateUser updates a user's profile in the database
func (s *UserServices) UpdateUser(user *models.User) error {
	return s.DB.Save(user).Error
}

// GetUserLocations retrieves all locations associated with a user
func (s *UserServices) GetUserLocations(userID uint) ([]models.Location, error) {
	var locations []models.Location
	err := s.DB.Where("user_id = ?", userID).Find(&locations).Error
	return locations, err
}

// GetUserTrajectories retrieves all trajectories associated with a user
func (s *UserServices) GetUserTrajectories(userID uint) ([]models.Trajectory, error) {
	var trajectories []models.Trajectory
	err := s.DB.Where("user_id = ?", userID).Find(&trajectories).Error
	return trajectories, err
}

func (r *UserServices) GetUserByID(id uint) (*models.User, error) {
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

// Các hàm bổ sung cho admin
func (s *UserServices) GetAllUsers() ([]models.User, error) {
	var users []models.User
	err := s.DB.Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (s *UserServices) DeleteUser(id uint) error {
	return s.DB.Delete(&models.User{}, id).Error
}

func (s *UserServices) GetUserCount() (int64, error) {
	var count int64
	err := s.DB.Model(&models.User{}).Count(&count).Error
	return count, err
}

func (s *UserServices) UpdateUserPassword(userID uint, newPassword string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return s.DB.Model(&models.User{}).Where("id = ?", userID).Update("password", string(hashedPassword)).Error
}

func (s *UserServices) SetUserRole(userID uint, role string) error {
	return s.DB.Model(&models.User{}).Where("id = ?", userID).Update("role", role).Error
}

// GetUsersPaginated returns users with pagination
func (s *UserServices) GetUsersPaginated(offset, limit int) ([]models.User, error) {
	var users []models.User
	err := s.DB.Offset(offset).Limit(limit).Order("id ASC").Find(&users).Error
	return users, err
}
