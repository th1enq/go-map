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
	recommendServices := services.NewRecommendServices(db)

	userServices := services.NewUserServices(db)
	tracjectoryServices := services.NewTrajectoryServices(db)
	stayPointServices := services.NewStayPointServices(db)

	loadingDataHandler := handlers.NewLoadingDataHandler(tracjectoryServices, stayPointServices, userServices)
	findHandler := handlers.NewFindHandler(findServices)
	recommendHandler := handlers.NewRecommendHandler(recommendServices)

	// Add hierarchical framework services and handler
	frameworkService := services.NewHierarchicalFrameworkService(db.DB)
	frameworkHandler := handlers.NewHierarchicalFrameworkHandler(frameworkService, stayPointServices)

	loadingDataHandler.LoadGeolifeData("dataset/Geolife Trajectories 1.3")
	frameworkHandler.BuildFramework()

	api := router.Group("/api")
	{
		location := api.Group("/location")
		{
			location.GET("/search/place", findHandler.SearchLocationsByActivity)
			location.GET("/search/activity", findHandler.SearchActivitiesByLocation)

			location.GET("/rcm/hot", recommendHandler.RecommendByHotStayPoint)
			location.GET("/rcm/same", recommendHandler.RecommendBySameTracjectory)
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
