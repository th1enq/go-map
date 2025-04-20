package algorithms

import (
	"time"
)

// DBSCANParams holds parameters for the DBSCAN algorithm
type DBSCANParams struct {
	Epsilon     float64 // Maximum distance between points to be considered neighbors
	MinPoints   int     // Minimum number of points to form a cluster
	MaxClusters int     // Maximum number of clusters to create
}

// Point represents a geographical point with additional metadata
type Point struct {
	ID          uint
	UserID      uint
	Latitude    float64
	Longitude   float64
	ArrivalTime time.Time
	LeaveTime   time.Time
	ClusterID   int
	Visited     bool
}

// Cluster represents a group of points
type Cluster struct {
	ID     int
	Points []Point
}

// dbscan implements the DBSCAN clustering algorithm
func dbscan(points []Point, params DBSCANParams) []Cluster {
	var clusters []Cluster
	clusterID := 0

	for i := range points {
		if points[i].Visited {
			continue
		}

		points[i].Visited = true
		neighbors := getNeighbors(points, i, params.Epsilon)

		if len(neighbors) < params.MinPoints {
			points[i].ClusterID = -1 // Noise point
		} else {
			clusterID++
			expandCluster(points, neighbors, clusterID, params)
			cluster := createCluster(points, clusterID)
			clusters = append(clusters, cluster)
		}
	}

	return clusters
}

// getNeighbors finds all points within epsilon distance of a given point
func getNeighbors(points []Point, pointIndex int, epsilon float64) []int {
	var neighbors []int
	point := points[pointIndex]

	for i := range points {
		if i == pointIndex {
			continue
		}

		distance := Distance(point.Latitude, point.Longitude,
			points[i].Latitude, points[i].Longitude)

		if distance <= epsilon {
			neighbors = append(neighbors, i)
		}
	}

	return neighbors
}

// expandCluster expands a cluster by adding density-reachable points
func expandCluster(points []Point, neighbors []int, clusterID int, params DBSCANParams) {
	for i := 0; i < len(neighbors); i++ {
		pointIndex := neighbors[i]
		if !points[pointIndex].Visited {
			points[pointIndex].Visited = true
			newNeighbors := getNeighbors(points, pointIndex, params.Epsilon)

			if len(newNeighbors) >= params.MinPoints {
				neighbors = append(neighbors, newNeighbors...)
			}
		}

		if points[pointIndex].ClusterID == 0 {
			points[pointIndex].ClusterID = clusterID
		}
	}
}

// createCluster creates a cluster from points with the same cluster ID
func createCluster(points []Point, clusterID int) Cluster {
	var clusterPoints []Point
	for _, point := range points {
		if point.ClusterID == clusterID {
			clusterPoints = append(clusterPoints, point)
		}
	}

	return Cluster{
		ID:     clusterID,
		Points: clusterPoints,
	}
}

// calculateClusterMetrics calculates the center and radius of a cluster
func calculateClusterMetrics(points []Point) (centerLat, centerLng, radius float64, visitCount int) {
	if len(points) == 0 {
		return 0, 0, 0, 0
	}

	// Calculate center
	var sumLat, sumLng float64
	userIDSet := make(map[uint]bool)

	for _, point := range points {
		sumLat += point.Latitude
		sumLng += point.Longitude
		userIDSet[point.UserID] = true
	}
	centerLat = sumLat / float64(len(points))
	centerLng = sumLng / float64(len(points))

	// Calculate visitCount (unique user IDs)
	visitCount = len(userIDSet)

	// Calculate radius (maximum distance from center to any point)
	var maxDistance float64
	for _, point := range points {
		distance := Distance(centerLat, centerLng, point.Latitude, point.Longitude)
		if distance > maxDistance {
			maxDistance = distance
		}
	}

	return centerLat, centerLng, maxDistance, visitCount
}
