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
	serviceUrlSvc     *service.ServiceUrlService
	infraSvc          *service.InfrastructureService
	firebaseSvc       *service.FirebaseService
	configSvc         *service.ConfigService
	configEntrySvc    *service.ConfigEntryService
	versionSvc        *service.VersionService
	versionProfileSvc *service.VersionProfileService
}

func NewAdminHandler(
	serviceUrlSvc *service.ServiceUrlService,
	infraSvc *service.InfrastructureService,
	firebaseSvc *service.FirebaseService,
	configSvc *service.ConfigService,
	configEntrySvc *service.ConfigEntryService,
	versionSvc *service.VersionService,
	versionProfileSvc *service.VersionProfileService,
) *AdminHandler {
	return &AdminHandler{
		serviceUrlSvc:     serviceUrlSvc,
		infraSvc:          infraSvc,
		firebaseSvc:       firebaseSvc,
		configSvc:         configSvc,
		configEntrySvc:    configEntrySvc,
		versionSvc:        versionSvc,
		versionProfileSvc: versionProfileSvc,
	}
}

type EnvironmentSummary struct {
	Environment      string  `json:"environment"`
	ServiceCount     int64   `json:"serviceCount"`
	InfraCount       int64   `json:"infraCount"`
	ConfigEntryCount int64   `json:"configEntryCount"`
	HasFirebase      bool    `json:"hasFirebase"`
	LastUpdated      *string `json:"lastUpdated"`
}

