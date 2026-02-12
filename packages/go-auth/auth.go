package goauth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Claims represents the JWT claims issued by the auth-service.
type Claims struct {
	Sub       string `json:"sub"`
	Email     string `json:"email"`
	SessionID string `json:"sessionId"`
	TwoFA     bool   `json:"2fa"`
	jwt.RegisteredClaims
}

// Config holds authentication middleware configuration.
type Config struct {
	JWTSecret    string
	Issuer       string
	RequireTwoFA bool
	SkipPaths    []string
}

// DefaultConfig returns a Config with sensible defaults for QuckApp.
func DefaultConfig(jwtSecret string) Config {
	return Config{
		JWTSecret: jwtSecret,
		Issuer:    "quckapp-auth",
		SkipPaths: []string{"/health", "/ready", "/metrics"},
	}
}

// Auth returns a Gin middleware that validates JWT Bearer tokens.
func Auth(cfg Config) gin.HandlerFunc {
	skipSet := make(map[string]bool, len(cfg.SkipPaths))
	for _, p := range cfg.SkipPaths {
		skipSet[p] = true
	}

	return func(c *gin.Context) {
		// Skip auth for configured paths
		if skipSet[c.Request.URL.Path] {
			c.Next()
			return
		}

		// Extract Bearer token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			return
		}
		tokenString := parts[1]

		// Parse and validate token
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			// Ensure HMAC signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(cfg.JWTSecret), nil
		}, jwt.WithIssuer(cfg.Issuer))

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		// Validate sub claim
		if claims.Sub == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing subject claim"})
			return
		}

		// Check 2FA if required
		if cfg.RequireTwoFA && !claims.TwoFA {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "two-factor authentication required"})
			return
		}

		// Set context values
		c.Set("user_id", claims.Sub)
		c.Set("email", claims.Email)
		c.Set("session_id", claims.SessionID)
		c.Set("claims", claims)

		c.Next()
	}
}

// GetUserID extracts the user ID from the Gin context.
func GetUserID(c *gin.Context) (string, bool) {
	v, exists := c.Get("user_id")
	if !exists {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}

// GetEmail extracts the email from the Gin context.
func GetEmail(c *gin.Context) (string, bool) {
	v, exists := c.Get("email")
	if !exists {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}

// GetSessionID extracts the session ID from the Gin context.
func GetSessionID(c *gin.Context) (string, bool) {
	v, exists := c.Get("session_id")
	if !exists {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}

// GetClaims extracts all claims from the Gin context.
func GetClaims(c *gin.Context) (*Claims, bool) {
	v, exists := c.Get("claims")
	if !exists {
		return nil, false
	}
	cl, ok := v.(*Claims)
	return cl, ok
}

// Is2FAVerified returns true if the token has 2FA verified.
func Is2FAVerified(c *gin.Context) bool {
	claims, ok := GetClaims(c)
	if !ok {
		return false
	}
	return claims.TwoFA
}
