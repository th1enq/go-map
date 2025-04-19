package algorithms

import (
	"encoding/json"
	"time"

	"github.com/th1enq/go-map/internal/models"
)

func StayPointDetection(trajectory models.Trajectory, distThreshold float64, timeThreshold time.Duration) []models.StayPoint {
	var stayPoints []models.StayPoint

	var points []models.GPSPoint
	err := json.Unmarshal([]byte(trajectory.Points), &points)
	if err != nil {
		return stayPoints
	}

	pointsCount := len(points)

	if pointsCount < 2 {
		return stayPoints
	}

	i := 0
	for i < pointsCount {
		j := i + 1
		for j < pointsCount {
			dist := Distance(
				points[i].Latitude,
				points[i].Longitude,
				points[j].Latitude,
				points[j].Longitude,
			) * 1000

			if dist > distThreshold {
				deltaT := points[j].Timestamp.Sub(points[i].Timestamp)

				if deltaT > timeThreshold {
					var sumLat, sumLng float64
					for k := i; k < j; k++ {
						sumLat += points[k].Latitude
						sumLng += points[k].Longitude
					}

					avgLat := sumLat / float64(j-i)
					avgLng := sumLng / float64(j-i)

					stayPoint := models.StayPoint{
						UserID:        trajectory.UserID,
						TrajectoryID:  trajectory.ID,
						Latitude:      avgLat,
						Longitude:     avgLng,
						ArrivalTime:   points[i].Timestamp,
						DepartureTime: points[j].Timestamp,
					}

					stayPoints = append(stayPoints, stayPoint)
				}

				i = j
				break
			}

			j++
		}

		if j >= pointsCount {
			break
		}
	}

	return stayPoints
}
