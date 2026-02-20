package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/quckapp/service-urls-api/internal/models"
	"github.com/quckapp/service-urls-api/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var validEnvironments = []string{"local", "development", "qa", "uat1", "uat2", "uat3", "staging", "production", "live"}

type Handler struct {
	repo      *repository.Repository
	jwtSecret string
}

func NewHandler(repo *repository.Repository, jwtSecret string) *Handler {
	return &Handler{repo: repo, jwtSecret: jwtSecret}
}

func ok(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: data})
}

func okMsg(c *gin.Context, msg string, data interface{}) {
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: msg, Data: data})
}

func created(c *gin.Context, msg string, data interface{}) {
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Message: msg, Data: data})
}

func errResp(c *gin.Context, status int, msg string) {
	c.JSON(status, models.APIResponse{Success: false, Message: msg})
}

func isValidEnv(env string) bool {
	for _, e := range validEnvironments {
		if e == env {
			return true
		}
	}
	return false
}

// ── Auth ──

func (h *Handler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errResp(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	user, err := h.repo.GetUserByPhone(req.PhoneNumber)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Database error")
		return
	}
	if user == nil {
		errResp(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		errResp(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}
	if !user.IsActive {
		errResp(c, http.StatusForbidden, "Account disabled")
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.ID,
		"role": user.Role,
	})
	tokenStr, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	c.JSON(http.StatusOK, models.LoginResponse{
		AccessToken: tokenStr,
		User:        *user,
	})
}

func (h *Handler) GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	user, err := h.repo.GetUserByID(userID.(string))
	if err != nil || user == nil {
		errResp(c, http.StatusNotFound, "User not found")
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

// ── Environment Summary ──

func (h *Handler) GetSummary(c *gin.Context) {
	summaries, err := h.repo.GetEnvironmentSummaries(validEnvironments)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to get summaries")
		return
	}
	ok(c, summaries)
}

// ── Service URLs ──

func (h *Handler) GetServices(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment: "+env)
		return
	}
	category := c.Query("category")
	var (
		svcs []models.ServiceUrlConfig
		err  error
	)
	if category != "" {
		svcs, err = h.repo.GetServicesByEnvAndCategory(env, category)
	} else {
		svcs, err = h.repo.GetServicesByEnv(env)
	}
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to get services")
		return
	}
	ok(c, svcs)
}

func (h *Handler) CreateService(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	var req models.CreateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errResp(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	svc, err := h.repo.UpsertService(env, req)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to save service")
		return
	}
	created(c, "Service URL saved", svc)
}

func (h *Handler) UpdateService(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("key")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	var req models.UpdateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errResp(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	svc, err := h.repo.UpdateService(env, key, req)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to update service")
		return
	}
	if svc == nil {
		errResp(c, http.StatusNotFound, "Service not found: "+key)
		return
	}
	okMsg(c, "Service URL updated", svc)
}

func (h *Handler) DeleteService(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("key")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	if err := h.repo.DeleteService(env, key); err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to delete service")
		return
	}
	okMsg(c, "Service URL deleted", nil)
}

// ── Infrastructure ──

func (h *Handler) GetInfrastructure(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	infra, err := h.repo.GetInfraByEnv(env)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to get infrastructure")
		return
	}
	ok(c, infra)
}

func (h *Handler) CreateInfrastructure(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	var req models.CreateInfraRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errResp(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	infra, err := h.repo.UpsertInfra(env, req)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to save infrastructure")
		return
	}
	created(c, "Infrastructure saved", infra)
}

func (h *Handler) UpdateInfrastructure(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("key")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	var req models.UpdateInfraRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errResp(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	infra, err := h.repo.UpdateInfra(env, key, req)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to update infrastructure")
		return
	}
	if infra == nil {
		errResp(c, http.StatusNotFound, "Infrastructure not found: "+key)
		return
	}
	okMsg(c, "Infrastructure updated", infra)
}

func (h *Handler) DeleteInfrastructure(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("key")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	if err := h.repo.DeleteInfra(env, key); err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to delete infrastructure")
		return
	}
	okMsg(c, "Infrastructure deleted", nil)
}

// ── Firebase ──

func (h *Handler) GetFirebase(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	fb, err := h.repo.GetFirebase(env)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to get Firebase config")
		return
	}
	ok(c, fb)
}

