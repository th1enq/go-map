// Package handlers provides HTTP request handlers for the application
package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/models"
	"github.com/th1enq/go-map/internal/services"
)

// Common response structure for errors
type ErrorResponse struct {
	Error string `json:"error"`
}

// Common response structure for success messages
type SuccessResponse struct {
	Message string `json:"message"`
}

// AdminHandler manages all admin-related HTTP endpoints
type AdminHandler struct {
	userService       *services.UserServices
	locationService   *services.LocationServices
	trajectoryService *services.TrajectoryServices
}

// NewAdminHandler creates a new AdminHandler with the required services
func NewAdminHandler(userService *services.UserServices, locationService *services.LocationServices,
	trajectoryService *services.TrajectoryServices) *AdminHandler {
	return &AdminHandler{
		userService:       userService,
		locationService:   locationService,
		trajectoryService: trajectoryService,
	}
}

// ================ PAGE RENDERING ================

// AdminPage renders the admin dashboard page
func (h *AdminHandler) AdminPage(c *gin.Context) {
	c.HTML(http.StatusOK, "admin.html", gin.H{
		"title": "Admin Dashboard",
	})
}

// ================ USER MANAGEMENT ================

// UserRequest represents the request body for user creation and updates
type UserRequest struct {
	Username string          `json:"username"`
	Email    string          `json:"email"`
	Password string          `json:"password"`
	Role     models.UserRole `json:"role"`
}

// PaginatedUsersResponse represents the response for paginated users
type PaginatedUsersResponse struct {
	Users []models.User `json:"users"`
	Total int64         `json:"total"`
}

// GetUsers returns all users with pagination
func (h *AdminHandler) GetUsers(c *gin.Context) {
	offset, limit := getPaginationParams(c)

	users, err := h.userService.GetUsersPaginated(offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get users"})
		return
	}

	totalCount, err := h.userService.Count()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get user count"})
		return
	}

	c.JSON(http.StatusOK, PaginatedUsersResponse{
		Users: users,
		Total: totalCount,
	})
}

// GetUser returns a specific user by ID
func (h *AdminHandler) GetUser(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid user ID"})
		return
	}

	user, err := h.userService.GetUserByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// CreateUser creates a new user
func (h *AdminHandler) CreateUser(c *gin.Context) {
	var userData UserRequest
	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Create user
	user := &models.User{
		Username: userData.Username,
		Email:    userData.Email,
		Role:     userData.Role,
	}

	// Hash the password
	if err := user.SetPassword(userData.Password); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to hash password"})
		return
	}

	userID, err := h.userService.Create(user)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Get the created user
	createdUser, err := h.userService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "User created but failed to retrieve"})
		return
	}

	c.JSON(http.StatusCreated, createdUser)
}

// UpdateUser updates an existing user
func (h *AdminHandler) UpdateUser(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid user ID"})
		return
	}

	var userData UserRequest
	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Get the existing user
	user, err := h.userService.GetUserByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "User not found"})
		return
	}

	// Update user fields
	user.Username = userData.Username
	user.Email = userData.Email
	user.Role = userData.Role

	// Update password if provided
	if userData.Password != "" {
		if err := user.SetPassword(userData.Password); err != nil {
			c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to hash password"})
			return
		}
	}

	// Update user
	if err := h.userService.Update(user); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// DeleteUser deletes a user by ID
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid user ID"})
		return
	}

	if err := h.userService.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{Message: "User deleted successfully"})
}

// GetUserCount returns the total number of users
func (h *AdminHandler) GetUserCount(c *gin.Context) {
	count, err := h.userService.Count()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get user count"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

// ================ LOCATION MANAGEMENT ================

// LocationRequest represents the request body for location creation and updates
type LocationRequest struct {
	Name       string   `json:"name"`
	Category   string   `json:"category"`
	Latitude   float64  `json:"latitude"`
	Longitude  float64  `json:"longitude"`
	Tag        string   `json:"tag"`
	Activities []string `json:"activities"`
}

// PaginatedLocationsResponse represents the response for paginated locations
type PaginatedLocationsResponse struct {
	Locations []models.Location `json:"locations"`
	Total     int64             `json:"total"`
}

// GetLocations returns all locations with pagination
func (h *AdminHandler) GetLocations(c *gin.Context) {
	offset, limit := getPaginationParams(c)

	locations, err := h.locationService.GetLocationsPaginated(offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get locations"})
		return
	}

	totalCount, err := h.locationService.GetLocationCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get location count"})
		return
	}

	c.JSON(http.StatusOK, PaginatedLocationsResponse{
		Locations: locations,
		Total:     totalCount,
	})
}

