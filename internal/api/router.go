package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/db"
	"github.com/th1enq/go-map/internal/handlers"
	"github.com/th1enq/go-map/internal/middleware"
	"github.com/th1enq/go-map/internal/services"
)

func SetupNewRouter(db *db.DB, JwtSescret string) *gin.Engine {
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

	router.GET("/login", func(c *gin.Context) {
		c.HTML(http.StatusOK, "login.html", nil)
	})

	router.GET("/register", func(c *gin.Context) {
		c.HTML(http.StatusOK, "register.html", nil)
	})

	findServices := services.NewFindServices()

	userService := services.NewUserServices(db)
	trajectoryService := services.NewTrajectoryServices(db)
	stayPointServices := services.NewStayPointServices(db)
	locationService := services.NewLocationServices(db.DB)
	authService := services.NewAuthService(db.DB, JwtSescret)

	// Add hierarchical framework services and handler
	frameworkService := services.NewHierarchicalFrameworkService(db.DB)
	similarityService := services.NewSimilarityService(db, frameworkService)

	findHandler := handlers.NewFindHandler(findServices)
	recommendationService := services.NewRecommendationService(db, similarityService, frameworkService, stayPointServices, locationService)
	recommendationHandler := handlers.NewRecommendHandler(recommendationService)
	authHandler := handlers.NewAuthHandler(authService)

	// JWT middleware
	jwtMiddleware := middleware.JWTAuth(authService)

	api := router.Group("/api")
	{
		// Public routes that don't require authentication
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/register", authHandler.Register)
			auth.POST("/logout", authHandler.Logout) // Add logout endpoint
		}

		// Protected routes that require authentication
		location := api.Group("/location")
		location.Use(jwtMiddleware) // Apply JWT middleware to all routes in this group
		{
			location.GET("/search/place", findHandler.SearchLocationsByActivity)
			location.GET("/search/activity", findHandler.SearchActivitiesByLocation)

			location.GET("/rcm/hot", recommendationHandler.RecommendByHotStayPoint)
			location.GET("/rcm/same/:id", recommendationHandler.RecommendBySameTracjectory)
		}
	}

	// Admin routes
	adminHandler := handlers.NewAdminHandler(userService, locationService, trajectoryService)

	// Admin page
	router.GET("/admin", middleware.JWTAuth(authService), adminHandler.AdminPage)

	// Admin API routes
	adminGroup := router.Group("/api/admin")
	adminGroup.Use(middleware.JWTAuth(authService))
	{
		// User management
		adminGroup.GET("/users", adminHandler.GetUsers)
		adminGroup.GET("/users/:id", adminHandler.GetUser)
		adminGroup.POST("/users", adminHandler.CreateUser)
		adminGroup.PUT("/users/:id", adminHandler.UpdateUser)
		adminGroup.DELETE("/users/:id", adminHandler.DeleteUser)
		adminGroup.GET("/users/count", adminHandler.GetUserCount)

		// Location management
		adminGroup.GET("/locations", adminHandler.GetLocations)
		adminGroup.GET("/locations/:id", adminHandler.GetLocation)
		adminGroup.POST("/locations", adminHandler.CreateLocation)
		adminGroup.PUT("/locations/:id", adminHandler.UpdateLocation)
		adminGroup.DELETE("/locations/:id", adminHandler.DeleteLocation)
		adminGroup.GET("/locations/count", adminHandler.GetLocationCount)

		// Trajectory management
		adminGroup.GET("/trajectories", adminHandler.GetTrajectories)
		adminGroup.GET("/trajectories/:id", adminHandler.GetTrajectory)
		adminGroup.GET("/trajectories/:id/points", adminHandler.GetTrajectoryPoints)
		adminGroup.POST("/trajectories", adminHandler.CreateTrajectory)
		adminGroup.PUT("/trajectories/:id", adminHandler.UpdateTrajectory)
		adminGroup.DELETE("/trajectories/:id", adminHandler.DeleteTrajectory)
		adminGroup.GET("/trajectories/count", adminHandler.GetTrajectoryCount)
	}

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"user":   "th1enq",
		})
	})

	return router
}
