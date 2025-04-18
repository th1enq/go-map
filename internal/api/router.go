package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/db"
	"github.com/th1enq/go-map/internal/repositories"
)

func SetupNewRouter(db *db.DB) *gin.Engine {
	router := gin.Default()

	router.Static("/static", "./static")

	router.LoadHTMLGlob("templates/*")

	router.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	router.GET("/staypoints", func(c *gin.Context) {
		c.HTML(http.StatusOK, "staypoints.html", nil)
	})

	locationRepo := repositories.NewLocationRepository(db.DB)
	// activityRepo := repositories.NewActivityRepository(db.DB)
	// trajectoryRepo := repositories.NewTrajectoryRepository(db.DB)
	stayPointRepo := repositories.NewStayPointRepository(db.DB)
	// userRepo := repositories.NewUserRepository(db.DB)

	locationHandler := NewLocationHandler(locationRepo)
	stayPointHandler := NewStayPointHandler(stayPointRepo)

	// algorithms.LoadGeolifeData("dataset/Geolife Trajectories 1.3", userRepo, trajectoryRepo, stayPointRepo)

	api := router.Group("/api")
	{
		location := api.Group("/location")
		{
			location.GET("/search/place", locationHandler.SearchLocationsByActivity)
			location.GET("/search/activity", locationHandler.SearchActivitiesByLocation)
		}

		staypoint := api.Group("/staypoint")
		{
			staypoint.GET("/osm", stayPointHandler.GetStayPointsWithOSMInfo)
		}
	}

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"user":   "th1enq",
		})
	})

	return router
}