// GetLocation returns a specific location by ID
func (h *AdminHandler) GetLocation(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid location ID"})
		return
	}

	location, err := h.locationService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Location not found"})
		return
	}

	c.JSON(http.StatusOK, location)
}

// CreateLocation creates a new location
func (h *AdminHandler) CreateLocation(c *gin.Context) {
	var locationData LocationRequest
	if err := c.ShouldBindJSON(&locationData); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	location := models.Location{
		Name:      locationData.Name,
		Latitude:  locationData.Latitude,
		Longitude: locationData.Longitude,
	}

	id, err := h.locationService.Create(location)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to create location"})
		return
	}

	// Get created location
	createdLocation, err := h.locationService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Location created but failed to retrieve"})
		return
	}

	c.JSON(http.StatusCreated, createdLocation)
}

// UpdateLocation updates an existing location
func (h *AdminHandler) UpdateLocation(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid location ID"})
		return
	}

	var locationData LocationRequest
	if err := c.ShouldBindJSON(&locationData); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Get existing location
	location, err := h.locationService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Location not found"})
		return
	}

	// Update location fields
	location.Name = locationData.Name
	location.Latitude = locationData.Latitude
	location.Longitude = locationData.Longitude

	// Update location
	if err := h.locationService.Update(*location); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to update location"})
		return
	}

	c.JSON(http.StatusOK, location)
}

// DeleteLocation deletes a location by ID
func (h *AdminHandler) DeleteLocation(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid location ID"})
		return
	}

	if err := h.locationService.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to delete location"})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{Message: "Location deleted successfully"})
}

// GetLocationCount returns the total number of locations
func (h *AdminHandler) GetLocationCount(c *gin.Context) {
	locations, err := h.locationService.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get location count"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": len(locations)})
}

// ================ TRAJECTORY MANAGEMENT ================

// TrajectoryRequest represents the request body for trajectory creation
type TrajectoryRequest struct {
	UserID    uint             `json:"user_id"`
	StartTime string           `json:"start_time"`
	EndTime   string           `json:"end_time"`
	Points    []map[string]any `json:"points"`
}

// TrajectoryUpdateRequest represents the request body for trajectory updates
type TrajectoryUpdateRequest struct {
	UserID    uint             `json:"user_id"`
	StartTime time.Time        `json:"start_time"`
	EndTime   time.Time        `json:"end_time"`
	Points    []map[string]any `json:"points"`
}

