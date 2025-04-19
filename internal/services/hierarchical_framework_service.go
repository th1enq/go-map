package services

import (
	"time"

	"github.com/th1enq/go-map/internal/algorithms"
	"github.com/th1enq/go-map/internal/models"
	"gorm.io/gorm"
)

// HierarchicalFrameworkService handles operations related to the hierarchical framework
type HierarchicalFrameworkService struct {
	db *gorm.DB
}

func NewHierarchicalFrameworkService(db *gorm.DB) *HierarchicalFrameworkService {
	return &HierarchicalFrameworkService{db: db}
}

// CreateFramework creates a new hierarchical framework
func (s *HierarchicalFrameworkService) CreateFramework() (*models.HierarchicalFramework, error) {
	framework := &models.HierarchicalFramework{
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := s.db.Create(framework).Error; err != nil {
		return nil, err
	}
	return framework, nil
}

// GetFramework retrieves a framework by ID
func (s *HierarchicalFrameworkService) GetFramework(id uint) (*models.HierarchicalFramework, error) {
	var framework models.HierarchicalFramework
	if err := s.db.Preload("Layers.Clusters").First(&framework, id).Error; err != nil {
		return nil, err
	}
	return &framework, nil
}

// CreateLayer creates a new layer in the framework
func (s *HierarchicalFrameworkService) CreateLayer(frameworkID uint, level int) (*models.Layer, error) {
	layer := &models.Layer{
		FrameworkID: frameworkID,
		Level:       level,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := s.db.Create(layer).Error; err != nil {
		return nil, err
	}
	return layer, nil
}

// CreateCluster creates a new cluster in a layer
func (s *HierarchicalFrameworkService) CreateCluster(layerID uint, centerLat, centerLng, radius float64) (*models.Cluster, error) {
	// Get the layer to find the framework ID
	var layer models.Layer
	if err := s.db.First(&layer, layerID).Error; err != nil {
		return nil, err
	}

	cluster := &models.Cluster{
		FrameworkID: layer.FrameworkID,
		LayerID:     layerID,
		CenterLat:   centerLat,
		CenterLng:   centerLng,
		Radius:      radius,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := s.db.Create(cluster).Error; err != nil {
		return nil, err
	}
	return cluster, nil
}

// AddStayPointToCluster adds a stay point to a cluster
func (s *HierarchicalFrameworkService) AddStayPointToCluster(clusterID uint, stayPointID uint) error {
	var cluster models.Cluster
	if err := s.db.First(&cluster, clusterID).Error; err != nil {
		return err
	}

	var stayPoint models.StayPoint
	if err := s.db.First(&stayPoint, stayPointID).Error; err != nil {
		return err
	}

	return s.db.Model(&cluster).Association("StayPoints").Append(&stayPoint)
}

// GetClustersAtLayer returns all clusters at a specific layer
func (s *HierarchicalFrameworkService) GetClustersAtLayer(layerID uint) ([]models.Cluster, error) {
	var clusters []models.Cluster
	if err := s.db.Where("layer_id = ?", layerID).Find(&clusters).Error; err != nil {
		return nil, err
	}
	return clusters, nil
}

// GetStayPointsInCluster returns all stay points in a cluster
func (s *HierarchicalFrameworkService) GetStayPointsInCluster(clusterID uint) ([]models.StayPoint, error) {
	var cluster models.Cluster
	if err := s.db.Preload("StayPoints").First(&cluster, clusterID).Error; err != nil {
		return nil, err
	}
	return cluster.StayPoints, nil
}

// UpdateClusterMetrics updates the metrics of a cluster
func (s *HierarchicalFrameworkService) UpdateClusterMetrics(clusterID uint) error {
	var cluster models.Cluster
	if err := s.db.Preload("StayPoints").First(&cluster, clusterID).Error; err != nil {
		return err
	}

	// Calculate new center and radius
	var sumLat, sumLng float64
	var maxDistance float64
	for _, sp := range cluster.StayPoints {
		sumLat += sp.Latitude
		sumLng += sp.Longitude
	}

	if len(cluster.StayPoints) > 0 {
		centerLat := sumLat / float64(len(cluster.StayPoints))
		centerLng := sumLng / float64(len(cluster.StayPoints))

		// Calculate maximum distance from center
		for _, sp := range cluster.StayPoints {
			distance := algorithms.Distance(centerLat, centerLng, sp.Latitude, sp.Longitude)
			if distance > maxDistance {
				maxDistance = distance
			}
		}

		// Update cluster metrics
		cluster.CenterLat = centerLat
		cluster.CenterLng = centerLng
		cluster.Radius = maxDistance
		cluster.UpdatedAt = time.Now()

		return s.db.Save(&cluster).Error
	}

	return nil
}

// CreateHierarchicalGraph creates a new hierarchical graph for a user
func (s *HierarchicalFrameworkService) CreateHierarchicalGraph(userID, frameworkID uint) (*models.HierarchicalGraph, error) {
	graph := &models.HierarchicalGraph{
		UserID:      userID,
		FrameworkID: frameworkID,
	}
	if err := s.db.Create(graph).Error; err != nil {
		return nil, err
	}
	return graph, nil
}

// AddNodeToGraph adds a node to a user's hierarchical graph
func (s *HierarchicalFrameworkService) AddNodeToGraph(graphID, clusterID uint) (*models.GraphNode, error) {
	node := &models.GraphNode{
		GraphID:      graphID,
		ClusterID:    clusterID,
		FirstVisitAt: time.Now(),
		LastVisitAt:  time.Now(),
	}
	if err := s.db.Create(node).Error; err != nil {
		return nil, err
	}
	return node, nil
}

// AddEdgeToGraph adds an edge between two nodes in a user's hierarchical graph
func (s *HierarchicalFrameworkService) AddEdgeToGraph(graphID, fromNodeID, toNodeID uint, transitionTime int) (*models.GraphEdge, error) {
	edge := &models.GraphEdge{
		GraphID:        graphID,
		FromNodeID:     fromNodeID,
		ToNodeID:       toNodeID,
		TransitionTime: transitionTime,
	}
	if err := s.db.Create(edge).Error; err != nil {
		return nil, err
	}
	return edge, nil
}

// UpdateNodeVisit updates a node's visit information
func (s *HierarchicalFrameworkService) UpdateNodeVisit(nodeID uint) error {
	return s.db.Model(&models.GraphNode{}).Where("id = ?", nodeID).Updates(map[string]interface{}{
		"visit_count":   gorm.Expr("visit_count + 1"),
		"last_visit_at": time.Now(),
	}).Error
}

// UpdateEdgeVisit updates an edge's visit information
func (s *HierarchicalFrameworkService) UpdateEdgeVisit(edgeID uint) error {
	return s.db.Model(&models.GraphEdge{}).Where("id = ?", edgeID).Update("visit_count", gorm.Expr("visit_count + 1")).Error
}

// GetUserGraph retrieves a user's hierarchical graph
func (s *HierarchicalFrameworkService) GetUserGraph(userID, frameworkID uint) (*models.HierarchicalGraph, error) {
	var graph models.HierarchicalGraph
	if err := s.db.Preload("Nodes").Preload("Edges").
		Where("user_id = ? AND framework_id = ?", userID, frameworkID).
		First(&graph).Error; err != nil {
		return nil, err
	}
	return &graph, nil
}

// GetCluster retrieves a cluster by ID
func (s *HierarchicalFrameworkService) GetCluster(id uint) (*models.Cluster, error) {
	var cluster models.Cluster
	if err := s.db.First(&cluster, id).Error; err != nil {
		return nil, err
	}
	return &cluster, nil
}
