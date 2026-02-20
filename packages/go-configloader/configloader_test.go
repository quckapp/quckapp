package configloader

import (
	"os"
	"testing"
)

func TestLoadEnvFile(t *testing.T) {
	body := []byte(`# ── Service URLs ──
AUTH_SERVICE_URL=http://auth-service:8080
USER_SERVICE_URL=http://user-service:8081

# ── Secrets ──
JWT_SECRET=test-jwt-secret
REDIS_PASSWORD="contains:special=chars"
`)

	opts := Options{}
	opts.defaults()

	// Clear env vars
	os.Unsetenv("AUTH_SERVICE_URL")
	os.Unsetenv("USER_SERVICE_URL")
	os.Unsetenv("JWT_SECRET")
	os.Unsetenv("REDIS_PASSWORD")

	count, err := loadEnvFile(body, opts)
	if err != nil {
		t.Fatalf("loadEnvFile: %v", err)
	}
	if count != 4 {
		t.Fatalf("expected 4 keys, got %d", count)
	}

	if got := os.Getenv("AUTH_SERVICE_URL"); got != "http://auth-service:8080" {
		t.Errorf("AUTH_SERVICE_URL = %q, want %q", got, "http://auth-service:8080")
	}
	if got := os.Getenv("JWT_SECRET"); got != "test-jwt-secret" {
		t.Errorf("JWT_SECRET = %q, want %q", got, "test-jwt-secret")
	}
	if got := os.Getenv("REDIS_PASSWORD"); got != "contains:special=chars" {
		t.Errorf("REDIS_PASSWORD = %q, want %q", got, "contains:special=chars")
	}

	// Clean up
	os.Unsetenv("AUTH_SERVICE_URL")
	os.Unsetenv("USER_SERVICE_URL")
	os.Unsetenv("JWT_SECRET")
	os.Unsetenv("REDIS_PASSWORD")
}

func TestLoadEnvFileRespectsExistingVars(t *testing.T) {
	body := []byte("JWT_SECRET=from-api\nPORT=3000\n")

	// Pre-set JWT_SECRET — should NOT be overwritten
	os.Setenv("JWT_SECRET", "local-override")

	opts := Options{}
	opts.defaults()

	os.Unsetenv("PORT")

	count, err := loadEnvFile(body, opts)
	if err != nil {
		t.Fatalf("loadEnvFile: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 new key (PORT only), got %d", count)
	}

	// JWT_SECRET should still be the local value
	if got := os.Getenv("JWT_SECRET"); got != "local-override" {
		t.Errorf("JWT_SECRET = %q, want %q (local override)", got, "local-override")
	}
	// PORT should be from API
	if got := os.Getenv("PORT"); got != "3000" {
		t.Errorf("PORT = %q, want %q", got, "3000")
	}

	os.Unsetenv("JWT_SECRET")
	os.Unsetenv("PORT")
}

func TestLoadJSON(t *testing.T) {
	body := []byte(`{"AUTH_SERVICE_URL":"http://auth:8080","JWT_SECRET":"json-secret"}`)

	opts := Options{}
	opts.defaults()

	os.Unsetenv("AUTH_SERVICE_URL")
	os.Unsetenv("JWT_SECRET")

	count, err := loadJSON(body, opts)
	if err != nil {
		t.Fatalf("loadJSON: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected 2 keys, got %d", count)
	}
	if got := os.Getenv("AUTH_SERVICE_URL"); got != "http://auth:8080" {
		t.Errorf("AUTH_SERVICE_URL = %q, want %q", got, "http://auth:8080")
	}

	os.Unsetenv("AUTH_SERVICE_URL")
	os.Unsetenv("JWT_SECRET")
}

func TestLoadOnlyKeys(t *testing.T) {
	body := []byte("KEY_A=val_a\nKEY_B=val_b\nKEY_C=val_c\n")

	opts := Options{
		OnlyKeys: []string{"KEY_A", "KEY_C"},
	}
	opts.defaults()

	os.Unsetenv("KEY_A")
	os.Unsetenv("KEY_B")
	os.Unsetenv("KEY_C")

	count, err := loadEnvFile(body, opts)
	if err != nil {
		t.Fatalf("loadEnvFile: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected 2 keys, got %d", count)
	}
	if got := os.Getenv("KEY_B"); got != "" {
		t.Errorf("KEY_B should be empty, got %q", got)
	}

	os.Unsetenv("KEY_A")
	os.Unsetenv("KEY_C")
}

func TestLoadSkipsWhenNotConfigured(t *testing.T) {
	os.Unsetenv("SERVICE_URLS_API")
	os.Unsetenv("CONFIG_ENV")

	err := Load(Options{})
	if err != nil {
		t.Fatalf("Load should return nil when not configured, got: %v", err)
	}
}