// EnhancedTrajectory represents a trajectory with additional information
type EnhancedTrajectory struct {
	ID          uint      `json:"id"`
	UserID      uint      `json:"user_id"`
	UserName    string    `json:"user_name"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	PointsCount int       `json:"points_count"`
}

// PaginatedTrajectoriesResponse represents the response for paginated trajectories
type PaginatedTrajectoriesResponse struct {
	Trajectories []EnhancedTrajectory `json:"trajectories"`
	Total        int64                `json:"total"`
}

// GetTrajectories returns all trajectories with pagination and enhanced information
func (h *AdminHandler) GetTrajectories(c *gin.Context) {
	offset, limit := getPaginationParams(c)

	trajectories, err := h.trajectoryService.GetTrajectoriesPaginated(offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get trajectories"})
		return
	}

	totalCount, err := h.trajectoryService.GetTrajectoryCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get trajectory count"})
		return
	}

	enhancedTrajectories := make([]EnhancedTrajectory, 0, len(trajectories))
	for _, t := range trajectories {
		enhancedTrajectory, _ := h.enhanceTrajectory(t)
		enhancedTrajectories = append(enhancedTrajectories, enhancedTrajectory)
	}

	c.JSON(http.StatusOK, PaginatedTrajectoriesResponse{
		Trajectories: enhancedTrajectories,
		Total:        totalCount,
	})
}

// GetTrajectory returns a specific trajectory by ID with enhanced information
func (h *AdminHandler) GetTrajectory(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid trajectory ID"})
		return
	}

	trajectory, err := h.trajectoryService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Trajectory not found"})
		return
	}

	enhancedTrajectory, err := h.enhanceTrajectory(*trajectory)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to enhance trajectory data"})
		return
	}

	c.JSON(http.StatusOK, enhancedTrajectory)
}

// GetTrajectoryPoints returns all points for a specific trajectory
func (h *AdminHandler) GetTrajectoryPoints(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid trajectory ID"})
		return
	}

	points, err := h.trajectoryService.GetTrajectoryPoints(id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Trajectory points not found"})
		return
	}

	c.JSON(http.StatusOK, points)
}

// CreateTrajectory creates a new trajectory
func (h *AdminHandler) CreateTrajectory(c *gin.Context) {
	var trajectoryData TrajectoryRequest
	if err := c.ShouldBindJSON(&trajectoryData); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Check if user exists
	if _, err := h.userService.GetUserByID(trajectoryData.UserID); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "User not found"})
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
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to create trajectory: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, trajectory)
}

// UpdateTrajectory updates an existing trajectory
func (h *AdminHandler) UpdateTrajectory(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid trajectory ID"})
		return
	}

	var trajectoryData TrajectoryUpdateRequest
	if err := c.ShouldBindJSON(&trajectoryData); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Check if trajectory exists
	trajectory, err := h.trajectoryService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "Trajectory not found"})
		return
	}

	// Check if user exists
	if _, err = h.userService.GetUserByID(trajectoryData.UserID); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "User not found"})
		return
	}

	// Update trajectory
	trajectory.UserID = trajectoryData.UserID
	trajectory.StartTime = trajectoryData.StartTime
	trajectory.EndTime = trajectoryData.EndTime

	if err := h.trajectoryService.UpdateTrajectory(trajectory, trajectoryData.Points); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to update trajectory: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, trajectory)
}

// DeleteTrajectory deletes a trajectory by ID
func (h *AdminHandler) DeleteTrajectory(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid trajectory ID"})
		return
	}

	if err := h.trajectoryService.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to delete trajectory"})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{Message: "Trajectory deleted successfully"})
}

// GetTrajectoryCount returns the total number of trajectories
func (h *AdminHandler) GetTrajectoryCount(c *gin.Context) {
	count, err := h.trajectoryService.Count()
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get trajectory count"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

// ================ HELPER METHODS ================

// enhanceTrajectory adds additional information to a trajectory
func (h *AdminHandler) enhanceTrajectory(trajectory models.Trajectory) (EnhancedTrajectory, error) {
	user, _ := h.userService.GetUserByID(trajectory.UserID)
	userName := ""
	if user != nil {
		userName = user.Username
	}

	pointsCount, err := h.trajectoryService.GetTrajectoryPointsCount(trajectory.ID)
	if err != nil {
		return EnhancedTrajectory{}, err
	}

	return EnhancedTrajectory{
		ID:          trajectory.ID,
		UserID:      trajectory.UserID,
		UserName:    userName,
		StartTime:   trajectory.StartTime,
		EndTime:     trajectory.EndTime,
		PointsCount: pointsCount,
	}, nil
}

// parseIDParam extracts and validates the ID parameter from the request
func parseIDParam(c *gin.Context) (uint, error) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}

// getPaginationParams extracts pagination parameters from the request
func getPaginationParams(c *gin.Context) (int, int) {
	// Default pagination values
	offset := 0
	limit := 100 // Default to 100 items per page

	// Get offset parameter
	offsetParam := c.Query("offset")
	if offsetParam != "" {
		parsedOffset, err := strconv.Atoi(offsetParam)
		if err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get limit parameter
	limitParam := c.Query("limit")
	if limitParam != "" {
		parsedLimit, err := strconv.Atoi(limitParam)
		if err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	return offset, limit
}
