package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quckapp/service-urls-api/internal/model"
	"github.com/quckapp/service-urls-api/internal/service"
)

var validEnvironments = map[string]bool{
	"local": true, "development": true, "qa": true,
	"uat1": true, "uat2": true, "uat3": true,
	"staging": true, "production": true, "live": true,
}

type AdminHandler struct {
	serviceUrlSvc *service.ServiceUrlService
	infraSvc      *service.InfrastructureService
	firebaseSvc   *service.FirebaseService
	configSvc     *service.ConfigService
}

func NewAdminHandler(
	serviceUrlSvc *service.ServiceUrlService,
	infraSvc *service.InfrastructureService,
	firebaseSvc *service.FirebaseService,
	configSvc *service.ConfigService,
) *AdminHandler {
	return &AdminHandler{
		serviceUrlSvc: serviceUrlSvc,
		infraSvc:      infraSvc,
		firebaseSvc:   firebaseSvc,
		configSvc:     configSvc,
	}
}

type EnvironmentSummary struct {
	Environment  string  `json:"environment"`
	ServiceCount int64   `json:"serviceCount"`
	InfraCount   int64   `json:"infraCount"`
	HasFirebase  bool    `json:"hasFirebase"`
	LastUpdated  *string `json:"lastUpdated"`
}

func (h *AdminHandler) GetSummaries(c *gin.Context) {
	envs := []string{"local", "development", "qa", "uat1", "uat2", "uat3", "staging", "production", "live"}
	summaries := make([]EnvironmentSummary, 0, len(envs))

	for _, env := range envs {
		svcCount, _ := h.serviceUrlSvc.CountByEnv(env)
		infraCount, _ := h.infraSvc.CountByEnv(env)
		hasFB, _ := h.firebaseSvc.Exists(env)
		summaries = append(summaries, EnvironmentSummary{
			Environment:  env,
			ServiceCount: svcCount,
			InfraCount:   infraCount,
			HasFirebase:  hasFB,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": summaries})
}

func (h *AdminHandler) ListServices(c *gin.Context) {
	env := c.Param("env")
	category := c.Query("category")
	services, err := h.serviceUrlSvc.List(env, category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": services})
}

func (h *AdminHandler) CreateService(c *gin.Context) {
	env := c.Param("env")
	var svc model.ServiceUrl
	if err := c.ShouldBindJSON(&svc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	svc.Environment = env
	if err := h.serviceUrlSvc.Create(&svc); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": svc})
}

func (h *AdminHandler) UpdateService(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("serviceKey")
	var svc model.ServiceUrl
	if err := c.ShouldBindJSON(&svc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.serviceUrlSvc.Update(env, key, &svc); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": svc})
}

func (h *AdminHandler) DeleteService(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("serviceKey")
	if err := h.serviceUrlSvc.Delete(env, key); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *AdminHandler) ListInfrastructure(c *gin.Context) {
	env := c.Param("env")
	infra, err := h.infraSvc.List(env)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": infra})
}

func (h *AdminHandler) CreateInfrastructure(c *gin.Context) {
	env := c.Param("env")
	var infra model.InfrastructureConfig
	if err := c.ShouldBindJSON(&infra); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	infra.Environment = env
	if err := h.infraSvc.Create(&infra); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": infra})
}

func (h *AdminHandler) UpdateInfrastructure(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("infraKey")
	var infra model.InfrastructureConfig
	if err := c.ShouldBindJSON(&infra); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.infraSvc.Update(env, key, &infra); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": infra})
}

func (h *AdminHandler) DeleteInfrastructure(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("infraKey")
	if err := h.infraSvc.Delete(env, key); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *AdminHandler) GetFirebase(c *gin.Context) {
	env := c.Param("env")
	fb, err := h.firebaseSvc.Get(env)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"data": nil})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": fb})
}

func (h *AdminHandler) UpsertFirebase(c *gin.Context) {
	env := c.Param("env")
	var fb model.FirebaseConfig
	if err := c.ShouldBindJSON(&fb); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fb.Environment = env
	if err := h.firebaseSvc.Upsert(&fb); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": fb})
}

type BulkExportResponse struct {
	Environment    string                      `json:"environment"`
	Services       []model.ServiceUrl          `json:"services"`
	Infrastructure []model.InfrastructureConfig `json:"infrastructure"`
	Firebase       *model.FirebaseConfig       `json:"firebase"`
}

func (h *AdminHandler) Export(c *gin.Context) {
	env := c.Param("env")
	services, _ := h.serviceUrlSvc.List(env, "")
	infra, _ := h.infraSvc.List(env)
	fb, _ := h.firebaseSvc.Get(env)

	c.JSON(http.StatusOK, gin.H{"data": BulkExportResponse{
		Environment:    env,
		Services:       services,
		Infrastructure: infra,
		Firebase:       fb,
	}})
}

type BulkImportRequest struct {
	Services       []model.ServiceUrl          `json:"services"`
	Infrastructure []model.InfrastructureConfig `json:"infrastructure"`
}

func (h *AdminHandler) Import(c *gin.Context) {
	env := c.Param("env")
	var req BulkImportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created := 0
	for i := range req.Services {
		req.Services[i].Environment = env
		if err := h.serviceUrlSvc.Create(&req.Services[i]); err == nil {
			created++
		}
	}
	for i := range req.Infrastructure {
		req.Infrastructure[i].Environment = env
		if err := h.infraSvc.Create(&req.Infrastructure[i]); err == nil {
			created++
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"imported": created}})
}

type CloneRequest struct {
	SourceEnv string `json:"sourceEnv" binding:"required"`
	TargetEnv string `json:"targetEnv" binding:"required"`
	Overwrite bool   `json:"overwrite"`
}

func (h *AdminHandler) Clone(c *gin.Context) {
	var req CloneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !validEnvironments[req.SourceEnv] || !validEnvironments[req.TargetEnv] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid environment"})
		return
	}

	services, _ := h.serviceUrlSvc.List(req.SourceEnv, "")
	infra, _ := h.infraSvc.List(req.SourceEnv)

	cloned := 0
	for _, svc := range services {
		clone := svc
		clone.ID = uuid.Nil
		clone.Environment = req.TargetEnv
		if req.Overwrite {
			_ = h.serviceUrlSvc.Delete(req.TargetEnv, svc.ServiceKey)
		}
		if err := h.serviceUrlSvc.Create(&clone); err == nil {
			cloned++
		}
	}
	for _, inf := range infra {
		clone := inf
		clone.ID = uuid.Nil
		clone.Environment = req.TargetEnv
		if req.Overwrite {
			_ = h.infraSvc.Delete(req.TargetEnv, inf.InfraKey)
		}
		if err := h.infraSvc.Create(&clone); err == nil {
			cloned++
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"cloned": cloned}})
}
