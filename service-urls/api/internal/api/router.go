package api

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/quckapp/service-urls-api/internal/middleware"
	"github.com/quckapp/service-urls-api/internal/repository"
)

func SetupRouter(h *Handler, jwtSecret string, repo *repository.Repository) *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-User-Id", "X-API-Key"},
		AllowCredentials: true,
	}))

	// Health
	r.GET("/actuator/health", h.Health)
	r.GET("/health", h.Health)

	// Public auth
	v1 := r.Group("/api/v1")
	v1.POST("/auth/login", h.Login)

	// Config endpoints — protected by API key OR JWT (admin panel)
	cfg := v1.Group("/config")
	cfg.Use(middleware.APIKeyOrJWTAuth(repo, jwtSecret))
	{
		cfg.GET("/:env/env-file", h.GenerateEnvFile)
		cfg.GET("/:env/json", h.GenerateJSON)
		cfg.GET("/:env/docker-compose", h.GenerateDockerCompose)
		cfg.GET("/:env/kong", h.GenerateKongConfig)
		cfg.GET("/:env/service/:key", h.GetSingleServiceConfig)
	}

	// Protected routes (JWT auth)
	admin := v1.Group("/admin")
	admin.Use(middleware.JWTAuth(jwtSecret))
	admin.GET("/profile", h.GetProfile)

	// API key management (JWT-protected — only admins manage keys)
	ak := admin.Group("/api-keys")
	{
		ak.GET("", h.ListAPIKeys)
		ak.POST("", h.CreateAPIKey)
		ak.PUT("/:id/revoke", h.RevokeAPIKey)
		ak.DELETE("/:id", h.DeleteAPIKey)
	}

	su := admin.Group("/service-urls")
	{
		su.GET("/summary", h.GetSummary)

		su.GET("/:env/services", h.GetServices)
		su.POST("/:env/services", h.CreateService)
		su.PUT("/:env/services/:key", h.UpdateService)
		su.DELETE("/:env/services/:key", h.DeleteService)

		su.GET("/:env/infrastructure", h.GetInfrastructure)
		su.POST("/:env/infrastructure", h.CreateInfrastructure)
		su.PUT("/:env/infrastructure/:key", h.UpdateInfrastructure)
		su.DELETE("/:env/infrastructure/:key", h.DeleteInfrastructure)

		su.GET("/:env/firebase", h.GetFirebase)
		su.PUT("/:env/firebase", h.UpsertFirebase)

		su.GET("/:env/secrets", h.GetSecrets)
		su.PUT("/:env/secrets/:key", h.UpsertSecret)
		su.PUT("/:env/secrets", h.UpsertSecretsBatch)
		su.DELETE("/:env/secrets/:key", h.DeleteSecret)

		su.GET("/:env/export", h.BulkExport)
		su.POST("/:env/import", h.BulkImport)
		su.POST("/clone", h.CloneEnvironment)
	}

	return r
}
