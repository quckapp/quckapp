// Package configloader fetches environment configuration from the service-urls API
// and loads it into the process environment. It's designed to be called once at
// startup before other config packages (like godotenv) read env vars.
//
// Usage:
//
//	func main() {
//	    // Fetch config from service-urls API (if configured)
//	    configloader.Load(configloader.Options{})
//
//	    // Now load your normal config — env vars are already set
//	    cfg, err := config.Load()
//	}
//
// Required env vars:
//
//	SERVICE_URLS_API  — Base URL (e.g. http://service-urls-api:8085)
//	CONFIG_ENV        — Environment name (e.g. development, production)
//
// If these are not set, Load() silently returns nil (no-op).
package configloader

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// Options configures the config loader behavior.
type Options struct {
	// APIBaseURL overrides SERVICE_URLS_API env var.
	APIBaseURL string

	// Environment overrides CONFIG_ENV env var.
	Environment string

	// APIKey overrides CONFIG_API_KEY env var.
	// Sent as X-API-Key header for authentication.
	APIKey string

	// Format: "env-file" (default) or "json"
	Format string

	// Timeout for HTTP request (default: 10s)
	Timeout time.Duration

	// Retries: number of attempts (default: 5)
	Retries int

	// RetryDelay between attempts (default: 3s)
	RetryDelay time.Duration

	// Optional: if true, don't fail when API is unreachable
	Optional bool

	// EnvFilePath: write fetched .env to this path (default: "" = don't write)
	EnvFilePath string

	// Logger: custom logger (default: log.Default())
	Logger *log.Logger

	// OnlyKeys: if set, only load these specific keys from the response
	OnlyKeys []string
}

func (o *Options) defaults() {
	if o.APIBaseURL == "" {
		o.APIBaseURL = os.Getenv("SERVICE_URLS_API")
	}
	if o.Environment == "" {
		o.Environment = os.Getenv("CONFIG_ENV")
	}
	if o.APIKey == "" {
		o.APIKey = os.Getenv("CONFIG_API_KEY")
	}
	if o.Format == "" {
		o.Format = "env-file"
	}
	if o.Timeout == 0 {
		o.Timeout = 10 * time.Second
	}
	if o.Retries == 0 {
		o.Retries = 5
	}
	if o.RetryDelay == 0 {
		o.RetryDelay = 3 * time.Second
	}
	if o.Logger == nil {
		o.Logger = log.New(os.Stdout, "[configloader] ", log.LstdFlags)
	}
}

// Load fetches config from the service-urls API and sets env vars.
// Returns nil on success or if skipped (no API configured).
// Returns error only if API is configured but unreachable and Optional=false.
func Load(opts Options) error {
	opts.defaults()

	if opts.APIBaseURL == "" || opts.Environment == "" {
		opts.Logger.Println("SERVICE_URLS_API or CONFIG_ENV not set — skipping remote config")
		return nil
	}

	url := fmt.Sprintf("%s/api/v1/config/%s/%s", opts.APIBaseURL, opts.Environment, opts.Format)
	opts.Logger.Printf("Fetching config from: %s", url)

	body, err := fetchWithRetry(url, opts)
	if err != nil {
		if opts.Optional {
			opts.Logger.Printf("WARNING: Could not fetch config (optional): %v", err)
			return nil
		}
		return fmt.Errorf("configloader: failed to fetch config: %w", err)
	}

	// Parse and set env vars
	var count int
	switch opts.Format {
	case "json":
		count, err = loadJSON(body, opts)
	default:
		count, err = loadEnvFile(body, opts)
	}
	if err != nil {
		return fmt.Errorf("configloader: failed to parse config: %w", err)
	}

	opts.Logger.Printf("Loaded %d config values from %s/%s", count, opts.Environment, opts.Format)

	// Optionally write .env file to disk
	if opts.EnvFilePath != "" && opts.Format == "env-file" {
		if err := os.WriteFile(opts.EnvFilePath, body, 0600); err != nil {
			opts.Logger.Printf("WARNING: Could not write env file to %s: %v", opts.EnvFilePath, err)
		} else {
			opts.Logger.Printf("Written env file to %s", opts.EnvFilePath)
		}
	}

	return nil
}

