package goversionmiddleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupVersionRouter(cfg Config) *gin.Engine {
	router := gin.New()
	router.Use(Middleware(cfg))

	router.GET("/api/v1/*path", func(c *gin.Context) {
		c.JSON(200, gin.H{"version": GetVersion(c)})
	})
	router.GET("/api/v2/*path", func(c *gin.Context) {
		c.JSON(200, gin.H{"version": GetVersion(c)})
	})
	router.GET("/api/v3/*path", func(c *gin.Context) {
		c.JSON(200, gin.H{"version": GetVersion(c)})
	})
	router.GET("/api/v99/*path", func(c *gin.Context) {
		c.JSON(200, gin.H{"version": GetVersion(c)})
	})
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	router.GET("/metrics", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	return router
}

func TestActiveVersion(t *testing.T) {
	cfg := Config{
		ActiveVersions: []string{"v1", "v2"},
		DefaultVersion: "v2",
		VersionMode:    "deployed",
	}
	router := setupVersionRouter(cfg)

	req := httptest.NewRequest("GET", "/api/v1/users", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for active version, got %d: %s", w.Code, w.Body.String())
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response body: %v", err)
	}
	if body["version"] != "v1" {
		t.Errorf("expected version=v1 in response, got %v", body["version"])
	}

	// Verify no deprecation headers on active version
	if dep := w.Header().Get("Deprecation"); dep != "" {
		t.Errorf("expected no Deprecation header for active version, got %q", dep)
	}
}

func TestUnsupportedVersion(t *testing.T) {
	cfg := Config{
		ActiveVersions: []string{"v1"},
		DefaultVersion: "v1",
		VersionMode:    "deployed",
	}
	router := setupVersionRouter(cfg)

	req := httptest.NewRequest("GET", "/api/v3/users", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for unsupported version, got %d: %s", w.Code, w.Body.String())
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response body: %v", err)
	}
	if body["error"] != "API version not found" {
		t.Errorf("expected 'API version not found' error, got %v", body["error"])
	}
}

func TestDeprecatedVersion(t *testing.T) {
	cfg := Config{
		ActiveVersions:     []string{"v2"},
		DeprecatedVersions: []string{"v1"},
		SunsetConfig:       map[string]string{"v1": "2099-01-01"},
		DefaultVersion:     "v2",
		VersionMode:        "deployed",
	}
	router := setupVersionRouter(cfg)

	req := httptest.NewRequest("GET", "/api/v1/users", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for deprecated version, got %d: %s", w.Code, w.Body.String())
	}

	// Check Deprecation header
	if dep := w.Header().Get("Deprecation"); dep != "true" {
		t.Errorf("expected Deprecation: true, got %q", dep)
	}

	// Check Sunset header
	if sunset := w.Header().Get("Sunset"); sunset != "2099-01-01" {
		t.Errorf("expected Sunset: 2099-01-01, got %q", sunset)
	}

	// Check Link header
	expectedLink := `</api/v2>; rel="successor-version"`
	if link := w.Header().Get("Link"); link != expectedLink {
		t.Errorf("expected Link: %q, got %q", expectedLink, link)
	}
}

func TestSunsetVersion(t *testing.T) {
	cfg := Config{
		ActiveVersions:     []string{"v2"},
		DeprecatedVersions: []string{"v1"},
		SunsetConfig:       map[string]string{"v1": "2020-01-01"},
		DefaultVersion:     "v2",
		VersionMode:        "deployed",
	}
	router := setupVersionRouter(cfg)

	req := httptest.NewRequest("GET", "/api/v1/users", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusGone {
		t.Errorf("expected 410 Gone for sunset version, got %d: %s", w.Code, w.Body.String())
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response body: %v", err)
	}
	if body["error"] != "API version has been sunset" {
		t.Errorf("expected 'API version has been sunset' error, got %v", body["error"])
	}
}

func TestLocalModeSkipsValidation(t *testing.T) {
	cfg := Config{
		ActiveVersions: []string{"v1"},
		DefaultVersion: "v1",
		VersionMode:    "local",
	}
	router := setupVersionRouter(cfg)

	// v99 is not in active or deprecated, but local mode should pass through
	req := httptest.NewRequest("GET", "/api/v99/users", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 in local mode regardless of version, got %d: %s", w.Code, w.Body.String())
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response body: %v", err)
	}
	if body["version"] != "v99" {
		t.Errorf("expected version=v99 in local mode, got %v", body["version"])
	}
}

func TestConfigFromEnv(t *testing.T) {
	envVars := map[string]string{
		"WORKSPACE_SUPPORTED_VERSIONS":  "v1,v2",
		"WORKSPACE_DEPRECATED_VERSIONS": "v0",
		"WORKSPACE_SUNSET_CONFIG":       "v0:2025-06-01",
		"API_VERSION":                   "v2",
		"VERSION_MODE":                  "deployed",
	}
	getenv := func(key string) string {
		return envVars[key]
	}

	cfg := ConfigFromEnv("workspace", getenv)

	if cfg.ServiceKey != "workspace" {
		t.Errorf("expected ServiceKey=workspace, got %s", cfg.ServiceKey)
	}

	if len(cfg.ActiveVersions) != 2 || cfg.ActiveVersions[0] != "v1" || cfg.ActiveVersions[1] != "v2" {
		t.Errorf("expected ActiveVersions=[v1, v2], got %v", cfg.ActiveVersions)
	}

	if len(cfg.DeprecatedVersions) != 1 || cfg.DeprecatedVersions[0] != "v0" {
		t.Errorf("expected DeprecatedVersions=[v0], got %v", cfg.DeprecatedVersions)
	}

	if cfg.SunsetConfig["v0"] != "2025-06-01" {
		t.Errorf("expected SunsetConfig[v0]=2025-06-01, got %v", cfg.SunsetConfig)
	}

	if cfg.DefaultVersion != "v2" {
		t.Errorf("expected DefaultVersion=v2, got %s", cfg.DefaultVersion)
	}

	if cfg.VersionMode != "deployed" {
		t.Errorf("expected VersionMode=deployed, got %s", cfg.VersionMode)
	}
}

func TestConfigFromEnv_Fallback(t *testing.T) {
	// Test fallback to generic env vars
	envVars := map[string]string{
		"SUPPORTED_VERSIONS":  "v1,v3",
		"DEPRECATED_VERSIONS": "v0",
		"SUNSET_CONFIG":       "v0:2025-12-01",
	}
	getenv := func(key string) string {
		return envVars[key]
	}

	cfg := ConfigFromEnv("channel", getenv)

	if len(cfg.ActiveVersions) != 2 || cfg.ActiveVersions[0] != "v1" || cfg.ActiveVersions[1] != "v3" {
		t.Errorf("expected ActiveVersions=[v1, v3] from fallback, got %v", cfg.ActiveVersions)
	}

	// Default version should fall back to "v1"
	if cfg.DefaultVersion != "v1" {
		t.Errorf("expected DefaultVersion=v1 (default), got %s", cfg.DefaultVersion)
	}

	// Version mode should fall back to "local"
	if cfg.VersionMode != "local" {
		t.Errorf("expected VersionMode=local (default), got %s", cfg.VersionMode)
	}
}

func TestConfigFromEnv_EmptyDefaults(t *testing.T) {
	// Test that empty env produces sensible defaults
	getenv := func(key string) string {
		return ""
	}

	cfg := ConfigFromEnv("test", getenv)

	if cfg.DefaultVersion != "v1" {
		t.Errorf("expected DefaultVersion=v1, got %s", cfg.DefaultVersion)
	}
	if cfg.VersionMode != "local" {
		t.Errorf("expected VersionMode=local, got %s", cfg.VersionMode)
	}
	if len(cfg.ActiveVersions) != 1 || cfg.ActiveVersions[0] != "v1" {
		t.Errorf("expected ActiveVersions=[v1] as default, got %v", cfg.ActiveVersions)
	}
}

func TestNonVersionedPathPassthrough(t *testing.T) {
	cfg := Config{
		ActiveVersions: []string{"v1"},
		DefaultVersion: "v1",
		VersionMode:    "deployed",
	}
	router := setupVersionRouter(cfg)

	// /health should pass through without version validation
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for non-versioned path, got %d", w.Code)
	}
}

func TestGetVersion_Default(t *testing.T) {
	// When no version is set in context, should return "v1"
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	version := GetVersion(c)
	if version != "v1" {
		t.Errorf("expected default version v1, got %s", version)
	}
}

func TestGetVersion_FromContext(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Set(ContextKeyAPIVersion, "v2")
	version := GetVersion(c)
	if version != "v2" {
		t.Errorf("expected version v2, got %s", version)
	}
}
