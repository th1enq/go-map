package algorithms

import (
	"encoding/json"
	"sort"
	"time"

	"github.com/th1enq/go-map/internal/models"
)

func StayPointDetection(trajectory models.Trajectory, distThreshold float64, timeThreshold time.Duration) []models.StayPoint {
	var stayPoints []models.StayPoint

	var points []models.GPSPoint
	if err := json.Unmarshal([]byte(trajectory.Points), &points); err != nil {
		return stayPoints
	}

	if len(points) < 2 {
		return stayPoints
	}

	// Sort by timestamp to ensure chronological order
	sort.Slice(points, func(i, j int) bool {
		return points[i].Timestamp.Before(points[j].Timestamp)
	})

	i := 0
	for i < len(points)-1 { // Ensure i never reaches the last point
		j := i + 1
		foundStay := false

		// Set a maximum for j to prevent excessive loop iterations
		jMax := len(points)
		if i+1000 < len(points) {
			// Limit processing window to 1000 points to improve performance
			jMax = i + 1000
		}

		for j < jMax {
			dist := Distance(points[i].Latitude, points[i].Longitude, points[j].Latitude, points[j].Longitude) * 1000
			if dist <= distThreshold {
				deltaT := points[j].Timestamp.Sub(points[i].Timestamp)
				if deltaT > timeThreshold {
					var sumLat, sumLng float64
					for k := i; k <= j; k++ {
						sumLat += points[k].Latitude
						sumLng += points[k].Longitude
					}
					count := float64(j - i + 1)
					stayPoints = append(stayPoints, models.StayPoint{
						UserID:        trajectory.UserID,
						TrajectoryID:  trajectory.ID,
						Latitude:      sumLat / count,
						Longitude:     sumLng / count,
						ArrivalTime:   points[i].Timestamp,
						DepartureTime: points[j].Timestamp,
					})

					// Ensure i advances to avoid infinite loop
					i = j + 1 // Move i past j instead of setting i = j
					foundStay = true
					break
				}
			} else {
				// If distance exceeds threshold, we can't have a stay point
				// No need to check more points from this i position
				break
			}
			j++
		}

		if !foundStay {
			i++ // Increment i to check the next point
		}
	}

	return stayPoints
}