// LoadSingleValue fetches a single config key from the API.
// Returns the value as a string, or error if not found.
func LoadSingleValue(key string, opts Options) (string, error) {
	opts.defaults()

	if opts.APIBaseURL == "" || opts.Environment == "" {
		return "", fmt.Errorf("configloader: SERVICE_URLS_API or CONFIG_ENV not set")
	}

	url := fmt.Sprintf("%s/api/v1/config/%s/service/%s", opts.APIBaseURL, opts.Environment, key)
	body, err := fetchWithRetry(url, opts)
	if err != nil {
		return "", fmt.Errorf("configloader: failed to fetch key %s: %w", key, err)
	}
	return string(body), nil
}

// MustLoad calls Load and panics on error.
func MustLoad(opts Options) {
	if err := Load(opts); err != nil {
		panic(err)
	}
}

// ── Internal helpers ──────────────────────────────────────────────────────────

func fetchWithRetry(url string, opts Options) ([]byte, error) {
	client := &http.Client{Timeout: opts.Timeout}

	var lastErr error
	for attempt := 1; attempt <= opts.Retries; attempt++ {
		opts.Logger.Printf("Attempt %d/%d...", attempt, opts.Retries)

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, fmt.Errorf("configloader: invalid URL: %w", err)
		}
		// Send API key for authentication
		if opts.APIKey != "" {
			req.Header.Set("X-API-Key", opts.APIKey)
		}

		resp, err := client.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("attempt %d: %w", attempt, err)
			if attempt < opts.Retries {
				time.Sleep(opts.RetryDelay)
			}
			continue
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			lastErr = fmt.Errorf("attempt %d: read body: %w", attempt, err)
			if attempt < opts.Retries {
				time.Sleep(opts.RetryDelay)
			}
			continue
		}

		if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
			return nil, fmt.Errorf("configloader: authentication failed (HTTP %d): %s — check CONFIG_API_KEY", resp.StatusCode, string(body))
		}

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("attempt %d: HTTP %d: %s", attempt, resp.StatusCode, string(body))
			if attempt < opts.Retries {
				time.Sleep(opts.RetryDelay)
			}
			continue
		}

		return body, nil
	}
	return nil, lastErr
}

func loadEnvFile(body []byte, opts Options) (int, error) {
	count := 0
	lines := strings.Split(string(body), "\n")
	keyFilter := makeKeyFilter(opts.OnlyKeys)

	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Skip comments and empty lines
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		// Remove surrounding quotes
		if len(value) >= 2 && value[0] == '"' && value[len(value)-1] == '"' {
			value = value[1 : len(value)-1]
			// Unescape \n inside quoted values
			value = strings.ReplaceAll(value, "\\n", "\n")
		}

		if keyFilter != nil && !keyFilter[key] {
			continue
		}

		// Only set if not already set (local env takes priority)
		if os.Getenv(key) == "" {
			os.Setenv(key, value)
			count++
		}
	}
	return count, nil
}

func loadJSON(body []byte, opts Options) (int, error) {
	var config map[string]string
	if err := json.Unmarshal(body, &config); err != nil {
		return 0, err
	}

	keyFilter := makeKeyFilter(opts.OnlyKeys)
	count := 0
	for key, value := range config {
		if keyFilter != nil && !keyFilter[key] {
			continue
		}
		// Only set if not already set (local env takes priority)
		if os.Getenv(key) == "" {
			os.Setenv(key, value)
			count++
		}
	}
	return count, nil
}

func makeKeyFilter(keys []string) map[string]bool {
	if len(keys) == 0 {
		return nil
	}
	m := make(map[string]bool, len(keys))
	for _, k := range keys {
		m[k] = true
	}
	return m
}
