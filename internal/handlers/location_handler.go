package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/models"
	"github.com/th1enq/go-map/internal/services"
)

type LocationHandler struct {
	locationService *services.LocationServices
}

type CreateLocationRequest struct {
	Name        string                  `json:"name" binding:"required"`
	Latitude    float64                 `json:"latitude" binding:"required"`
	Longitude   float64                 `json:"longitude" binding:"required"`
	Description string                  `json:"description"`
	Category    models.LocationCategory `json:"category" binding:"required"`
}

func NewLocationHandler(locationService *services.LocationServices) *LocationHandler {
	return &LocationHandler{
		locationService: locationService,
	}
}

// CreateLocation creates a new location for the current user
func (h *LocationHandler) CreateLocation(c *gin.Context) {
	var req CreateLocationRequest
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
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create location",
		})
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

	// Get total count of locations for the user
	total, err := h.locationService.GetUserLocationsCount(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to count locations",
		})
		return
	}

	// Get paginated locations for user
	locations, err := h.locationService.GetByUserPaginated(userID.(uint), offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get locations",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"locations": locations,
		"total":     total,
	})
}
