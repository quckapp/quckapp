// +build integration

package configloader

import (
	"os"
	"testing"
)

// Run with: go test -v -tags integration ./...
// Requires service-urls API running at localhost:8088

func TestLiveEnvFileLoad(t *testing.T) {
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("JWT_SECRET")
	os.Unsetenv("KAFKA_BROKERS")

	err := Load(Options{
		APIBaseURL:  "http://localhost:8088",
		Environment: "development",
		Format:      "env-file",
		Retries:     1,
	})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	if got := os.Getenv("JWT_SECRET"); got == "" {
		t.Error("JWT_SECRET should have been set from API")
	} else {
		t.Logf("JWT_SECRET = %s", got)
	}

	if got := os.Getenv("AUTH_SERVICE_URL"); got == "" {
		t.Error("AUTH_SERVICE_URL should have been set from API")
	} else {
		t.Logf("AUTH_SERVICE_URL = %s", got)
	}
}

func TestLiveSingleValue(t *testing.T) {
	val, err := LoadSingleValue("AUTH_SERVICE", Options{
		APIBaseURL:  "http://localhost:8088",
		Environment: "development",
		Retries:     1,
	})
	if err != nil {
		t.Fatalf("LoadSingleValue: %v", err)
	}
	if val == "" {
		t.Error("Expected a URL value for AUTH_SERVICE")
	}
	t.Logf("AUTH_SERVICE = %s", val)
}
