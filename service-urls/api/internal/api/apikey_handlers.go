package api

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/quckapp/service-urls-api/internal/models"
)

// ListAPIKeys returns all API keys (without the actual key value).
// JWT-protected — only admins can see keys.
func (h *Handler) ListAPIKeys(c *gin.Context) {
	keys, err := h.repo.GetAllAPIKeys()
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to list API keys")
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: keys})
}

// CreateAPIKey generates a new API key and returns it (only shown once).
// JWT-protected — only admins can create keys.
func (h *Handler) CreateAPIKey(c *gin.Context) {
	var req models.CreateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errResp(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// Generate a random API key: qk_{service}_{random}
	randomBytes := make([]byte, 24)
	if _, err := rand.Read(randomBytes); err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to generate key")
		return
	}
	randomPart := hex.EncodeToString(randomBytes)

	prefix := "qk"
	if req.ServiceName != "" {
		// Use first 8 chars of service name
		sn := req.ServiceName
		if len(sn) > 8 {
			sn = sn[:8]
		}
		prefix = "qk_" + sn
	}
	rawKey := fmt.Sprintf("%s_%s", prefix, randomPart)

	// Hash the key for storage
	hash := sha256.Sum256([]byte(rawKey))
	keyHash := fmt.Sprintf("%x", hash)

	// Key prefix (first 12 chars for identification)
	keyPrefix := rawKey
	if len(keyPrefix) > 12 {
		keyPrefix = keyPrefix[:12]
	}

	// Default environments
	envs := req.Environments
	if len(envs) == 0 {
		envs = []string{"*"}
	}

	userID, _ := c.Get("user_id")
	uid, _ := userID.(string)

	apiKey, err := h.repo.CreateAPIKey(keyHash, keyPrefix, req.Name, req.Description, req.ServiceName, envs, uid)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to create API key: "+err.Error())
		return
	}

	// Return the full key ONCE — it won't be retrievable again
	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Data: models.CreateAPIKeyResponse{
			Key:    rawKey,
			APIKey: *apiKey,
		},
	})
}

// RevokeAPIKey deactivates an API key without deleting it.
func (h *Handler) RevokeAPIKey(c *gin.Context) {
	id := c.Param("id")
	if err := h.repo.RevokeAPIKey(id); err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to revoke key: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "API key revoked"})
}

// DeleteAPIKey permanently removes an API key.
func (h *Handler) DeleteAPIKey(c *gin.Context) {
	id := c.Param("id")
	if err := h.repo.DeleteAPIKey(id); err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to delete key: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "API key deleted"})
}
