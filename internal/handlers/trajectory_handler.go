package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/services"
)

type TrajectoryHandler struct {
	trajectoryService *services.TrajectoryServices
}

// GPSPointRequest represents a single GPS point in a trajectory
type GPSPointRequest struct {
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
	Altitude  float64 `json:"altitude"`
	Timestamp string  `json:"timestamp" binding:"required"`
}

// CreateTrajectoryRequest is the input for creating a new trajectory
type CreateTrajectoryRequest struct {
	Name   string            `json:"name" binding:"required"`
	Points []GPSPointRequest `json:"points" binding:"required,min=2"`
}

func NewTrajectoryHandler(trajectoryService *services.TrajectoryServices) *TrajectoryHandler {
	return &TrajectoryHandler{
		trajectoryService: trajectoryService,
	}
}

// CreateTrajectory creates a new trajectory for the current user
func (h *TrajectoryHandler) CreateTrajectory(c *gin.Context) {
	var req CreateTrajectoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}

	// Convert request points to a format the service can use
	points := make([]map[string]any, len(req.Points))
	var startTime, endTime string

	for i, p := range req.Points {
		// Format timestamp as RFC3339 string
		_, err := time.Parse(time.RFC3339, p.Timestamp)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid timestamp format. Use ISO 8601 / RFC 3339 format (e.g. 2023-01-01T12:00:00Z)",
			})
			return
		}

		// Save the first point's timestamp as startTime and last point's timestamp as endTime
		if i == 0 {
			startTime = p.Timestamp
		}
		if i == len(req.Points)-1 {
			endTime = p.Timestamp
		}

		points[i] = map[string]any{
			"lat":       p.Latitude,
			"lng":       p.Longitude,
			"altitude":  p.Altitude,
			"timestamp": p.Timestamp,
		}
	}

	// Create trajectory using the service's method
	trajectory, err := h.trajectoryService.CreateTrajectory(userID.(uint), startTime, endTime, points)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create trajectory: " + err.Error(),
		})
		return
	}

	// Set the name field since it's not part of the CreateTrajectory method
	trajectory.Name = req.Name
	if err := h.trajectoryService.Update(*trajectory); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update trajectory name",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Trajectory created successfully",
		"trajectory": trajectory,
	})
}

// GetUserTrajectories retrieves trajectories for the current user with pagination
func (h *TrajectoryHandler) GetUserTrajectories(c *gin.Context) {
	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}

	// Get pagination parameters
	offset := 0
	limit := 10 // Default limit of 10 items per page

	// Parse offset parameter
	if offsetParam := c.Query("offset"); offsetParam != "" {
		if _, err := fmt.Sscanf(offsetParam, "%d", &offset); err != nil || offset < 0 {
			offset = 0
		}
	}

	// Parse limit parameter
	if limitParam := c.Query("limit"); limitParam != "" {
		if _, err := fmt.Sscanf(limitParam, "%d", &limit); err != nil || limit <= 0 {
			limit = 10
		}
	}

	// Get total count of trajectories for the user
	total, err := h.trajectoryService.GetUserTrajectoriesCount(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to count trajectories",
		})
		return
	}

	// Get paginated trajectories for user
	trajectories, err := h.trajectoryService.GetTrajectorysByUserIDPaginated(userID.(uint), offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get trajectories",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"trajectories": trajectories,
		"total":        total,
	})
}
