// Package handlers provides HTTP request handlers for the application
package handlers

import (
	"log"
	"time"

	"github.com/th1enq/go-map/internal/algorithms"
	"github.com/th1enq/go-map/internal/models"
	"github.com/th1enq/go-map/internal/services"
)

// UserGraphHandler handles the creation and management of hierarchical user graphs
type UserGraphHandler struct {
	frameworkService *services.HierarchicalFrameworkService
	stayPointService *services.StayPointServices
}

// NewUserGraphHandler creates a new instance of UserGraphHandler
func NewUserGraphHandler(
	frameworkService *services.HierarchicalFrameworkService,
	stayPointService *services.StayPointServices,
) *UserGraphHandler {
	return &UserGraphHandler{
		frameworkService: frameworkService,
		stayPointService: stayPointService,
	}
}

// BuildUserGraph builds a hierarchical graph for a specific user
func (h *UserGraphHandler) BuildUserGraph(userID uint) error {
	// Get all stay points for the user
	stayPoints, err := h.stayPointService.GetByUserID(userID)
	if err != nil {
		return err
	}

	if len(stayPoints) == 0 {
		log.Printf("No stay points found for user %d", userID)
		return nil
	}

	// Get the latest framework
	frameworks, err := h.frameworkService.GetAllFrameworks()
	if err != nil {
		return err
	}

	if len(frameworks) == 0 {
		log.Println("No framework found")
		return nil
	}

	// Use the latest framework
	framework := frameworks[len(frameworks)-1]

	// Create a new hierarchical graph for the user
	graph, err := h.frameworkService.CreateHierarchicalGraph(userID, framework.ID)
	if err != nil {
		return err
	}

	// Process stay points in chronological order
	// First, group nearby stay points
	groups, err := h.stayPointService.GroupNearbyStayPoints(
		userID,
		200,          // 200 meters distance threshold
		24*time.Hour, // 24 hours time threshold
	)
	if err != nil {
		return err
	}

	// For each group of stay points
	for _, group := range groups {
		if len(group) < 2 {
			continue
		}

		// Find the cluster that contains most of the stay points
		cluster, err := h.findBestCluster(group, &framework)
		if err != nil {
			log.Printf("Error finding cluster for group: %v", err)
			continue
		}

		if cluster == nil {
			log.Printf("Cluster is null")
			continue
		}

		// Create a node in the graph for this cluster
		node, err := h.frameworkService.AddNodeToGraph(graph.ID, cluster.ID)
		if err != nil {
			log.Printf("Error creating node: %v", err)
			continue
		}

		// Update node visit information
		node.FirstVisitAt = group[0].ArrivalTime
		node.LastVisitAt = group[len(group)-1].DepartureTime
		node.VisitCount = len(group)
		if err := h.frameworkService.UpdateNode(node); err != nil {
			log.Printf("Error updating node: %v", err)
		}
	}

	// Create edges between nodes based on temporal sequence
	nodes, err := h.frameworkService.GetGraphNodes(graph.ID)
	if err != nil {
		return err
	}

	// Sort nodes by first visit time
	sortNodesByFirstVisit(nodes)

	// Create edges between consecutive nodes
	for i := 0; i < len(nodes)-1; i++ {
		transitionTime := int(nodes[i+1].FirstVisitAt.Sub(nodes[i].LastVisitAt).Seconds())
		_, err := h.frameworkService.AddEdgeToGraph(graph.ID, nodes[i].ID, nodes[i+1].ID, transitionTime)
		if err != nil {
			log.Printf("Error creating edge: %v", err)
		}
	}

	return nil
}

// findBestCluster finds the cluster that contains most of the stay points in a group
func (h *UserGraphHandler) findBestCluster(stayPoints []models.StayPoint, framework *models.HierarchicalFramework) (*models.Cluster, error) {
	// Get all clusters from the first layer
	clusters, err := h.frameworkService.GetClustersAtLayer(framework.Layers[0].ID)
	if err != nil {
		return nil, err
	}

	var bestCluster *models.Cluster
	maxPoints := 0

	for _, cluster := range clusters {
		pointsInCluster := 0
		for _, sp := range stayPoints {
			distance := algorithms.Distance(cluster.CenterLat, cluster.CenterLng, sp.Latitude, sp.Longitude)
			if distance <= cluster.Radius {
				pointsInCluster++
			}
		}

		if pointsInCluster > maxPoints {
			maxPoints = pointsInCluster
			bestCluster = &cluster
		}
	}

	return bestCluster, nil
}

// sortNodesByFirstVisit sorts an array of nodes by their first visit time
func sortNodesByFirstVisit(nodes []models.GraphNode) {
	for i := 0; i < len(nodes)-1; i++ {
		for j := i + 1; j < len(nodes); j++ {
			if nodes[i].FirstVisitAt.After(nodes[j].FirstVisitAt) {
				nodes[i], nodes[j] = nodes[j], nodes[i]
			}
		}
	}
}
