package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/models"
	"github.com/th1enq/go-map/internal/services"
)

type AdminHandler struct {
	userService       *services.UserServices
	locationService   *services.LocationServices
	trajectoryService *services.TrajectoryServices
}

func NewAdminHandler(userService *services.UserServices, locationService *services.LocationServices,
	trajectoryService *services.TrajectoryServices) *AdminHandler {
	return &AdminHandler{
		userService:       userService,
		locationService:   locationService,
		trajectoryService: trajectoryService,
	}
}

// Render admin page
func (h *AdminHandler) AdminPage(c *gin.Context) {
	c.HTML(http.StatusOK, "admin.html", gin.H{
		"title": "Admin Dashboard",
	})
}

// USER MANAGEMENT
func (h *AdminHandler) GetUsers(c *gin.Context) {
	users, err := h.userService.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

func (h *AdminHandler) GetUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := h.userService.GetUserByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *AdminHandler) CreateUser(c *gin.Context) {
	var userData struct {
		Username string          `json:"username"`
		Email    string          `json:"email"`
		Password string          `json:"password"`
		Role     models.UserRole `json:"role"`
	}

	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create user
	user := &models.User{
		Username: userData.Username,
		Email:    userData.Email,
		Role:     userData.Role,
	}

	// Tạo hash password
	if err := user.SetPassword(userData.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	userID, err := h.userService.Create(user)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the created user
	createdUser, err := h.userService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User created but failed to retrieve"})
		return
	}

	c.JSON(http.StatusCreated, createdUser)
}

func (h *AdminHandler) UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var userData struct {
		Username string          `json:"username"`
		Email    string          `json:"email"`
		Password string          `json:"password"`
		Role     models.UserRole `json:"role"`
	}

	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the existing user
	user, err := h.userService.GetUserByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update user fields
	user.Username = userData.Username
	user.Email = userData.Email
	user.Role = userData.Role

	// Update password if provided
	if userData.Password != "" {
		if err := user.SetPassword(userData.Password); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
	}

	// Update user
	if err := h.userService.Update(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *AdminHandler) DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := h.userService.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func (h *AdminHandler) GetUserCount(c *gin.Context) {
	count, err := h.userService.Count()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user count"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

// LOCATION MANAGEMENT
func (h *AdminHandler) GetLocations(c *gin.Context) {
	locations, err := h.locationService.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get locations"})
		return
	}
	c.JSON(http.StatusOK, locations)
}

func (h *AdminHandler) GetLocation(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid location ID"})
		return
	}

	location, err := h.locationService.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Location not found"})
		return
	}

	c.JSON(http.StatusOK, location)
}

func (h *AdminHandler) CreateLocation(c *gin.Context) {
	var locationData struct {
		Name       string   `json:"name"`
		Category   string   `json:"category"`
		Latitude   float64  `json:"latitude"`
		Longitude  float64  `json:"longitude"`
		Tag        string   `json:"tag"`
		Activities []string `json:"activities"`
	}

	if err := c.ShouldBindJSON(&locationData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	location := models.Location{
		Name:      locationData.Name,
		Latitude:  locationData.Latitude,
		Longitude: locationData.Longitude,
	}

	id, err := h.locationService.Create(location)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create location"})
		return
	}

	// Get created location
	createdLocation, err := h.locationService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Location created but failed to retrieve"})
		return
	}

	c.JSON(http.StatusCreated, createdLocation)
}

func (h *AdminHandler) UpdateLocation(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid location ID"})
		return
	}

	var locationData struct {
		Name       string   `json:"name"`
		Category   string   `json:"category"`
		Latitude   float64  `json:"latitude"`
		Longitude  float64  `json:"longitude"`
		Tag        string   `json:"tag"`
		Activities []string `json:"activities"`
	}

	if err := c.ShouldBindJSON(&locationData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing location
	location, err := h.locationService.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Location not found"})
		return
	}

	// Update location fields
	location.Name = locationData.Name
	location.Latitude = locationData.Latitude
	location.Longitude = locationData.Longitude

	// Update location
	if err := h.locationService.Update(*location); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update location"})
		return
	}

	c.JSON(http.StatusOK, location)
}

func (h *AdminHandler) DeleteLocation(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid location ID"})
		return
	}

	if err := h.locationService.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete location"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Location deleted successfully"})
}

func (h *AdminHandler) GetLocationCount(c *gin.Context) {
	locations, err := h.locationService.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get location count"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(locations)})
}

