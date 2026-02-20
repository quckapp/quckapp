package api

import (
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
)

// ── .env file format ──

func (h *Handler) GenerateEnvFile(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		c.String(http.StatusBadRequest, "# ERROR: Invalid environment: %s\n", env)
		return
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# ============================================\n"))
	sb.WriteString(fmt.Sprintf("# Environment: %s\n", env))
	sb.WriteString(fmt.Sprintf("# Generated from service-urls-api\n"))
	sb.WriteString(fmt.Sprintf("# ============================================\n\n"))

	// Service URLs
	svcs, _ := h.repo.GetServicesByEnv(env)
	if len(svcs) > 0 {
		sb.WriteString("# ── Service URLs ──\n")
		sort.Slice(svcs, func(i, j int) bool { return svcs[i].ServiceKey < svcs[j].ServiceKey })
		for _, s := range svcs {
			if !s.IsActive {
				continue
			}
			sb.WriteString(fmt.Sprintf("%s_URL=%s\n", s.ServiceKey, s.URL))
		}
		sb.WriteString("\n")
	}

	// Infrastructure
	infra, _ := h.repo.GetInfraByEnv(env)
	if len(infra) > 0 {
		sb.WriteString("# ── Infrastructure ──\n")
		sort.Slice(infra, func(i, j int) bool { return infra[i].InfraKey < infra[j].InfraKey })
		for _, i := range infra {
			if !i.IsActive {
				continue
			}
			sb.WriteString(fmt.Sprintf("%s_HOST=%s\n", i.InfraKey, i.Host))
			sb.WriteString(fmt.Sprintf("%s_PORT=%d\n", i.InfraKey, i.Port))
			if i.Username != nil && *i.Username != "" {
				sb.WriteString(fmt.Sprintf("%s_USERNAME=%s\n", i.InfraKey, *i.Username))
			}
			if i.ConnectionString != nil && *i.ConnectionString != "" {
				sb.WriteString(fmt.Sprintf("%s_URL=%s\n", i.InfraKey, *i.ConnectionString))
			}
		}
		sb.WriteString("\n")
	}

	// Secrets
	secrets, _ := h.repo.GetSecretsByEnv(env)
	if len(secrets) > 0 {
		sb.WriteString("# ── Secrets ──\n")
		sort.Slice(secrets, func(i, j int) bool { return secrets[i].SecretKey < secrets[j].SecretKey })
		for _, s := range secrets {
			if !s.IsActive {
				continue
			}
			sb.WriteString(fmt.Sprintf("%s=%s\n", s.SecretKey, s.Value))
		}
		sb.WriteString("\n")
	}

	// Firebase
	fb, _ := h.repo.GetFirebase(env)
	if fb != nil {
		sb.WriteString("# ── Firebase ──\n")
		if fb.ProjectID != nil {
			sb.WriteString(fmt.Sprintf("FIREBASE_PROJECT_ID=%s\n", *fb.ProjectID))
		}
		if fb.ClientEmail != nil {
			sb.WriteString(fmt.Sprintf("FIREBASE_CLIENT_EMAIL=%s\n", *fb.ClientEmail))
		}
		if fb.StorageBucket != nil {
			sb.WriteString(fmt.Sprintf("FIREBASE_STORAGE_BUCKET=%s\n", *fb.StorageBucket))
		}
		if fb.PrivateKeyEnc != nil {
			// Escape newlines for .env format
			escaped := strings.ReplaceAll(*fb.PrivateKeyEnc, "\n", "\\n")
			sb.WriteString(fmt.Sprintf("FIREBASE_PRIVATE_KEY=\"%s\"\n", escaped))
		}
		sb.WriteString("\n")
	}

	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.env\"", env))
	c.String(http.StatusOK, sb.String())
}

// ── JSON flat key-value map ──

