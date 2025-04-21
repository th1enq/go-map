package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/services"
)

type RecommendHandler struct {
	recommendServices *services.RecommendationService
}

func NewRecommendHandler(r *services.RecommendationService) *RecommendHandler {
	return &RecommendHandler{
		recommendServices: r}
}

func (r *RecommendHandler) RecommendByHotStayPoint(c *gin.Context) {
	latStr := c.Query("lat")
	lngStr := c.Query("lng")

	if latStr == "" || lngStr == "" {
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
	locations, err := r.recommendServices.GetNearByCluster(lat, lng, 0.5)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, locations)
}

func (r *RecommendHandler) RecommendBySameTracjectory(c *gin.Context) {
	userIdStr := c.Param("id")
	userID, err := strconv.ParseUint(userIdStr, 10, 0)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	clusters, err := r.recommendServices.GetRecommendations(uint(userID), 1, 0.5, 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot get recommendations"})
		return
	}
	// locations, err := r.recommendServices.FixLocations(clusters)
	// if err != nil {
	// 	c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot fix locations name"})
	// 	return
	// }
	c.JSON(http.StatusOK, clusters)
}