// TRAJECTORY MANAGEMENT
func (h *AdminHandler) GetTrajectories(c *gin.Context) {
	trajectories, err := h.trajectoryService.GetAllTrajectories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get trajectories"})
		return
	}

	// Enhanced trajectories with user info
	type EnhancedTrajectory struct {
		ID          uint      `json:"id"`
		UserID      uint      `json:"user_id"`
		UserName    string    `json:"user_name"`
		StartTime   time.Time `json:"start_time"`
		EndTime     time.Time `json:"end_time"`
		PointsCount int       `json:"points_count"`
	}

	enhancedTrajectories := make([]EnhancedTrajectory, 0, len(trajectories))
	for _, t := range trajectories {
		user, _ := h.userService.GetUserByID(t.UserID)
		userName := ""
		if user != nil {
			userName = user.Username
		}

		pointsCount, _ := h.trajectoryService.GetTrajectoryPointsCount(t.ID)

		enhancedTrajectory := EnhancedTrajectory{
			ID:          t.ID,
			UserID:      t.UserID,
			UserName:    userName,
			StartTime:   t.StartTime,
			EndTime:     t.EndTime,
			PointsCount: pointsCount,
		}

		enhancedTrajectories = append(enhancedTrajectories, enhancedTrajectory)
	}

	c.JSON(http.StatusOK, enhancedTrajectories)
}

func (h *AdminHandler) GetTrajectory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trajectory ID"})
		return
	}

	trajectory, err := h.trajectoryService.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trajectory not found"})
		return
	}

	// Get user info
	user, _ := h.userService.GetUserByID(trajectory.UserID)
	userName := ""
	if user != nil {
		userName = user.Username
	}

	// Get points count
	pointsCount, _ := h.trajectoryService.GetTrajectoryPointsCount(trajectory.ID)

	// Enhanced trajectory response
	response := struct {
		ID          uint      `json:"id"`
		UserID      uint      `json:"user_id"`
		UserName    string    `json:"user_name"`
		StartTime   time.Time `json:"start_time"`
		EndTime     time.Time `json:"end_time"`
		PointsCount int       `json:"points_count"`
	}{
		ID:          trajectory.ID,
		UserID:      trajectory.UserID,
		UserName:    userName,
		StartTime:   trajectory.StartTime,
		EndTime:     trajectory.EndTime,
		PointsCount: pointsCount,
	}

	c.JSON(http.StatusOK, response)
}

func (h *AdminHandler) GetTrajectoryPoints(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trajectory ID"})
		return
	}

	points, err := h.trajectoryService.GetTrajectoryPoints(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trajectory points not found"})
		return
	}

	c.JSON(http.StatusOK, points)
}

func (h *AdminHandler) CreateTrajectory(c *gin.Context) {
	var trajectoryData struct {
		UserID    uint             `json:"user_id"`
		StartTime string           `json:"start_time"`
		EndTime   string           `json:"end_time"`
		Points    []map[string]any `json:"points"`
	}

	if err := c.ShouldBindJSON(&trajectoryData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user exists
	_, err := h.userService.GetUserByID(trajectoryData.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User not found"})
		return
	}

	// Create the trajectory
	trajectory, err := h.trajectoryService.CreateTrajectory(
		trajectoryData.UserID,
		trajectoryData.StartTime,
		trajectoryData.EndTime,
		trajectoryData.Points,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create trajectory: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, trajectory)
}

func (h *AdminHandler) UpdateTrajectory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trajectory ID"})
		return
	}

	var trajectoryData struct {
		UserID    uint             `json:"user_id"`
		StartTime time.Time        `json:"start_time"`
		EndTime   time.Time        `json:"end_time"`
		Points    []map[string]any `json:"points"`
	}

	if err := c.ShouldBindJSON(&trajectoryData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if trajectory exists
	trajectory, err := h.trajectoryService.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trajectory not found"})
		return
	}

	// Check if user exists
	_, err = h.userService.GetUserByID(trajectoryData.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User not found"})
		return
	}

	// Update trajectory
	trajectory.UserID = trajectoryData.UserID
	trajectory.StartTime = trajectoryData.StartTime
	trajectory.EndTime = trajectoryData.EndTime

	if err := h.trajectoryService.UpdateTrajectory(trajectory, trajectoryData.Points); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update trajectory: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, trajectory)
}

func (h *AdminHandler) DeleteTrajectory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trajectory ID"})
		return
	}

	if err := h.trajectoryService.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete trajectory"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Trajectory deleted successfully"})
}

func (h *AdminHandler) GetTrajectoryCount(c *gin.Context) {
	count, err := h.trajectoryService.Count()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get trajectory count"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}
