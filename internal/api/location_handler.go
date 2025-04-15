package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/algorithms"
	"github.com/th1enq/go-map/internal/repositories"
)

type LocationHandler struct {
	LocationRepositories *repositories.LocationRepository
}

func NewLocationHandler(locationRepo *repositories.LocationRepository) *LocationHandler {
	return &LocationHandler{
		LocationRepositories: locationRepo,
	}
}

func (l *LocationHandler) SearchActivitiesByLocation(c *gin.Context) {
	latStr := c.Query("lat")
	lngStr := c.Query("lng")
	activity := c.Query("activity")

	if latStr == "" || lngStr == "" || activity == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "lat, lng, and activity are required"})
		return
	}

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid latitude"})
		return
	}

	lng, err := strconv.ParseFloat(lngStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid longitude"})
		return
	}

	// Call the service
	locations, err := algorithms.SearchLocationsByActivity(lat, lng, activity, 0.2)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, locations)
}
