package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/db"
	"github.com/th1enq/go-map/internal/handlers"
	"github.com/th1enq/go-map/internal/services"
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

	findServices := services.NewFindServices()
	findHandler := handlers.NewFindHandler(findServices)

	// algorithms.LoadGeolifeData("dataset/Geolife Trajectories 1.3", userRepo, trajectoryRepo, stayPointRepo)

	api := router.Group("/api")
	{
		location := api.Group("/location")
		{
			location.GET("/search/place", findHandler.SearchLocationsByActivity)
			location.GET("/search/activity", findHandler.SearchActivitiesByLocation)
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
