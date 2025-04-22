// Package handlers provides HTTP request handlers for the application
package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/services"
)

// TrajectoryHandler handles trajectory-related HTTP requests
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

// TrajectoryResponse represents a trajectory in the response
type TrajectoryResponse struct {
	ID        uint      `json:"id"`
	UserID    uint      `json:"user_id"`
	Name      string    `json:"name"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	Points    []any     `json:"points,omitempty"`
}

// TrajectoriesResponse represents a paginated response containing trajectories
type TrajectoriesResponse struct {
	Trajectories []TrajectoryResponse `json:"trajectories"`
	Total        int                  `json:"total"`
}

// NewTrajectoryHandler creates a new instance of TrajectoryHandler
func NewTrajectoryHandler(trajectoryService *services.TrajectoryServices) *TrajectoryHandler {
	return &TrajectoryHandler{
		trajectoryService: trajectoryService,
	}
}

// CreateTrajectory creates a new trajectory for the current user
func (h *TrajectoryHandler) CreateTrajectory(c *gin.Context) {
	var req CreateTrajectoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	// Convert request points to a format the service can use
	points := make([]map[string]any, len(req.Points))
	var startTime, endTime string

	for i, p := range req.Points {
		// Format timestamp as RFC3339 string
		_, err := time.Parse(time.RFC3339, p.Timestamp)
		if err != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Error: "Invalid timestamp format. Use ISO 8601 / RFC 3339 format (e.g. 2023-01-01T12:00:00Z)",
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
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error: "Failed to create trajectory: " + err.Error(),
		})
		return
	}

	// Set the name field since it's not part of the CreateTrajectory method
	trajectory.Name = req.Name
	if err := h.trajectoryService.Update(*trajectory); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error: "Failed to update trajectory name",
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
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	// Get pagination parameters
	offset, limit := h.getPaginationParams(c)

	// Get total count of trajectories for the user
	total, err := h.trajectoryService.GetUserTrajectoriesCount(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to count trajectories"})
		return
	}

	// Get paginated trajectories for user
	trajectories, err := h.trajectoryService.GetTrajectorysByUserIDPaginated(userID.(uint), offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get trajectories"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"trajectories": trajectories,
		"total":        total,
	})
}

// GetTrajectory retrieves a specific trajectory by ID
func (h *TrajectoryHandler) GetTrajectory(c *gin.Context) {
	// Get trajectory ID from the URL
	trajectoryID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid trajectory ID"})
		return
	}

	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	// Get the trajectory
	trajectory, err := h.trajectoryService.GetByID(uint(trajectoryID))
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Trajectory not found"})
		return
	}

	// Verify that the trajectory belongs to the user
	if trajectory.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, ErrorResponse{Error: "Access denied to this trajectory"})
		return
	}

	c.JSON(http.StatusOK, trajectory)
}

// getPaginationParams extracts pagination parameters from the request
func (h *TrajectoryHandler) getPaginationParams(c *gin.Context) (int, int) {
	// Default pagination values
	offset := 0
	limit := 10 // Default limit of 10 items per page

	// Parse offset parameter
	offsetParam := c.Query("offset")
	if offsetParam != "" {
		parsedOffset, err := strconv.Atoi(offsetParam)
		if err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Parse limit parameter
	limitParam := c.Query("limit")
	if limitParam != "" {
		parsedLimit, err := strconv.Atoi(limitParam)
		if err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	return offset, limit
}
