// Package goauth provides standardized JWT authentication middleware for QuckApp Go services.
//
// It validates JWT tokens issued by the QuckApp auth-service and extracts
// standard claims (user_id, email, session_id, 2fa) into the Gin context.
//
// Usage:
//
//	cfg := goauth.DefaultConfig(os.Getenv("JWT_SECRET"))
//	router.Use(goauth.Auth(cfg))
//
//	// In handlers:
//	userID, _ := goauth.GetUserID(c)
package goauth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Context keys used to store claims in the Gin context.
const (
	ContextKeyUserID    = "user_id"
	ContextKeyEmail     = "email"
	ContextKeySessionID = "session_id"
	ContextKey2FA       = "2fa"
	ContextKeyClaims    = "claims"
)

// Claims represents the JWT claims structure issued by auth-service.
type Claims struct {
	Sub       string `json:"sub"`       // User ID (UUID)
	Email     string `json:"email"`     // User email
	SessionID string `json:"sessionId"` // Session identifier
	TwoFA     bool   `json:"2fa"`       // Two-factor authentication verified
	jwt.RegisteredClaims
}

// Config holds configuration for the auth middleware.
type Config struct {
	// JWTSecret is the HMAC secret used to verify token signatures.
	JWTSecret string

	// Issuer is the expected token issuer. Tokens with a different issuer
	// are rejected. Default: "quckapp-auth"
	Issuer string

	// RequireTwoFA rejects requests where the 2fa claim is false.
	RequireTwoFA bool

	// SkipPaths lists URL paths that skip authentication (e.g., health checks).
	SkipPaths []string
}

// DefaultConfig returns a Config with standard QuckApp defaults.
func DefaultConfig(jwtSecret string) Config {
	return Config{
		JWTSecret: jwtSecret,
		Issuer:    "quckapp-auth",
		SkipPaths: []string{"/health", "/ready", "/metrics"},
	}
}

// Auth returns a Gin middleware that validates JWT Bearer tokens
// and populates the context with user claims.
func Auth(cfg Config) gin.HandlerFunc {
	skipSet := make(map[string]struct{}, len(cfg.SkipPaths))
	for _, p := range cfg.SkipPaths {
		skipSet[p] = struct{}{}
	}

	return func(c *gin.Context) {
		// Skip authentication for configured paths
		if _, ok := skipSet[c.Request.URL.Path]; ok {
			c.Next()
			return
		}

		// Extract Bearer token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Parse and validate the token
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
			// Ensure the signing method is HMAC
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Validate issuer if configured
		if cfg.Issuer != "" && claims.Issuer != cfg.Issuer {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token issuer"})
			c.Abort()
			return
		}

		// Check 2FA requirement
		if cfg.RequireTwoFA && !claims.TwoFA {
			c.JSON(http.StatusForbidden, gin.H{"error": "Two-factor authentication required"})
			c.Abort()
			return
		}

		// Validate user ID is present
		if claims.Sub == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token missing user identity"})
			c.Abort()
			return
		}

		// Store claims in context for downstream handlers
		c.Set(ContextKeyUserID, claims.Sub)
		c.Set(ContextKeyEmail, claims.Email)
		c.Set(ContextKeySessionID, claims.SessionID)
		c.Set(ContextKey2FA, claims.TwoFA)
		c.Set(ContextKeyClaims, claims)

		c.Next()
	}
}

// GetUserID extracts the authenticated user's ID from the Gin context.
func GetUserID(c *gin.Context) (string, bool) {
	val, exists := c.Get(ContextKeyUserID)
	if !exists {
		return "", false
	}
	id, ok := val.(string)
	return id, ok
}

// GetEmail extracts the authenticated user's email from the Gin context.
func GetEmail(c *gin.Context) (string, bool) {
	val, exists := c.Get(ContextKeyEmail)
	if !exists {
		return "", false
	}
	email, ok := val.(string)
	return email, ok
}

// GetSessionID extracts the session ID from the Gin context.
func GetSessionID(c *gin.Context) (string, bool) {
	val, exists := c.Get(ContextKeySessionID)
	if !exists {
		return "", false
	}
	sid, ok := val.(string)
	return sid, ok
}

// GetClaims extracts the full claims from the Gin context.
func GetClaims(c *gin.Context) (*Claims, bool) {
	val, exists := c.Get(ContextKeyClaims)
	if !exists {
		return nil, false
	}
	claims, ok := val.(*Claims)
	return claims, ok
}

// Is2FAVerified checks if the current request has verified 2FA.
func Is2FAVerified(c *gin.Context) bool {
	val, exists := c.Get(ContextKey2FA)
	if !exists {
		return false
	}
	verified, ok := val.(bool)
	return ok && verified
}
