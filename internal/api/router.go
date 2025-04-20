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

	router.GET("/search", func(c *gin.Context) {
		c.HTML(http.StatusOK, "search.html", nil)
	})

	router.GET("/recommend", func(c *gin.Context) {
		c.HTML(http.StatusOK, "recommend.html", nil)
	})

	findServices := services.NewFindServices()

	// userServices := services.NewUserServices(db)
	// tracjectoryServices := services.NewTrajectoryServices(db)
	stayPointServices := services.NewStayPointServices(db)
	locationServices := services.NewLocationServices(db.DB)

	// loadingDataHandler := handlers.NewLoadingDataHandler(tracjectoryServices, stayPointServices, userServices)

	// // Add hierarchical framework services and handler
	frameworkService := services.NewHierarchicalFrameworkService(db.DB)
	similarityService := services.NewSimilarityService(db, frameworkService)
	// userGraphHandler := handlers.NewUserGraphHandler(frameworkService, stayPointServices)
	// frameworkHandler := handlers.NewHierarchicalFrameworkHandler(frameworkService, stayPointServices, locationServices)

	// loadingDataHandler.LoadGeolifeData("dataset/Geolife Trajectories 1.3")
	// frameworkHandler.BuildFramework()
	// for i := 1; i <= 182; i++ {
	// 	userGraphHandler.BuildUserGraph(uint(i))
	// }
	findHandler := handlers.NewFindHandler(findServices)
	recommendationService := services.NewRecommendationService(db, similarityService, frameworkService, stayPointServices, locationServices)
	recommendationHandler := handlers.NewRecommendHandler(recommendationService)

	api := router.Group("/api")
	{
		location := api.Group("/location")
		{
			location.GET("/search/place", findHandler.SearchLocationsByActivity)
			location.GET("/search/activity", findHandler.SearchActivitiesByLocation)

			location.GET("/rcm/hot", recommendationHandler.RecommendByHotStayPoint)
			location.GET("/rcm/same/:id", recommendationHandler.RecommendBySameTracjectory)
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
