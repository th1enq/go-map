// Package handlers provides HTTP request handlers for the application
package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/services"
)

// FindHandler handles location and activity search requests
type FindHandler struct {
	findServices *services.FindServices
}

// SearchParams represents common search parameters
type SearchParams struct {
	Latitude  float64
	Longitude float64
	Radius    float64
	Activity  string
}

// NewFindHandler creates a new instance of FindHandler
func NewFindHandler(f *services.FindServices) *FindHandler {
	return &FindHandler{findServices: f}
}

// SearchLocationsByActivity finds locations with a specific activity near coordinates
func (f *FindHandler) SearchLocationsByActivity(c *gin.Context) {
	params, err := extractSearchParams(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	if params.Activity == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "activity is required"})
		return
	}

	// Default radius if not specified
	radius := params.Radius
	if radius == 0 {
		radius = 0.2 // Default radius in kilometers
	}

	// Call the service
	locations, err := f.findServices.SearchLocationsByActivity(
		params.Latitude,
		params.Longitude,
		radius,
		params.Activity,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, locations)
}

// SearchActivitiesByLocation finds all activities available near coordinates
func (f *FindHandler) SearchActivitiesByLocation(c *gin.Context) {
	params, err := extractSearchParams(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Default radius if not specified
	radius := params.Radius
	if radius == 0 {
		radius = 0.2 // Default radius in kilometers
	}

	// Call the service
	activities, err := f.findServices.SearchActivitiesByLocation(
		params.Latitude,
		params.Longitude,
		radius,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, activities)
}

// extractSearchParams parses and validates search parameters from the request
func extractSearchParams(c *gin.Context) (SearchParams, error) {
	params := SearchParams{}

	// Extract latitude
	latStr := c.Query("lat")
	if latStr == "" {
		return params, &ValidationError{Field: "lat", Message: "latitude is required"}
	}
	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		return params, &ValidationError{Field: "lat", Message: "invalid latitude format"}
	}
	params.Latitude = lat

	// Extract longitude
	lngStr := c.Query("lng")
	if lngStr == "" {
		return params, &ValidationError{Field: "lng", Message: "longitude is required"}
	}
	lng, err := strconv.ParseFloat(lngStr, 64)
	if err != nil {
		return params, &ValidationError{Field: "lng", Message: "invalid longitude format"}
	}
	params.Longitude = lng

	// Extract optional radius
	radiusStr := c.Query("radius")
	if radiusStr != "" {
		radius, err := strconv.ParseFloat(radiusStr, 64)
		if err != nil {
			return params, &ValidationError{Field: "radius", Message: "invalid radius format"}
		}
		params.Radius = radius
	}

	// Extract optional activity
	params.Activity = c.Query("activity")

	return params, nil
}

// ValidationError represents a validation error for a specific field
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}