func (h *Handler) GenerateJSON(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment: "+env)
		return
	}

	config := make(map[string]string)

	// Service URLs
	svcs, _ := h.repo.GetServicesByEnv(env)
	for _, s := range svcs {
		if s.IsActive {
			config[s.ServiceKey+"_URL"] = s.URL
		}
	}

	// Infrastructure
	infra, _ := h.repo.GetInfraByEnv(env)
	for _, i := range infra {
		if !i.IsActive {
			continue
		}
		config[i.InfraKey+"_HOST"] = i.Host
		config[i.InfraKey+"_PORT"] = fmt.Sprintf("%d", i.Port)
		if i.Username != nil && *i.Username != "" {
			config[i.InfraKey+"_USERNAME"] = *i.Username
		}
		if i.ConnectionString != nil && *i.ConnectionString != "" {
			config[i.InfraKey+"_URL"] = *i.ConnectionString
		}
	}

	// Secrets
	secrets, _ := h.repo.GetSecretsByEnv(env)
	for _, s := range secrets {
		if s.IsActive && s.Value != "" {
			config[s.SecretKey] = s.Value
		}
	}

	// Firebase
	fb, _ := h.repo.GetFirebase(env)
	if fb != nil {
		if fb.ProjectID != nil {
			config["FIREBASE_PROJECT_ID"] = *fb.ProjectID
		}
		if fb.ClientEmail != nil {
			config["FIREBASE_CLIENT_EMAIL"] = *fb.ClientEmail
		}
		if fb.StorageBucket != nil {
			config["FIREBASE_STORAGE_BUCKET"] = *fb.StorageBucket
		}
	}

	c.JSON(http.StatusOK, config)
}

// ── Docker Compose environment block (YAML) ──

func (h *Handler) GenerateDockerCompose(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		c.String(http.StatusBadRequest, "# ERROR: Invalid environment: %s\n", env)
		return
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# Docker Compose environment block for: %s\n", env))
	sb.WriteString(fmt.Sprintf("# Generated from service-urls-api\n"))
	sb.WriteString("environment:\n")

	// Service URLs
	svcs, _ := h.repo.GetServicesByEnv(env)
	if len(svcs) > 0 {
		sb.WriteString("  # Service URLs\n")
		sort.Slice(svcs, func(i, j int) bool { return svcs[i].ServiceKey < svcs[j].ServiceKey })
		for _, s := range svcs {
			if s.IsActive {
				sb.WriteString(fmt.Sprintf("  %s_URL: %s\n", s.ServiceKey, s.URL))
			}
		}
	}

	// Infrastructure
	infra, _ := h.repo.GetInfraByEnv(env)
	if len(infra) > 0 {
		sb.WriteString("  # Infrastructure\n")
		sort.Slice(infra, func(i, j int) bool { return infra[i].InfraKey < infra[j].InfraKey })
		for _, i := range infra {
			if !i.IsActive {
				continue
			}
			sb.WriteString(fmt.Sprintf("  %s_HOST: %s\n", i.InfraKey, i.Host))
			sb.WriteString(fmt.Sprintf("  %s_PORT: \"%d\"\n", i.InfraKey, i.Port))
			if i.Username != nil && *i.Username != "" {
				sb.WriteString(fmt.Sprintf("  %s_USERNAME: %s\n", i.InfraKey, *i.Username))
			}
		}
	}

	// Secrets
	secrets, _ := h.repo.GetSecretsByEnv(env)
	if len(secrets) > 0 {
		sb.WriteString("  # Secrets\n")
		sort.Slice(secrets, func(i, j int) bool { return secrets[i].SecretKey < secrets[j].SecretKey })
		for _, s := range secrets {
			if s.IsActive && s.Value != "" {
				val := s.Value
				// Quote values with special chars for YAML safety
				if strings.ContainsAny(val, ":{}[]&*#?|-<>=!%@\\") {
					val = "\"" + strings.ReplaceAll(val, "\"", "\\\"") + "\""
				}
				sb.WriteString(fmt.Sprintf("  %s: %s\n", s.SecretKey, val))
			}
		}
	}

	// Firebase
	fb, _ := h.repo.GetFirebase(env)
	if fb != nil {
		sb.WriteString("  # Firebase\n")
		if fb.ProjectID != nil {
			sb.WriteString(fmt.Sprintf("  FIREBASE_PROJECT_ID: %s\n", *fb.ProjectID))
		}
		if fb.ClientEmail != nil {
			sb.WriteString(fmt.Sprintf("  FIREBASE_CLIENT_EMAIL: %s\n", *fb.ClientEmail))
		}
		if fb.StorageBucket != nil {
			sb.WriteString(fmt.Sprintf("  FIREBASE_STORAGE_BUCKET: %s\n", *fb.StorageBucket))
		}
	}

	c.Header("Content-Type", "text/yaml; charset=utf-8")
	c.String(http.StatusOK, sb.String())
}

