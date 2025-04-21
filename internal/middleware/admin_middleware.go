package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/models"
	"github.com/th1enq/go-map/internal/services"
)

// AdminAuthMiddleware kiểm tra xem người dùng có quyền admin hay không
func AdminAuthMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Lấy userID từ context (đã được thiết lập bởi JWTAuth middleware)
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User ID not found"})
			c.Abort()
			return
		}

		// Kiểm tra xem người dùng có quyền admin hay không
		user, err := authService.GetUserByID(userID.(uint))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User not found"})
			c.Abort()
			return
		}

		if user.Role != models.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: Admin access required"})
			c.Abort()
			return
		}

		// Set full user object in context for handlers
		c.Set("user", user)

		c.Next()
	}
}
