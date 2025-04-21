package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/services"
)

func JWTAuth(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string
		var foundToken bool

		// Check Authorization header first
		authHeader := c.GetHeader("Authorization")
		log.Printf("[JWT Middleware] Authorization header: %s", authHeader)

		// Try to extract token from Authorization header
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
				foundToken = true
				log.Printf("[JWT Middleware] Token found in Authorization header: %s (first 10 chars)", tokenString[:min(10, len(tokenString))])
			} else {
				log.Printf("[JWT Middleware] Invalid Authorization header format: %s", authHeader)
			}
		} else {
			log.Println("[JWT Middleware] Authorization header is empty")
		}

		// If token not found in Authorization header, try cookie
		if !foundToken {
			cookie, err := c.Cookie("auth_token")
			if err == nil && cookie != "" {
				tokenString = cookie
				foundToken = true
				log.Printf("[JWT Middleware] Token found in cookie: %s (first 10 chars)", tokenString[:min(10, len(tokenString))])
			} else {
				log.Println("[JWT Middleware] No token found in cookie")
			}
		}

		// If no token found at all
		if !foundToken {
			log.Println("[JWT Middleware] No token found in either header or cookie")

			// For HTML requests, redirect to login
			if strings.Contains(c.GetHeader("Accept"), "text/html") {
				log.Println("[JWT Middleware] Redirecting HTML request to login")
				c.Redirect(http.StatusFound, "/login")
				c.Abort()
				return
			}

			// For API requests, return JSON error
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required. Please provide token via Authorization header or cookie",
			})
			c.Abort()
			return
		}

		// Validate token
		claims, err := authService.ValidateToken(tokenString)
		if err != nil {
			log.Printf("[JWT Middleware] Token validation failed: %v", err)

			// For HTML requests, redirect to login
			if strings.Contains(c.GetHeader("Accept"), "text/html") {
				log.Println("[JWT Middleware] Redirecting HTML request to login due to invalid token")
				c.Redirect(http.StatusFound, "/login")
				c.Abort()
				return
			}

			// For API requests, return JSON error
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		log.Printf("[JWT Middleware] Token validated successfully for user ID: %d", claims.UserID)
		// Set user ID in context for use in handlers
		c.Set("userID", claims.UserID)

		c.Next()
	}
}

// Helper function to get minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