func (h *AdminHandler) GetSummaries(c *gin.Context) {
	envs := []string{"local", "development", "qa", "uat1", "uat2", "uat3", "staging", "production", "live"}
	summaries := make([]EnvironmentSummary, 0, len(envs))

	for _, env := range envs {
		svcCount, _ := h.serviceUrlSvc.CountByEnv(env)
		infraCount, _ := h.infraSvc.CountByEnv(env)
		configEntryCount, _ := h.configEntrySvc.CountByEnv(env)
		hasFB, _ := h.firebaseSvc.Exists(env)
		summaries = append(summaries, EnvironmentSummary{
			Environment:      env,
			ServiceCount:     svcCount,
			InfraCount:       infraCount,
			ConfigEntryCount: configEntryCount,
			HasFirebase:      hasFB,
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

func (h *AdminHandler) ListConfigEntries(c *gin.Context) {
	env := c.Param("env")
	category := c.Query("category")
	entries, err := h.configEntrySvc.List(env, category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": entries})
}

func (h *AdminHandler) CreateConfigEntry(c *gin.Context) {
	env := c.Param("env")
	var entry model.ConfigEntry
	if err := c.ShouldBindJSON(&entry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	entry.Environment = env
	if err := h.configEntrySvc.Create(&entry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": entry})
}

func (h *AdminHandler) UpdateConfigEntry(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("configKey")
	var entry model.ConfigEntry
	if err := c.ShouldBindJSON(&entry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updated, err := h.configEntrySvc.Update(env, key, &entry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	updated.MaskValue()
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (h *AdminHandler) DeleteConfigEntry(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("configKey")
	if err := h.configEntrySvc.Delete(env, key); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

type BulkExportResponse struct {
	Environment    string                      `json:"environment"`
	Services       []model.ServiceUrl          `json:"services"`
	Infrastructure []model.InfrastructureConfig `json:"infrastructure"`
	Firebase       *model.FirebaseConfig       `json:"firebase"`
	ConfigEntries  []model.ConfigEntry         `json:"configEntries"`
}

func (h *AdminHandler) Export(c *gin.Context) {
	env := c.Param("env")
	services, _ := h.serviceUrlSvc.List(env, "")
	infra, _ := h.infraSvc.List(env)
	fb, _ := h.firebaseSvc.Get(env)
	configEntries, _ := h.configEntrySvc.List(env, "")

	c.JSON(http.StatusOK, gin.H{"data": BulkExportResponse{
		Environment:    env,
		Services:       services,
		Infrastructure: infra,
		Firebase:       fb,
		ConfigEntries:  configEntries,
	}})
}

type BulkImportRequest struct {
	Services       []model.ServiceUrl          `json:"services"`
	Infrastructure []model.InfrastructureConfig `json:"infrastructure"`
	ConfigEntries  []model.ConfigEntry         `json:"configEntries"`
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
	for i := range req.ConfigEntries {
		req.ConfigEntries[i].Environment = env
		if err := h.configEntrySvc.Create(&req.ConfigEntries[i]); err == nil {
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
	configEntries, _ := h.configEntrySvc.ListUnmasked(req.SourceEnv, "")

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
	for _, entry := range configEntries {
		clone := entry
		clone.ID = uuid.Nil
		clone.Environment = req.TargetEnv
		if req.Overwrite {
			_ = h.configEntrySvc.Delete(req.TargetEnv, entry.ConfigKey)
		}
		if err := h.configEntrySvc.Create(&clone); err == nil {
			cloned++
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"cloned": cloned}})
}

// ── Version Management ──

func (h *AdminHandler) ListVersions(c *gin.Context) {
	env := c.Param("env")
	versions, err := h.versionSvc.List(env)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": versions})
}

func (h *AdminHandler) CreateVersion(c *gin.Context) {
	env := c.Param("env")
	var vc model.VersionConfig
	if err := c.ShouldBindJSON(&vc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.versionSvc.Create(env, &vc); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": vc})
}

func (h *AdminHandler) DeleteVersion(c *gin.Context) {
	env := c.Param("env")
	serviceKey := c.Param("serviceKey")
	ver := c.Param("ver")
	if err := h.versionSvc.Delete(env, serviceKey, ver); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *AdminHandler) MarkVersionReady(c *gin.Context) {
	env := c.Param("env")
	serviceKey := c.Param("serviceKey")
	ver := c.Param("ver")
	vc, err := h.versionSvc.MarkReady(env, serviceKey, ver)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": vc})
}

func (h *AdminHandler) ActivateVersion(c *gin.Context) {
	env := c.Param("env")
	serviceKey := c.Param("serviceKey")
	ver := c.Param("ver")
	vc, err := h.versionSvc.Activate(env, serviceKey, ver)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": vc})
}

func (h *AdminHandler) DeprecateVersion(c *gin.Context) {
	env := c.Param("env")
	serviceKey := c.Param("serviceKey")
	ver := c.Param("ver")
	vc, err := h.versionSvc.Deprecate(env, serviceKey, ver)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": vc})
}

func (h *AdminHandler) DisableVersion(c *gin.Context) {
	env := c.Param("env")
	serviceKey := c.Param("serviceKey")
	ver := c.Param("ver")
	vc, err := h.versionSvc.Disable(env, serviceKey, ver)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": vc})
}

type BulkPlanRequest struct {
	ApiVersion  string   `json:"apiVersion" binding:"required"`
	ServiceKeys []string `json:"serviceKeys" binding:"required"`
	Changelog   string   `json:"changelog"`
}

func (h *AdminHandler) BulkPlanVersions(c *gin.Context) {
	env := c.Param("env")
	var req BulkPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.versionSvc.BulkPlan(env, req.ApiVersion, req.ServiceKeys, req.Changelog); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"planned": len(req.ServiceKeys)}})
}

type BulkActivateRequest struct {
	ApiVersion string `json:"apiVersion" binding:"required"`
}

func (h *AdminHandler) BulkActivateVersions(c *gin.Context) {
	env := c.Param("env")
	var req BulkActivateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.versionSvc.BulkActivate(env, req.ApiVersion); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"activated": true}})
}

func (h *AdminHandler) GetGlobalConfig(c *gin.Context) {
	env := c.Param("env")
	gc, err := h.versionSvc.GetGlobalConfig(env)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"data": nil})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gc})
}

func (h *AdminHandler) UpdateGlobalConfig(c *gin.Context) {
	env := c.Param("env")
	var gc model.GlobalVersionConfig
	if err := c.ShouldBindJSON(&gc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.versionSvc.UpdateGlobalConfig(env, &gc); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gc})
}

func (h *AdminHandler) ExportEnvFile(c *gin.Context) {
	env := c.Param("env")
	content, err := h.versionSvc.ExportEnvFile(env)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": content})
}

// ── Version Profiles ──

func (h *AdminHandler) ListProfiles(c *gin.Context) {
	profiles, err := h.versionProfileSvc.ListProfiles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": profiles})
}

type CreateProfileRequest struct {
	Name        string                  `json:"name" binding:"required"`
	Description string                  `json:"description"`
	Entries     []ProfileEntryRequest   `json:"entries" binding:"required"`
}

type ProfileEntryRequest struct {
	ServiceKey     string `json:"serviceKey" binding:"required"`
	ApiVersion     string `json:"apiVersion" binding:"required"`
	ReleaseVersion string `json:"releaseVersion" binding:"required"`
}

func (h *AdminHandler) CreateProfile(c *gin.Context) {
	var req CreateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	entries := make([]model.VersionProfileEntry, 0, len(req.Entries))
	for _, e := range req.Entries {
		entries = append(entries, model.VersionProfileEntry{
			ServiceKey:     e.ServiceKey,
			ApiVersion:     e.ApiVersion,
			ReleaseVersion: e.ReleaseVersion,
		})
	}

	profile := model.VersionProfile{
		Name:        req.Name,
		Description: req.Description,
		Entries:     entries,
	}

	if err := h.versionProfileSvc.CreateProfile(&profile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": profile})
}

func (h *AdminHandler) ApplyProfile(c *gin.Context) {
	profileID := c.Param("profileId")
	env := c.Param("env")
	count, err := h.versionProfileSvc.ApplyProfile(profileID, env)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"applied": count}})
}
