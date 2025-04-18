package repositories

import (
	"errors"
	"math"
	"time"

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

// GroupNearbyStayPoints groups stay points that are close to each other in both space and time
// distanceThreshold: maximum distance in meters between stay points to be considered the same location
// timeThreshold: maximum time difference in hours between stay points to be considered the same location
func (r *StayPointRepository) GroupNearbyStayPoints(userID uint, distanceThreshold float64, timeThreshold time.Duration) ([][]models.StayPoint, error) {
	// Get all stay points for the user
	stayPoints, err := r.GetByUserID(userID)
	if err != nil {
		return nil, err
	}

	if len(stayPoints) == 0 {
		return nil, nil
	}

	// Sort stay points by arrival time
	sortedStayPoints := make([]models.StayPoint, len(stayPoints))
	copy(sortedStayPoints, stayPoints)

	// Group nearby stay points
	var groups [][]models.StayPoint
	visited := make(map[uint]bool)

	for i := 0; i < len(sortedStayPoints); i++ {
		if visited[sortedStayPoints[i].ID] {
			continue
		}

		// Start a new group with the current stay point
		group := []models.StayPoint{sortedStayPoints[i]}
		visited[sortedStayPoints[i].ID] = true

		// Check other stay points
		for j := i + 1; j < len(sortedStayPoints); j++ {
			if visited[sortedStayPoints[j].ID] {
				continue
			}

			// Calculate distance between stay points
			distance := Distance(
				sortedStayPoints[i].Latitude,
				sortedStayPoints[i].Longitude,
				sortedStayPoints[j].Latitude,
				sortedStayPoints[j].Longitude,
			) * 1000 // Convert to meters

			// Calculate time difference
			timeDiff := sortedStayPoints[j].ArrivalTime.Sub(sortedStayPoints[i].ArrivalTime)

			// If stay points are close in both space and time, add to group
			if distance <= distanceThreshold && timeDiff <= timeThreshold {
				group = append(group, sortedStayPoints[j])
				visited[sortedStayPoints[j].ID] = true
			}
		}

		// Only add groups with more than one stay point
		if len(group) > 1 {
			groups = append(groups, group)
		}
	}

	return groups, nil
}

// Distance calculates the distance between two points using the Haversine formula
func Distance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth's radius in kilometers
	lat1Rad := lat1 * (3.141592653589793 / 180)
	lon1Rad := lon1 * (3.141592653589793 / 180)
	lat2Rad := lat2 * (3.141592653589793 / 180)
	lon2Rad := lon2 * (3.141592653589793 / 180)

	dlat := lat2Rad - lat1Rad
	dlon := lon2Rad - lon1Rad

	a := (math.Sin(dlat/2) * math.Sin(dlat/2)) +
		(math.Cos(lat1Rad) * math.Cos(lat2Rad) * math.Sin(dlon/2) * math.Sin(dlon/2))
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}
