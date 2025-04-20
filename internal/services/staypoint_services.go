package services

import (
	"errors"
	"sort"
	"time"

	"github.com/th1enq/go-map/internal/algorithms"
	"github.com/th1enq/go-map/internal/db"
	"github.com/th1enq/go-map/internal/models"
	"gorm.io/gorm"
)

type StayPointServices struct {
	DB *db.DB
}

func NewStayPointServices(db *db.DB) *StayPointServices {
	return &StayPointServices{DB: db}
}

func (r *StayPointServices) GetByUserID(userID uint) ([]models.StayPoint, error) {
	var staypoints []models.StayPoint
	result := r.DB.Where("user_id = ?", userID).Find(&staypoints)
	if result.Error != nil {
		return nil, result.Error
	}
	return staypoints, nil
}

func (r *StayPointServices) GetByID(id uint) (*models.StayPoint, error) {
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

func (r *StayPointServices) GetByTrajectoryID(trajectoryID uint) ([]models.StayPoint, error) {
	var staypoints []models.StayPoint
	result := r.DB.Where("trajectory_id = ?", trajectoryID).Find(&staypoints)
	if result.Error != nil {
		return nil, result.Error
	}
	return staypoints, nil
}

func (r *StayPointServices) Create(staypoint models.StayPoint) (uint, error) {
	result := r.DB.Create(&staypoint)
	if result.Error != nil {
		return 0, result.Error
	}
	return staypoint.ID, nil
}

func (r *StayPointServices) Update(staypoint models.StayPoint) error {
	result := r.DB.Save(&staypoint)
	return result.Error
}

func (r *StayPointServices) Delete(id uint) error {
	result := r.DB.Delete(&models.StayPoint{}, id)
	return result.Error
}

func (r *StayPointServices) BatchCreate(staypoints []models.StayPoint) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		for i := range staypoints {
			if err := tx.Create(&staypoints[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *StayPointServices) FindNearby(lat, lng float64, radiusKm float64) ([]models.StayPoint, error) {
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

func (r *StayPointServices) FindPopular(limit int) ([]models.StayPoint, error) {
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

// GroupNearbyStayPoints groups stay points that are close to each other in both space and time
// distanceThreshold: maximum distance in meters between stay points to be considered the same location
// timeThreshold: maximum time difference in hours between stay points to be considered the same location
func (r *StayPointServices) GroupNearbyStayPoints(userID uint, distanceThreshold float64, timeThreshold time.Duration) ([][]models.StayPoint, error) {
	// Lấy tất cả stay points của user
	stayPoints, err := r.GetByUserID(userID)
	if err != nil {
		return nil, err
	}

	if len(stayPoints) == 0 {
		return nil, nil
	}

	// Sắp xếp theo thời gian đến (ArrivalTime)
	sortedStayPoints := make([]models.StayPoint, len(stayPoints))
	copy(sortedStayPoints, stayPoints)
	sort.Slice(sortedStayPoints, func(i, j int) bool {
		return sortedStayPoints[i].ArrivalTime.Before(sortedStayPoints[j].ArrivalTime)
	})

	var groups [][]models.StayPoint
	visited := make(map[uint]bool)

	for i := 0; i < len(sortedStayPoints); i++ {
		if visited[sortedStayPoints[i].ID] {
			continue
		}

		// Tạo nhóm mới
		group := []models.StayPoint{sortedStayPoints[i]}
		visited[sortedStayPoints[i].ID] = true

		// Duyệt các điểm tiếp theo
		for j := i + 1; j < len(sortedStayPoints); j++ {
			if visited[sortedStayPoints[j].ID] {
				continue
			}

			last := group[len(group)-1] // so sánh với phần tử cuối trong group

			// Tính khoảng cách (m -> km * 1000)
			distance := algorithms.Distance(
				last.Latitude,
				last.Longitude,
				sortedStayPoints[j].Latitude,
				sortedStayPoints[j].Longitude,
			) * 1000

			// Tính độ lệch thời gian
			timeDiff := sortedStayPoints[j].ArrivalTime.Sub(last.ArrivalTime)

			// Nếu gần nhau, thêm vào nhóm
			if distance <= distanceThreshold && timeDiff <= timeThreshold {
				group = append(group, sortedStayPoints[j])
				visited[sortedStayPoints[j].ID] = true
			} else {
				// Nếu không còn gần nữa thì dừng (vì đã sort theo thời gian)
				break
			}
		}

		if len(group) > 1 {
			groups = append(groups, group)
		}
	}

	return groups, nil
}

func (r *StayPointServices) GetAll() ([]models.StayPoint, error) {
	var staypoints []models.StayPoint
	result := r.DB.Find(&staypoints)
	if result.Error != nil {
		return nil, result.Error
	}
	return staypoints, nil
}
