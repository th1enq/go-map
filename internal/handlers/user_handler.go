// Package handlers provides HTTP request handlers for the application
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/services"
)

// UserHandler handles user-related HTTP requests
type UserHandler struct {
	authService *services.AuthService
	userService *services.UserServices
}

// UpdateProfileRequest represents the request body for profile updates
type UpdateProfileRequest struct {
	Username  string `json:"username"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

// ChangePasswordRequest represents the request body for password changes
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
}

// ProfileResponse represents a user profile in the response
type ProfileResponse struct {
	User interface{} `json:"user"`
}

// NewUserHandler creates a new instance of UserHandler
func NewUserHandler(authService *services.AuthService, userService *services.UserServices) *UserHandler {
	return &UserHandler{
		authService: authService,
		userService: userService,
	}
}

// GetProfile retrieves the current user's profile
func (h *UserHandler) GetProfile(c *gin.Context) {
	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	// Get user details
	user, err := h.authService.GetUserByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get user profile"})
		return
	}

	c.JSON(http.StatusOK, ProfileResponse{
		User: user,
	})
}

// UpdateProfile updates the current user's profile
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	// Get current user
	user, err := h.authService.GetUserByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get user profile"})
		return
	}

	// Update user fields
	user.Username = req.Username
	user.FirstName = req.FirstName
	user.LastName = req.LastName

	// Save updated user
	if err := h.userService.UpdateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    user,
	})
}

// ChangePassword changes the current user's password
func (h *UserHandler) ChangePassword(c *gin.Context) {
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	// Get current user
	user, err := h.authService.GetUserByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get user"})
		return
	}

	// Verify current password
	if err := user.CheckPassword(req.CurrentPassword); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Current password is incorrect"})
		return
	}

	// Set new password
	if err := user.SetPassword(req.NewPassword); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to set new password"})
		return
	}

	// Save updated user
	if err := h.userService.UpdateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{Message: "Password changed successfully"})
}
