// Package handlers provides HTTP request handlers for the application
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/services"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	authService *services.AuthService
}

// Request and response structures
type LoginRequest struct {
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required"`
	RememberMe bool   `json:"remember_me"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type UserResponse struct {
	ID        uint   `json:"id"`
	Email     string `json:"email"`
	Username  string `json:"name"`
	Role      string `json:"role"`
	FirstName string `json:"first_name,omitempty"`
	LastName  string `json:"last_name,omitempty"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type AuthStatusResponse struct {
	Authenticated bool         `json:"authenticated"`
	User          UserResponse `json:"user,omitempty"`
	Error         string       `json:"error,omitempty"`
}

// NewAuthHandler creates a new instance of AuthHandler
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Login authenticates a user and returns a JWT token
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	token, user, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: err.Error()})
		return
	}

	// Set cookie with the token
	// Use 30 days for remember me, or 1 day for regular login
	maxAge := 86400 // 1 day in seconds
	if req.RememberMe {
		maxAge = 2592000 // 30 days in seconds
	}

	// Set HTTP-only cookie
	setCookieAuth(c, token, maxAge)

	c.JSON(http.StatusOK, AuthResponse{
		Token: token,
		User: UserResponse{
			ID:       user.ID,
			Email:    user.Email,
			Username: user.Username,
			Role:     string(user.Role),
		},
	})
}

// Register creates a new user account
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	user, err := h.authService.Register(req.Email, req.Password, req.Name)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Generate token for the newly registered user
	token, err := h.authService.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to generate token"})
		return
	}

	// Set cookie with the token (1 day default for new registrations)
	setCookieAuth(c, token, 86400)

	c.JSON(http.StatusCreated, AuthResponse{
		Token: token,
		User: UserResponse{
			ID:       user.ID,
			Email:    user.Email,
			Username: user.Username,
			Role:     string(user.Role),
		},
	})
}

// Logout handles the user logout process
func (h *AuthHandler) Logout(c *gin.Context) {
	// Clear the auth cookie
	setCookieAuth(c, "", -1) // expire immediately

	c.JSON(http.StatusOK, SuccessResponse{Message: "Successfully logged out"})
}

// CheckAuthStatus checks if the user is currently authenticated
func (h *AuthHandler) CheckAuthStatus(c *gin.Context) {
	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, AuthStatusResponse{
			Authenticated: false,
			Error:         "Unauthorized",
		})
		return
	}

	// Get user details
	user, err := h.authService.GetUserByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, AuthStatusResponse{
			Authenticated: false,
			Error:         "Failed to get user details",
		})
		return
	}

	c.JSON(http.StatusOK, AuthStatusResponse{
		Authenticated: true,
		User: UserResponse{
			ID:        user.ID,
			Username:  user.Username,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Role:      string(user.Role),
		},
	})
}

// Helper function to set authentication cookie
func setCookieAuth(c *gin.Context, token string, maxAge int) {
	c.SetCookie(
		"auth_token",
		token,
		maxAge,
		"/",
		"",
		false, // secure - set to true in production with HTTPS
		true,  // HTTP only
	)
}
