// Package goversionmiddleware provides Gin middleware for API version routing,
// validation, deprecation headers, and sunset enforcement.
//
// It extracts the API version from URL paths like /api/v1/... and validates
// against configured active, deprecated, and sunset versions.
//
// Usage:
//
//	cfg := goversionmiddleware.ConfigFromEnv("WORKSPACE", os.Getenv)
//	router.Use(goversionmiddleware.Middleware(cfg))
//
//	// In handlers:
//	version := goversionmiddleware.GetVersion(c)
package goversionmiddleware

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Context key used to store the API version in the Gin context.
const ContextKeyAPIVersion = "api_version"

// versionPattern matches versioned API paths like /api/v1/resource or /api/v1.2/resource.
var versionPattern = regexp.MustCompile(`^/api/(v\d+(?:\.\d+)?)(/.*)$`)

// Config holds configuration for the version middleware.
type Config struct {
	// ServiceKey identifies the service for environment variable lookups.
	ServiceKey string

	// ActiveVersions lists API versions that are fully supported.
	ActiveVersions []string

	// DeprecatedVersions lists API versions that still work but are deprecated.
	DeprecatedVersions []string

	// SunsetConfig maps version strings to sunset dates (RFC 3339 date format, e.g. "2026-06-01").
	SunsetConfig map[string]string

	// DefaultVersion is the version to advertise as the successor in deprecation headers.
	DefaultVersion string

	// VersionMode controls validation behavior. "local" skips validation; "deployed" enforces it.
	VersionMode string
}

// ConfigFromEnv builds a Config from environment variables using the provided
// getenv function and service key. It checks service-specific env vars first
// (e.g. WORKSPACE_SUPPORTED_VERSIONS) then falls back to generic ones
// (e.g. SUPPORTED_VERSIONS).
//
// Environment variables:
//   - SUPPORTED_VERSIONS / {KEY}_SUPPORTED_VERSIONS: comma-separated active versions
//   - DEPRECATED_VERSIONS / {KEY}_DEPRECATED_VERSIONS: comma-separated deprecated versions
//   - SUNSET_CONFIG / {KEY}_SUNSET_CONFIG: format "v1:2026-06-01,v2:2026-12-01"
//   - API_VERSION: default version (falls back to "v1")
//   - VERSION_MODE: "local" or "deployed" (falls back to "local")
func ConfigFromEnv(serviceKey string, getenv func(string) string) Config {
	key := strings.ToUpper(serviceKey)

	cfg := Config{
		ServiceKey: serviceKey,
	}

	// Active versions
	supported := envWithFallback(key+"_SUPPORTED_VERSIONS", "SUPPORTED_VERSIONS", getenv)
	if supported != "" {
		cfg.ActiveVersions = splitCSV(supported)
	}

	// Deprecated versions
	deprecated := envWithFallback(key+"_DEPRECATED_VERSIONS", "DEPRECATED_VERSIONS", getenv)
	if deprecated != "" {
		cfg.DeprecatedVersions = splitCSV(deprecated)
	}

	// Sunset config
	sunsetRaw := envWithFallback(key+"_SUNSET_CONFIG", "SUNSET_CONFIG", getenv)
	if sunsetRaw != "" {
		cfg.SunsetConfig = parseSunsetConfig(sunsetRaw)
	}

	// Default version
	cfg.DefaultVersion = getenv("API_VERSION")
	if cfg.DefaultVersion == "" {
		cfg.DefaultVersion = "v1"
	}

	// Version mode
	cfg.VersionMode = getenv("VERSION_MODE")
	if cfg.VersionMode == "" {
		cfg.VersionMode = "local"
	}

	// If no active versions were set, default to the default version
	if len(cfg.ActiveVersions) == 0 && len(cfg.DeprecatedVersions) == 0 {
		cfg.ActiveVersions = []string{cfg.DefaultVersion}
	}

	return cfg
}

