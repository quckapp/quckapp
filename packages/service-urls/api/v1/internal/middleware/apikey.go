package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/quckapp/service-urls-api/internal/repository"
)

func ApiKeyAuth(repo *repository.ApiKeyRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader("X-API-Key")
		if key == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing X-API-Key header"})
			return
		}

		env := c.Param("env")
		valid, err := repo.ValidateKey(key, env)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to validate API key"})
			return
		}
		if !valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid API key"})
			return
		}

		c.Next()
	}
}
