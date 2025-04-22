// Package handlers provides HTTP request handlers for the application
package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/models"
	"github.com/th1enq/go-map/internal/services"
)

// LocationHandler handles location-related HTTP requests
type LocationHandler struct {
	locationService *services.LocationServices
}

// CreateLocationRequest represents the request body for location creation
type CreateLocationRequest struct {
	Name        string                  `json:"name" binding:"required"`
	Latitude    float64                 `json:"latitude" binding:"required"`
	Longitude   float64                 `json:"longitude" binding:"required"`
	Description string                  `json:"description"`
	Category    models.LocationCategory `json:"category" binding:"required"`
}

// LocationResponse represents a location in the response
type LocationResponse struct {
	ID          uint                    `json:"id"`
	Name        string                  `json:"name"`
	Latitude    float64                 `json:"latitude"`
	Longitude   float64                 `json:"longitude"`
	Description string                  `json:"description"`
	Category    models.LocationCategory `json:"category"`
	UserID      uint                    `json:"user_id"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
}

// LocationsResponse represents a paginated response containing locations
type LocationsResponse struct {
	Locations []models.Location `json:"locations"`
	Total     int64               `json:"total"`
}

// NewLocationHandler creates a new instance of LocationHandler
func NewLocationHandler(locationService *services.LocationServices) *LocationHandler {
	return &LocationHandler{
		locationService: locationService,
	}
}

// CreateLocation creates a new location for the current user
func (h *LocationHandler) CreateLocation(c *gin.Context) {
	var req CreateLocationRequest
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

	// Create new location
	location := &models.Location{
		Name:        req.Name,
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		Description: req.Description,
		Category:    req.Category,
		UserID:      userID.(uint),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Save the location
	if err := h.locationService.CreateLocation(location); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to create location"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Location created successfully",
		"location": location,
	})
}

// GetUserLocations retrieves all locations for the current user with pagination
func (h *LocationHandler) GetUserLocations(c *gin.Context) {
	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	// Get pagination parameters
	offset, limit := h.getPaginationParams(c)

	// Get total count of locations for the user
	total, err := h.locationService.GetUserLocationsCount(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to count locations"})
		return
	}

	// Get paginated locations for user
	locations, err := h.locationService.GetByUserPaginated(userID.(uint), offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get locations"})
		return
	}

	c.JSON(http.StatusOK, LocationsResponse{
		Locations: locations,
		Total:     total,
	})
}

// getPaginationParams extracts pagination parameters from the request
func (h *LocationHandler) getPaginationParams(c *gin.Context) (int, int) {
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