// Middleware returns a Gin middleware that validates API versions in request paths.
//
// In local mode, it sets the api_version context key and passes through without
// validation. In deployed mode, it enforces version checks:
//   - Sunset versions past their date return 410 Gone
//   - Unsupported versions return 404 Not Found
//   - Deprecated versions pass through with Deprecation and Sunset headers
//   - Active versions pass through normally
func Middleware(cfg Config) gin.HandlerFunc {
	activeSet := toSet(cfg.ActiveVersions)
	deprecatedSet := toSet(cfg.DeprecatedVersions)

	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// In local mode, extract version if present and pass through
		if cfg.VersionMode == "local" {
			version := cfg.DefaultVersion
			if matches := versionPattern.FindStringSubmatch(path); matches != nil {
				version = matches[1]
			}
			c.Set(ContextKeyAPIVersion, version)
			c.Next()
			return
		}

		// Non-versioned paths (health, metrics, etc.) pass through
		matches := versionPattern.FindStringSubmatch(path)
		if matches == nil {
			c.Next()
			return
		}

		version := matches[1]

		// Check sunset: if version has a sunset date that is in the past, return 410 Gone
		if sunsetDate, ok := cfg.SunsetConfig[version]; ok {
			t, err := time.Parse("2006-01-02", sunsetDate)
			if err == nil && time.Now().After(t) {
				c.JSON(http.StatusGone, gin.H{
					"error":   "API version has been sunset",
					"version": version,
					"sunset":  sunsetDate,
					"message": fmt.Sprintf("API %s was sunset on %s. Please migrate to %s.", version, sunsetDate, cfg.DefaultVersion),
				})
				c.Abort()
				return
			}
		}

		// Check if version is supported (active or deprecated)
		_, isActive := activeSet[version]
		_, isDeprecated := deprecatedSet[version]

		if !isActive && !isDeprecated {
			c.JSON(http.StatusNotFound, gin.H{
				"error":              "API version not found",
				"version":            version,
				"supported_versions": cfg.ActiveVersions,
			})
			c.Abort()
			return
		}

		// Deprecated versions: add deprecation headers and pass through
		if isDeprecated {
			c.Writer.Header().Set("Deprecation", "true")
			if sunsetDate, ok := cfg.SunsetConfig[version]; ok {
				c.Writer.Header().Set("Sunset", sunsetDate)
			}
			c.Writer.Header().Set("Link", fmt.Sprintf("</api/%s>; rel=\"successor-version\"", cfg.DefaultVersion))
		}

		// Set version in context and continue
		c.Set(ContextKeyAPIVersion, version)
		c.Next()
	}
}

// GetVersion extracts the API version from the Gin context.
// Returns "v1" if no version is set.
func GetVersion(c *gin.Context) string {
	val, exists := c.Get(ContextKeyAPIVersion)
	if !exists {
		return "v1"
	}
	version, ok := val.(string)
	if !ok {
		return "v1"
	}
	return version
}

// envWithFallback checks the primary env var first, then the fallback.
func envWithFallback(primary, fallback string, getenv func(string) string) string {
	val := getenv(primary)
	if val != "" {
		return val
	}
	return getenv(fallback)
}

// splitCSV splits a comma-separated string into trimmed, non-empty parts.
func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

// parseSunsetConfig parses a string like "v1:2026-06-01,v2:2026-12-01" into a map.
func parseSunsetConfig(s string) map[string]string {
	result := make(map[string]string)
	pairs := strings.Split(s, ",")
	for _, pair := range pairs {
		pair = strings.TrimSpace(pair)
		parts := strings.SplitN(pair, ":", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			if key != "" && val != "" {
				result[key] = val
			}
		}
	}
	return result
}

// toSet converts a slice of strings to a set (map[string]struct{}).
func toSet(items []string) map[string]struct{} {
	s := make(map[string]struct{}, len(items))
	for _, item := range items {
		s[item] = struct{}{}
	}
	return s
}
