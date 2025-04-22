// Package handlers provides HTTP request handlers for the application
package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/services"
)

// RecommendHandler handles location recommendation requests
type RecommendHandler struct {
	recommendService *services.RecommendationService
}

// RecommendationParams represents common recommendation parameters
type RecommendationParams struct {
	Latitude  float64
	Longitude float64
	Radius    float64
}

// NewRecommendHandler creates a new instance of RecommendHandler
func NewRecommendHandler(r *services.RecommendationService) *RecommendHandler {
	return &RecommendHandler{
		recommendService: r,
	}
}

// RecommendByHotStayPoint recommends locations based on popular stay points near coordinates
func (r *RecommendHandler) RecommendByHotStayPoint(c *gin.Context) {
	params, err := extractCoordinateParams(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Default radius if not specified
	radius := params.Radius
	if radius == 0 {
		radius = 0.5 // Default radius in kilometers
	}

	// Call the service
	locations, err := r.recommendService.GetNearByCluster(
		params.Latitude,
		params.Longitude,
		radius,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, locations)
}

// RecommendBySameTrajectory recommends locations based on similar user trajectories
func (r *RecommendHandler) RecommendBySameTrajectory(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 0)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid user ID"})
		return
	}

	// Default parameters for recommendation
	clusterLevel := 1
	similarityThreshold := 0.5
	maxResults := 5

	// Get custom parameters if provided
	levelStr := c.Query("level")
	if levelStr != "" {
		if level, err := strconv.Atoi(levelStr); err == nil && level > 0 {
			clusterLevel = level
		}
	}

	thresholdStr := c.Query("threshold")
	if thresholdStr != "" {
		if threshold, err := strconv.ParseFloat(thresholdStr, 64); err == nil && threshold > 0 && threshold <= 1 {
			similarityThreshold = threshold
		}
	}

	limitStr := c.Query("limit")
	if limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			maxResults = limit
		}
	}

	// Get recommendations based on trajectory similarity
	clusters, err := r.recommendService.GetRecommendations(
		uint(userID),
		uint(clusterLevel),
		similarityThreshold,
		maxResults,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Cannot get recommendations: " + err.Error()})
		return
	}

	// Enhance location data with additional information
	locations, err := r.recommendService.FixLocations(clusters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Cannot enhance location information: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, locations)
}

// extractCoordinateParams parses and validates coordinate parameters from the request
func extractCoordinateParams(c *gin.Context) (RecommendationParams, error) {
	params := RecommendationParams{}

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

	return params, nil
}
