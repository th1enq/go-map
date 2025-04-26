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

	router.Use(middleware.Cors)
	authService := services.NewAuthService(db.DB, JwtSescret)

	findServices := services.NewFindServices()

	userService := services.NewUserServices(db)
	trajectoryService := services.NewTrajectoryServices(db)
	stayPointServices := services.NewStayPointServices(db)
	locationService := services.NewLocationServices(db.DB)

	// Create new service instance for user profile management
	userProfileService := services.NewUserServices(db)

	// Add hierarchical framework services and handler
	frameworkService := services.NewHierarchicalFrameworkService(db.DB)
	similarityService := services.NewSimilarityService(db, frameworkService)

	findHandler := handlers.NewFindHandler(findServices)
	recommendationService := services.NewRecommendationService(db, similarityService, frameworkService, stayPointServices, locationService)
	recommendationHandler := handlers.NewRecommendHandler(recommendationService)
	authHandler := handlers.NewAuthHandler(authService)

	// Create handlers for user settings functionality
	userHandler := handlers.NewUserHandler(authService, userProfileService)
	locationHandler := handlers.NewLocationHandler(locationService)
	trajectoryHandler := handlers.NewTrajectoryHandler(trajectoryService)

	// JWT middleware
	jwtMiddleware := middleware.JWTAuth(authService)

	api := router.Group("/api")
	{
		// Public routes that don't require authentication
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/register", authHandler.Register)
			auth.POST("/logout", authHandler.Logout)                        // Add logout endpoint
			auth.GET("/status", jwtMiddleware, authHandler.CheckAuthStatus) // Add auth status endpoint
		}

		// Public search endpoints (no authentication required)
		publicLocation := api.Group("/location")
		{
			publicLocation.GET("/search/place", findHandler.SearchLocationsByActivity)
			publicLocation.GET("/search/activity", findHandler.SearchActivitiesByLocation)
		}

		// User profile endpoints
		users := api.Group("/users")
		users.Use(jwtMiddleware)
		{
			users.GET("/profile", userHandler.GetProfile)
			users.PUT("/profile", userHandler.UpdateProfile)
			users.PUT("/password", userHandler.ChangePassword)
		}

		// Location management endpoints
		locations := api.Group("/locations")
		locations.Use(jwtMiddleware)
		{
			locations.GET("", locationHandler.GetUserLocations)
			locations.POST("", locationHandler.CreateLocation)
		}

		// Trajectory management endpoints
		trajectories := api.Group("/trajectories")
		trajectories.Use(jwtMiddleware)
		{
			trajectories.GET("", trajectoryHandler.GetUserTrajectories)
			trajectories.POST("", trajectoryHandler.CreateTrajectory)
		}

		// Protected routes that require authentication
		protectedLocation := api.Group("/location")
		protectedLocation.Use(jwtMiddleware)
		{
			protectedLocation.GET("/rcm/hot", recommendationHandler.RecommendByHotStayPoint)
			protectedLocation.GET("/rcm/same/:id", recommendationHandler.RecommendBySameTrajectory)
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
		adminGroup.GET("/users/count", adminHandler.GetUserCount)
		adminGroup.GET("/users", adminHandler.GetUsers)
		adminGroup.GET("/users/:id", adminHandler.GetUser)
		adminGroup.POST("/users", adminHandler.CreateUser)
		adminGroup.PUT("/users/:id", adminHandler.UpdateUser)
		adminGroup.DELETE("/users/:id", adminHandler.DeleteUser)

		// Location management
		adminGroup.GET("/locations/count", adminHandler.GetLocationCount)
		adminGroup.GET("/locations", adminHandler.GetLocations)
		adminGroup.GET("/locations/:id", adminHandler.GetLocation)
		adminGroup.POST("/locations", adminHandler.CreateLocation)
		adminGroup.PUT("/locations/:id", adminHandler.UpdateLocation)
		adminGroup.DELETE("/locations/:id", adminHandler.DeleteLocation)

		// Trajectory management
		adminGroup.GET("/trajectories/count", adminHandler.GetTrajectoryCount)
		adminGroup.GET("/trajectories", adminHandler.GetTrajectories)
		adminGroup.GET("/trajectories/:id", adminHandler.GetTrajectory)
		adminGroup.GET("/trajectories/:id/points", adminHandler.GetTrajectoryPoints)
		adminGroup.POST("/trajectories", adminHandler.CreateTrajectory)
		adminGroup.PUT("/trajectories/:id", adminHandler.UpdateTrajectory)
		adminGroup.DELETE("/trajectories/:id", adminHandler.DeleteTrajectory)
	}

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"user":   "th1enq",
		})
	})

	return router
}
