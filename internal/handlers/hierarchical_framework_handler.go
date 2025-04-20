package handlers

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/algorithms"
	"github.com/th1enq/go-map/internal/models"
	"github.com/th1enq/go-map/internal/services"
)

type HierarchicalFrameworkHandler struct {
	frameworkService *services.HierarchicalFrameworkService
	stayPointService *services.StayPointServices
	locationServices *services.LocationServices
}

func NewHierarchicalFrameworkHandler(
	frameworkService *services.HierarchicalFrameworkService,
	stayPointService *services.StayPointServices,
	locationServices *services.LocationServices,
) *HierarchicalFrameworkHandler {
	return &HierarchicalFrameworkHandler{
		frameworkService: frameworkService,
		stayPointService: stayPointService,
		locationServices: locationServices,
	}
}

// BuildFramework builds a new hierarchical framework from stay points
func (h *HierarchicalFrameworkHandler) BuildFramework() {
	// Get all stay points
	stayPoints, err := h.stayPointService.GetAll()
	if err != nil {
		log.Fatalf("failed to load staypoints: %v", err)
		return
	}

	if len(stayPoints) == 0 {
		log.Println("No stay points found to build framework")
		return
	}

	// Define clustering parameters
	params := algorithms.HierarchicalClusteringParams{
		Epsilon:     0.1, // 200 meters
		MinPoints:   2,
		MaxLayers:   3,
		LayerScales: []float64{1.0, 2.0, 4.0}, // Each layer has double the scale of the previous
	}

	// Build the framework
	framework, err := algorithms.BuildHierarchicalFramework(stayPoints, params)
	if err != nil {
		log.Fatalf("failed to build hf: %v", err)
		return
	}

	if framework == nil {
		log.Println("Failed to build framework: no valid clusters found")
		return
	}

	// Save the framework to database
	dbFramework, err := h.frameworkService.CreateFramework()
	if err != nil {
		log.Fatalf("failed to save in db: %v", err)
		return
	}

	// Save layers and clusters
	for i, layer := range framework.Layers {
		// Create layer
		dbLayer, err := h.frameworkService.CreateLayer(dbFramework.ID, layer.Level)
		if err != nil {
			log.Fatalf("failed to create layer: %v", err)
			return
		}

		// Create clusters in the layer
		for _, cluster := range layer.Clusters {
			value, err := h.frameworkService.CreateCluster(dbLayer.ID, cluster.CenterLat, cluster.CenterLng, cluster.Radius, cluster.VisitCount)
			if err != nil {
				log.Fatalf("failed to create cluster: %v", err)
				return
			}

			if i == 0 {
				// Create new location
				newLocation := models.Location{
					Latitude:   value.CenterLat,
					Longitude:  value.CenterLng,
					ClusterID:  value.ID,
					VisitCount: value.VisitCount,
				}

				// Save to database
				_, err := h.locationServices.Create(newLocation)
				if err != nil {
					continue
				}
			}
		}
	}
}

// GetClustersAtLayer returns all clusters at a specific layer
func (h *HierarchicalFrameworkHandler) GetClustersAtLayer(c *gin.Context) {
	frameworkIDStr := c.Param("frameworkID")
	layerLevelStr := c.Param("layerLevel")

	// Convert string parameters to appropriate types
	var frameworkID uint
	if _, err := fmt.Sscanf(frameworkIDStr, "%d", &frameworkID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}

	var layerLevel int
	if _, err := fmt.Sscanf(layerLevelStr, "%d", &layerLevel); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid layer level"})
		return
	}

	// Get framework
	framework, err := h.frameworkService.GetFramework(frameworkID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get clusters at the specified layer
	clusters := algorithms.GetClustersAtLayer(framework, layerLevel)
	if clusters == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Layer not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"clusters": clusters,
	})
}

// GetStayPointsInCluster returns all stay points in a specific cluster
func (h *HierarchicalFrameworkHandler) GetStayPointsInCluster(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")

	// Convert string parameter to uint
	var clusterID uint
	if _, err := fmt.Sscanf(clusterIDStr, "%d", &clusterID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cluster ID"})
		return
	}

	// Get cluster
	cluster, err := h.frameworkService.GetCluster(clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get all stay points
	stayPoints, err := h.stayPointService.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get stay points in the cluster
	clusterStayPoints := algorithms.GetStayPointsInCluster(*cluster, stayPoints)

	c.JSON(http.StatusOK, gin.H{
		"stay_points": clusterStayPoints,
	})
}

// GetParentCluster returns the parent cluster of a given cluster
func (h *HierarchicalFrameworkHandler) GetParentCluster(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")

	// Convert string parameter to uint
	var clusterID uint
	if _, err := fmt.Sscanf(clusterIDStr, "%d", &clusterID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cluster ID"})
		return
	}

	// Get cluster
	cluster, err := h.frameworkService.GetCluster(clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get next layer
	nextLayer, err := h.frameworkService.GetClustersAtLayer(cluster.LayerID + 1)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Find parent cluster
	parent := algorithms.FindParentCluster(*cluster, nextLayer)
	if parent == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Parent cluster not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"parent_cluster": parent,
	})
}

// GetChildClusters returns all child clusters of a given cluster
func (h *HierarchicalFrameworkHandler) GetChildClusters(c *gin.Context) {
	clusterIDStr := c.Param("clusterID")

	// Convert string parameter to uint
	var clusterID uint
	if _, err := fmt.Sscanf(clusterIDStr, "%d", &clusterID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cluster ID"})
		return
	}

	// Get cluster
	cluster, err := h.frameworkService.GetCluster(clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get previous layer
	prevLayer, err := h.frameworkService.GetClustersAtLayer(cluster.LayerID - 1)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Find child clusters
	children := algorithms.FindChildClusters(*cluster, prevLayer)

	c.JSON(http.StatusOK, gin.H{
		"child_clusters": children,
	})
}