// ── Kong declarative config (services + routes) ──

func (h *Handler) GenerateKongConfig(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		c.String(http.StatusBadRequest, "# ERROR: Invalid environment: %s\n", env)
		return
	}

	svcs, _ := h.repo.GetServicesByEnv(env)

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# Kong declarative config for: %s\n", env))
	sb.WriteString(fmt.Sprintf("# Generated from service-urls-api\n"))
	sb.WriteString("_format_version: \"3.0\"\n\n")
	sb.WriteString("services:\n")

	sort.Slice(svcs, func(i, j int) bool { return svcs[i].ServiceKey < svcs[j].ServiceKey })

	for _, s := range svcs {
		if !s.IsActive {
			continue
		}
		// Skip non-HTTP services (deep links, app store links, etc.)
		if !strings.HasPrefix(s.URL, "http://") && !strings.HasPrefix(s.URL, "https://") {
			continue
		}
		kebab := strings.ToLower(strings.ReplaceAll(s.ServiceKey, "_", "-"))
		sb.WriteString(fmt.Sprintf("  - name: %s-%s\n", env, kebab))
		sb.WriteString(fmt.Sprintf("    url: %s\n", s.URL))
		sb.WriteString(fmt.Sprintf("    routes:\n"))
		sb.WriteString(fmt.Sprintf("      - name: %s-%s-route\n", env, kebab))
		sb.WriteString(fmt.Sprintf("        paths:\n"))
		sb.WriteString(fmt.Sprintf("          - /%s\n", kebab))
		sb.WriteString(fmt.Sprintf("        strip_path: true\n"))
	}

	c.Header("Content-Type", "text/yaml; charset=utf-8")
	c.String(http.StatusOK, sb.String())
}

// ── Single service URL lookup (plain text) ──

func (h *Handler) GetSingleServiceConfig(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("key")
	if !isValidEnv(env) {
		c.String(http.StatusBadRequest, "Invalid environment: %s", env)
		return
	}

	svcs, _ := h.repo.GetServicesByEnv(env)
	for _, s := range svcs {
		if s.ServiceKey == key && s.IsActive {
			c.String(http.StatusOK, s.URL)
			return
		}
	}

	// Also check infra
	infra, _ := h.repo.GetInfraByEnv(env)
	for _, i := range infra {
		if i.InfraKey == key && i.IsActive {
			if i.ConnectionString != nil && *i.ConnectionString != "" {
				c.String(http.StatusOK, *i.ConnectionString)
			} else {
				c.String(http.StatusOK, fmt.Sprintf("%s:%d", i.Host, i.Port))
			}
			return
		}
	}

	// Check secrets
	secrets, _ := h.repo.GetSecretsByEnv(env)
	for _, s := range secrets {
		if s.SecretKey == key && s.IsActive && s.Value != "" {
			c.String(http.StatusOK, s.Value)
			return
		}
	}

	c.String(http.StatusNotFound, "Key not found: %s", key)
}
