package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/services"
)

type AuthHandler struct {
	authService *services.AuthService
}

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

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	token, user, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Set cookie with the token
	// Use 30 days for remember me, or 1 day for regular login
	maxAge := 86400 // 1 day in seconds
	if req.RememberMe {
		maxAge = 2592000 // 30 days in seconds
	}

	// Set HTTP-only cookie
	c.SetCookie(
		"auth_token",
		token,
		maxAge,
		"/",
		"",
		false, // secure - set to true in production with HTTPS
		true,  // HTTP only
	)

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Username,
			"role":  user.Role,
		},
	})
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	user, err := h.authService.Register(req.Email, req.Password, req.Name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Generate token for the newly registered user
	token, err := h.authService.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate token",
		})
		return
	}

	// Set cookie with the token (1 day default for new registrations)
	c.SetCookie(
		"auth_token",
		token,
		86400, // 1 day in seconds
		"/",
		"",
		false, // secure
		true,  // HTTP only
	)

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Username,
			"role":  user.Role,
		},
	})
}

// Logout handles the user logout process
func (h *AuthHandler) Logout(c *gin.Context) {
	// Clear the auth cookie
	c.SetCookie(
		"auth_token",
		"",
		-1, // expire immediately
		"/",
		"",
		false,
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully logged out",
	})
}
