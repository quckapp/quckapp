package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	goauth "github.com/quckapp/go-auth"
	"github.com/quckapp/service-urls-api/internal/config"
	"github.com/quckapp/service-urls-api/internal/handler"
	"github.com/quckapp/service-urls-api/internal/middleware"
	"github.com/quckapp/service-urls-api/internal/model"
	"github.com/quckapp/service-urls-api/internal/repository"
	"github.com/quckapp/service-urls-api/internal/service"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

func main() {
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetOutput(os.Stdout)
	logger.Info("Starting service-urls-api...")

	cfg := config.Load()

	db, err := config.InitDB(cfg)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	logger.Info("Connected to MySQL")

	if err := db.AutoMigrate(
		&model.ServiceUrl{},
		&model.InfrastructureConfig{},
		&model.FirebaseConfig{},
		&model.ApiKey{},
		&model.ConfigEntry{},
		&model.VersionConfig{},
		&model.GlobalVersionConfig{},
		&model.VersionProfile{},
		&model.VersionProfileEntry{},
	); err != nil {
		logger.Fatalf("Failed to migrate database: %v", err)
	}
	logger.Info("Database migrated")

	seedDefaultApiKey(db, logger)

	serviceUrlRepo := repository.NewServiceUrlRepository(db)
	infraRepo := repository.NewInfrastructureRepository(db)
	firebaseRepo := repository.NewFirebaseRepository(db)
	apiKeyRepo := repository.NewApiKeyRepository(db)
	configEntryRepo := repository.NewConfigEntryRepository(db)
	versionRepo := repository.NewVersionRepository(db)
	versionProfileRepo := repository.NewVersionProfileRepository(db)

	configSvc := service.NewConfigService(serviceUrlRepo, infraRepo, firebaseRepo, configEntryRepo)
	serviceUrlSvc := service.NewServiceUrlService(serviceUrlRepo)
	infraSvc := service.NewInfrastructureService(infraRepo)
	firebaseSvc := service.NewFirebaseService(firebaseRepo)
	configEntrySvc := service.NewConfigEntryService(configEntryRepo)
	versionSvc := service.NewVersionService(versionRepo, versionProfileRepo)
	versionProfileSvc := service.NewVersionProfileService(versionProfileRepo, versionRepo)
	authSvc := service.NewAuthService(cfg.JWTSecret)

	configHandler := handler.NewConfigHandler(configSvc)
	adminHandler := handler.NewAdminHandler(serviceUrlSvc, infraSvc, firebaseSvc, configSvc, configEntrySvc, versionSvc, versionProfileSvc)
	authHandler := handler.NewAuthHandler(authSvc)

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORS())
	router.Use(goauth.Logger(logger))
	router.Use(goauth.RequestID())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "service-urls-api"})
	})

	configGroup := router.Group("/api/v1/config")
	configGroup.Use(middleware.ApiKeyAuth(apiKeyRepo))
	{
		configGroup.GET("/:env/env-file", configHandler.GetEnvFile)
		configGroup.GET("/:env/json", configHandler.GetJSON)
		configGroup.GET("/:env/service/:key", configHandler.GetSingleValue)
		configGroup.GET("/:env/docker-compose", configHandler.GetDockerCompose)
	}

	authGroup := router.Group("/api/v1/auth")
	{
		authGroup.POST("/login", authHandler.Login)
	}

	authCfg := goauth.DefaultConfig(cfg.JWTSecret)
	adminGroup := router.Group("/api/v1/admin")
	adminGroup.Use(goauth.Auth(authCfg))
	{
		adminGroup.GET("/profile", authHandler.GetProfile)

		su := adminGroup.Group("/service-urls")
		{
			su.GET("/summary", adminHandler.GetSummaries)
			su.POST("/clone", adminHandler.Clone)

			env := su.Group("/:env")
			{
				env.GET("/services", adminHandler.ListServices)
				env.POST("/services", adminHandler.CreateService)
				env.PUT("/services/:serviceKey", adminHandler.UpdateService)
				env.DELETE("/services/:serviceKey", adminHandler.DeleteService)

				env.GET("/infrastructure", adminHandler.ListInfrastructure)
				env.POST("/infrastructure", adminHandler.CreateInfrastructure)
				env.PUT("/infrastructure/:infraKey", adminHandler.UpdateInfrastructure)
				env.DELETE("/infrastructure/:infraKey", adminHandler.DeleteInfrastructure)

				env.GET("/firebase", adminHandler.GetFirebase)
				env.PUT("/firebase", adminHandler.UpsertFirebase)

				env.GET("/config-entries", adminHandler.ListConfigEntries)
				env.POST("/config-entries", adminHandler.CreateConfigEntry)
				env.PUT("/config-entries/:configKey", adminHandler.UpdateConfigEntry)
				env.DELETE("/config-entries/:configKey", adminHandler.DeleteConfigEntry)

				env.GET("/export", adminHandler.Export)
				env.POST("/import", adminHandler.Import)

				// Version management
				env.GET("/versions", adminHandler.ListVersions)
				env.POST("/versions", adminHandler.CreateVersion)
				env.POST("/versions/bulk-plan", adminHandler.BulkPlanVersions)
				env.POST("/versions/bulk-activate", adminHandler.BulkActivateVersions)
				env.DELETE("/versions/:serviceKey/:ver", adminHandler.DeleteVersion)
				env.POST("/versions/:serviceKey/:ver/ready", adminHandler.MarkVersionReady)
				env.POST("/versions/:serviceKey/:ver/activate", adminHandler.ActivateVersion)
				env.POST("/versions/:serviceKey/:ver/deprecate", adminHandler.DeprecateVersion)
				env.POST("/versions/:serviceKey/:ver/disable", adminHandler.DisableVersion)

				// Global config
				env.GET("/global-config", adminHandler.GetGlobalConfig)
				env.PUT("/global-config", adminHandler.UpdateGlobalConfig)

				// Export env file
				env.GET("/export/env-file", adminHandler.ExportEnvFile)
			}

			// Version profiles (not env-scoped)
			su.GET("/profiles", adminHandler.ListProfiles)
			su.POST("/profiles", adminHandler.CreateProfile)
			su.POST("/profiles/:profileId/apply/:env", adminHandler.ApplyProfile)
		}
	}

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Infof("Listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatalf("Forced shutdown: %v", err)
	}
	logger.Info("Server stopped")
}

func seedDefaultApiKey(db *gorm.DB, logger *logrus.Logger) {
	var count int64
	db.Model(&model.ApiKey{}).Count(&count)
	if count == 0 {
		key := model.ApiKey{
			KeyHash: model.HashKey("qk_dev_masterkey_2024"),
			Name:    "default-dev-key",
		}
		if err := db.Create(&key).Error; err != nil {
			logger.Warnf("Failed to seed default API key: %v", err)
		} else {
			logger.Info("Seeded default API key: qk_dev_masterkey_2024")
		}
	}
}
