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

	locationRepo := repositories.NewLocationRepository(db.DB)
	// activityRepo := repositories.NewActivityRepository(db.DB)
	// trajectoryRepo := repositories.NewTrajectoryRepository(db.DB)
	// stayPointRepo := repositories.NewStayPointRepository(db.DB)
	// userRepo := repositories.NewUserRepository(db.DB)

	locationHandler := NewLocationHandler(locationRepo)

	// algorithms.LoadGeolifeData("static/Geolife Trajectories 1.3", userRepo, trajectoryRepo, stayPointRepo)

	api := router.Group("/api")
	{
		location := api.Group("/location")
		{
			location.GET("/search", locationHandler.SearchActivitiesByLocation)
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