func (h *Handler) UpsertFirebase(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	var req models.UpsertFirebaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errResp(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	fb, err := h.repo.UpsertFirebase(env, req)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to save Firebase config")
		return
	}
	okMsg(c, "Firebase config saved", fb)
}

// ── Secrets ──

func (h *Handler) GetSecrets(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	category := c.Query("category")
	var (
		secrets []models.SecretConfig
		err     error
	)
	if category != "" {
		secrets, err = h.repo.GetSecretsByEnvAndCategory(env, category)
	} else {
		secrets, err = h.repo.GetSecretsByEnv(env)
	}
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to get secrets")
		return
	}
	ok(c, secrets)
}

func (h *Handler) UpsertSecret(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("key")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	var req models.UpsertSecretRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errResp(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	req.SecretKey = key
	secret, err := h.repo.UpsertSecret(env, req)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to save secret")
		return
	}
	okMsg(c, "Secret saved", secret)
}

func (h *Handler) UpsertSecretsBatch(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	var req models.UpsertSecretsBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errResp(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	for _, s := range req.Secrets {
		if _, err := h.repo.UpsertSecret(env, s); err != nil {
			errResp(c, http.StatusInternalServerError, "Failed to save secret: "+s.SecretKey)
			return
		}
	}
	secrets, err := h.repo.GetSecretsByEnv(env)
	if err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to reload secrets")
		return
	}
	okMsg(c, "Secrets saved", secrets)
}

func (h *Handler) DeleteSecret(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("key")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	if err := h.repo.DeleteSecret(env, key); err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to delete secret")
		return
	}
	okMsg(c, "Secret deleted", nil)
}

// ── Bulk Operations ──

func (h *Handler) BulkExport(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	svcs, _ := h.repo.GetServicesByEnv(env)
	infra, _ := h.repo.GetInfraByEnv(env)
	secrets, _ := h.repo.GetSecretsByEnv(env)
	fb, _ := h.repo.GetFirebase(env)

	ok(c, models.BulkExportResponse{
		Environment:    env,
		Services:       svcs,
		Infrastructure: infra,
		Secrets:        secrets,
		Firebase:       fb,
	})
}

func (h *Handler) BulkImport(c *gin.Context) {
	env := c.Param("env")
	if !isValidEnv(env) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	var req models.BulkImportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errResp(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	for _, s := range req.Services {
		if _, err := h.repo.UpsertService(env, s); err != nil {
			errResp(c, http.StatusInternalServerError, "Failed to import service: "+s.ServiceKey)
			return
		}
	}
	for _, i := range req.Infrastructure {
		if _, err := h.repo.UpsertInfra(env, i); err != nil {
			errResp(c, http.StatusInternalServerError, "Failed to import infra: "+i.InfraKey)
			return
		}
	}
	svcs, _ := h.repo.GetServicesByEnv(env)
	infra, _ := h.repo.GetInfraByEnv(env)
	secrets, _ := h.repo.GetSecretsByEnv(env)
	fb, _ := h.repo.GetFirebase(env)
	okMsg(c, "Bulk import completed", models.BulkExportResponse{
		Environment:    env,
		Services:       svcs,
		Infrastructure: infra,
		Secrets:        secrets,
		Firebase:       fb,
	})
}

func (h *Handler) CloneEnvironment(c *gin.Context) {
	var req models.CloneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errResp(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	if !isValidEnv(req.SourceEnvironment) || !isValidEnv(req.TargetEnvironment) {
		errResp(c, http.StatusBadRequest, "Invalid environment")
		return
	}
	if err := h.repo.CloneEnvironment(req.SourceEnvironment, req.TargetEnvironment); err != nil {
		errResp(c, http.StatusInternalServerError, "Failed to clone: "+err.Error())
		return
	}
	svcs, _ := h.repo.GetServicesByEnv(req.TargetEnvironment)
	infra, _ := h.repo.GetInfraByEnv(req.TargetEnvironment)
	secrets, _ := h.repo.GetSecretsByEnv(req.TargetEnvironment)
	fb, _ := h.repo.GetFirebase(req.TargetEnvironment)
	okMsg(c, "Environment cloned", models.BulkExportResponse{
		Environment:    req.TargetEnvironment,
		Services:       svcs,
		Infrastructure: infra,
		Secrets:        secrets,
		Firebase:       fb,
	})
}

// ── Health ──

func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "UP"})
}
