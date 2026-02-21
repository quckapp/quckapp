package middleware

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/quckapp/service-urls-api/internal/repository"
)

// APIKeyAuth validates the X-API-Key header (or ?apikey= query param)
// against the config_api_keys table. It also checks that the requested
// environment is allowed for this key.
func APIKeyAuth(repo *repository.Repository) gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			apiKey = c.Query("apikey")
		}
		if apiKey == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Missing API key. Provide X-API-Key header or ?apikey= query parameter.",
			})
			return
		}
		if !doAPIKeyAuth(c, repo, apiKey) {
			return // already aborted
		}
	}
}

// APIKeyOrJWTAuth validates either an X-API-Key header (or ?apikey= query param)
// against the config_api_keys table, OR a Bearer JWT token from the admin panel.
// This allows both programmatic (service) and admin (UI) access to config endpoints.
func APIKeyOrJWTAuth(repo *repository.Repository, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Try API key first (header or query param)
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			apiKey = c.Query("apikey")
		}
		if apiKey != "" {
			doAPIKeyAuth(c, repo, apiKey)
			return
		}

		// 2. Try JWT Bearer token (admin panel)
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				return []byte(jwtSecret), nil
			})
			if err == nil && token.Valid {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					if sub, ok := claims["sub"].(string); ok {
						c.Set("user_id", sub)
					}
				}
				c.Next()
				return
			}
		}

		// 3. Neither API key nor JWT — reject
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Missing authentication. Provide X-API-Key header, ?apikey= query parameter, or Bearer token.",
		})
	}
}

// doAPIKeyAuth validates the API key and calls c.Next() on success.
// Returns true if the key was valid (c.Next() called), false if aborted.
func doAPIKeyAuth(c *gin.Context, repo *repository.Repository, apiKey string) bool {
	hash := sha256Hex(apiKey)
	keyRecord, err := repo.ValidateAPIKey(hash)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Internal error validating API key",
		})
		return false
	}
	if keyRecord == nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Invalid or expired API key",
		})
		return false
	}

	// Check environment access
	env := c.Param("env")
	if env != "" && !isEnvAllowed(keyRecord.Environments, env) {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": fmt.Sprintf("API key does not have access to environment: %s", env),
		})
		return false
	}

	// Store key info in context for downstream handlers
	c.Set("api_key_id", keyRecord.ID)
	c.Set("api_key_name", keyRecord.Name)
	if keyRecord.ServiceName != nil {
		c.Set("api_key_service", *keyRecord.ServiceName)
	}

	c.Next()
	return true
}

func sha256Hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return fmt.Sprintf("%x", h)
}

func isEnvAllowed(allowed []string, env string) bool {
	for _, a := range allowed {
		if a == "*" || a == env {
			return true
		}
	}
	return false
}
