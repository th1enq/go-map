// Package handlers provides HTTP request handlers for the application
package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/algorithms"
	"github.com/th1enq/go-map/internal/models"
	"github.com/th1enq/go-map/internal/services"
)

// HierarchicalFrameworkHandler handles operations related to the hierarchical framework
type HierarchicalFrameworkHandler struct {
	frameworkService *services.HierarchicalFrameworkService
	stayPointService *services.StayPointServices
	locationServices *services.LocationServices
}

// ClusterResponse represents a cluster in the response
type ClusterResponse struct {
	ID         uint    `json:"id"`
	CenterLat  float64 `json:"center_lat"`
	CenterLng  float64 `json:"center_lng"`
	Radius     float64 `json:"radius"`
	LayerID    uint    `json:"layer_id"`
	VisitCount int     `json:"visit_count"`
}

// ClustersResponse represents a response containing clusters
type ClustersResponse struct {
	Clusters []ClusterResponse `json:"clusters"`
}

// StayPointsResponse represents a response containing stay points
type StayPointsResponse struct {
	StayPoints []models.StayPoint `json:"stay_points"`
}

// ParentClusterResponse represents a response containing a parent cluster
type ParentClusterResponse struct {
	ParentCluster ClusterResponse `json:"parent_cluster"`
}

// ChildClustersResponse represents a response containing child clusters
type ChildClustersResponse struct {
	ChildClusters []ClusterResponse `json:"child_clusters"`
}

// NewHierarchicalFrameworkHandler creates a new instance of HierarchicalFrameworkHandler
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
		log.Fatalf("failed to build hierarchical framework: %v", err)
		return
	}

	if framework == nil {
		log.Println("Failed to build framework: no valid clusters found")
		return
	}

	// Save the framework to database
	dbFramework, err := h.frameworkService.CreateFramework()
	if err != nil {
		log.Fatalf("failed to save framework in database: %v", err)
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
			value, err := h.frameworkService.CreateCluster(
				dbLayer.ID,
				cluster.CenterLat,
				cluster.CenterLng,
				cluster.Radius,
				cluster.VisitCount,
			)
			if err != nil {
				log.Fatalf("failed to create cluster: %v", err)
				return
			}

			if i == 0 {
				// Create new location from bottom layer clusters
				newLocation := models.Location{
					Latitude:   value.CenterLat,
					Longitude:  value.CenterLng,
					ClusterID:  value.ID,
					VisitCount: value.VisitCount,
				}

				// Save to database
				_, err := h.locationServices.Create(newLocation)
				if err != nil {
					log.Printf("failed to create location from cluster: %v", err)
					continue
				}
			}
		}
	}
}

// GetClustersAtLayer returns all clusters at a specific layer
func (h *HierarchicalFrameworkHandler) GetClustersAtLayer(c *gin.Context) {
	frameworkID, err := parseUintParam(c, "frameworkID")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid framework ID"})
		return
	}

	layerLevel, err := parseIntParam(c, "layerLevel")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid layer level"})
		return
	}

	// Get framework
	framework, err := h.frameworkService.GetFramework(frameworkID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	// Get clusters at the specified layer
	clusters := algorithms.GetClustersAtLayer(framework, layerLevel)
	if clusters == nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Layer not found"})
		return
	}

	// Convert to response type
	clusterResponses := make([]ClusterResponse, len(clusters))
	for i, cluster := range clusters {
		clusterResponses[i] = ClusterResponse{
			ID:         cluster.ID,
			CenterLat:  cluster.CenterLat,
			CenterLng:  cluster.CenterLng,
			Radius:     cluster.Radius,
			LayerID:    cluster.LayerID,
			VisitCount: cluster.VisitCount,
		}
	}

	c.JSON(http.StatusOK, ClustersResponse{
		Clusters: clusterResponses,
	})
}

// GetStayPointsInCluster returns all stay points in a specific cluster
func (h *HierarchicalFrameworkHandler) GetStayPointsInCluster(c *gin.Context) {
	clusterID, err := parseUintParam(c, "clusterID")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid cluster ID"})
		return
	}

	// Get cluster
	cluster, err := h.frameworkService.GetCluster(clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	// Get all stay points
	stayPoints, err := h.stayPointService.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	// Get stay points in the cluster
	clusterStayPoints := algorithms.GetStayPointsInCluster(*cluster, stayPoints)

	c.JSON(http.StatusOK, StayPointsResponse{
		StayPoints: clusterStayPoints,
	})
}

// GetParentCluster returns the parent cluster of a given cluster
func (h *HierarchicalFrameworkHandler) GetParentCluster(c *gin.Context) {
	clusterID, err := parseUintParam(c, "clusterID")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid cluster ID"})
		return
	}

	// Get cluster
	cluster, err := h.frameworkService.GetCluster(clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	// Get next layer
	nextLayer, err := h.frameworkService.GetClustersAtLayer(cluster.LayerID + 1)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	// Find parent cluster
	parent := algorithms.FindParentCluster(*cluster, nextLayer)
	if parent == nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Parent cluster not found"})
		return
	}

	// Convert to response type
	parentResponse := ClusterResponse{
		ID:         parent.ID,
		CenterLat:  parent.CenterLat,
		CenterLng:  parent.CenterLng,
		Radius:     parent.Radius,
		LayerID:    parent.LayerID,
		VisitCount: parent.VisitCount,
	}

	c.JSON(http.StatusOK, ParentClusterResponse{
		ParentCluster: parentResponse,
	})
}

// GetChildClusters returns all child clusters of a given cluster
func (h *HierarchicalFrameworkHandler) GetChildClusters(c *gin.Context) {
	clusterID, err := parseUintParam(c, "clusterID")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid cluster ID"})
		return
	}

	// Get cluster
	cluster, err := h.frameworkService.GetCluster(clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	// Get previous layer
	prevLayer, err := h.frameworkService.GetClustersAtLayer(cluster.LayerID - 1)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	// Find child clusters
	children := algorithms.FindChildClusters(*cluster, prevLayer)

	// Convert to response type
	childResponses := make([]ClusterResponse, len(children))
	for i, child := range children {
		childResponses[i] = ClusterResponse{
			ID:         child.ID,
			CenterLat:  child.CenterLat,
			CenterLng:  child.CenterLng,
			Radius:     child.Radius,
			LayerID:    child.LayerID,
			VisitCount: child.VisitCount,
		}
	}

	c.JSON(http.StatusOK, ChildClustersResponse{
		ChildClusters: childResponses,
	})
}

// Helper functions for parameter parsing
func parseUintParam(c *gin.Context, paramName string) (uint, error) {
	paramStr := c.Param(paramName)
	paramValue, err := strconv.ParseUint(paramStr, 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(paramValue), nil
}

func parseIntParam(c *gin.Context, paramName string) (int, error) {
	paramStr := c.Param(paramName)
	paramValue, err := strconv.Atoi(paramStr)
	if err != nil {
		return 0, err
	}
	return paramValue, nil
}
