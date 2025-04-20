package algorithms

import (
	"time"

	"github.com/th1enq/go-map/internal/models"
)

// HierarchicalClusteringParams holds parameters for the hierarchical clustering algorithm
type HierarchicalClusteringParams struct {
	Epsilon     float64   // Maximum distance between points to be considered neighbors
	MinPoints   int       // Minimum number of points to form a cluster
	MaxLayers   int       // Maximum number of layers in the hierarchy
	LayerScales []float64 // Scale factors for each layer (e.g., [1.0, 2.0, 4.0])
}

// BuildHierarchicalFramework builds a hierarchical framework F from stay points
func BuildHierarchicalFramework(stayPoints []models.StayPoint, params HierarchicalClusteringParams) (*models.HierarchicalFramework, error) {
	if len(stayPoints) == 0 {
		return nil, nil
	}

	// Create the framework
	framework := &models.HierarchicalFramework{
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Create layers with different scales
	for i := 0; i < params.MaxLayers; i++ {
		// Calculate layer-specific parameters
		layerEpsilon := params.Epsilon * params.LayerScales[i]
		layerMinPoints := params.MinPoints

		// Create a new layer
		layer := &models.Layer{
			Level:     i + 1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		// Convert stay points to points for clustering
		points := make([]Point, len(stayPoints))
		for j, sp := range stayPoints {
			points[j] = Point{
				ID:          sp.ID,
				UserID:      sp.UserID,
				Latitude:    sp.Latitude,
				Longitude:   sp.Longitude,
				ArrivalTime: sp.ArrivalTime,
				LeaveTime:   sp.DepartureTime,
			}
		}

		// Perform DBSCAN clustering for this layer
		dbscanParams := DBSCANParams{
			Epsilon:     layerEpsilon,
			MinPoints:   layerMinPoints,
			MaxClusters: params.MaxLayers,
		}

		clusters := dbscan(points, dbscanParams)

		// Convert clusters to database models
		for _, cluster := range clusters {
			// Calculate cluster center and radius
			centerLat, centerLng, radius, visitCount := calculateClusterMetrics(cluster.Points)

			if visitCount > 0 {

				// Create cluster in the layer
				layer.Clusters = append(layer.Clusters, models.Cluster{
					CenterLat:  centerLat,
					CenterLng:  centerLng,
					Radius:     radius,
					CreatedAt:  time.Now(),
					UpdatedAt:  time.Now(),
					VisitCount: visitCount,
				})
			}
		}

		framework.Layers = append(framework.Layers, *layer)
	}

	return framework, nil
}

// GetClustersAtLayer returns clusters at a specific layer in the framework
func GetClustersAtLayer(framework *models.HierarchicalFramework, layerLevel int) []models.Cluster {
	for _, layer := range framework.Layers {
		if layer.Level == layerLevel {
			return layer.Clusters
		}
	}
	return nil
}

// GetStayPointsInCluster returns all stay points in a specific cluster
func GetStayPointsInCluster(cluster models.Cluster, stayPoints []models.StayPoint) []models.StayPoint {
	var result []models.StayPoint
	for _, sp := range stayPoints {
		distance := Distance(cluster.CenterLat, cluster.CenterLng, sp.Latitude, sp.Longitude)
		if distance <= cluster.Radius {
			result = append(result, sp)
		}
	}
	return result
}

// FindParentCluster finds the parent cluster of a given cluster in the next layer
func FindParentCluster(cluster models.Cluster, nextLayer []models.Cluster) *models.Cluster {
	for _, parent := range nextLayer {
		distance := Distance(cluster.CenterLat, cluster.CenterLng, parent.CenterLat, parent.CenterLng)
		if distance <= parent.Radius {
			return &parent
		}
	}
	return nil
}

// FindChildClusters finds all child clusters of a given cluster in the previous layer
func FindChildClusters(cluster models.Cluster, prevLayer []models.Cluster) []models.Cluster {
	var children []models.Cluster
	for _, child := range prevLayer {
		distance := Distance(cluster.CenterLat, cluster.CenterLng, child.CenterLat, child.CenterLng)
		if distance <= cluster.Radius {
			children = append(children, child)
		}
	}
	return children
}
