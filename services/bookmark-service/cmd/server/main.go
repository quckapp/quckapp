package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/quikapp/bookmark-service/internal/config"
	"github.com/quikapp/bookmark-service/internal/handler"
	"github.com/quikapp/bookmark-service/internal/repository"
	"github.com/quikapp/bookmark-service/internal/service"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := config.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize Redis
	redisClient := config.InitRedis(cfg)

	// Initialize repositories
	bookmarkRepo := repository.NewBookmarkRepository(db)
	folderRepo := repository.NewFolderRepository(db)

	// Initialize services
	bookmarkService := service.NewBookmarkService(bookmarkRepo, folderRepo, redisClient, logger)
	folderService := service.NewFolderService(folderRepo, logger)

	// Initialize handlers
	bookmarkHandler := handler.NewBookmarkHandler(bookmarkService)
	folderHandler := handler.NewFolderHandler(folderService)

	// Setup router
	router := gin.Default()

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	// API routes
	api := router.Group("/api/bookmarks")
	{
		api.POST("", bookmarkHandler.Create)
		api.GET("/:id", bookmarkHandler.GetByID)
		api.GET("/user/:userId", bookmarkHandler.GetByUser)
		api.GET("/user/:userId/workspace/:workspaceId", bookmarkHandler.GetByUserAndWorkspace)
		api.PUT("/:id", bookmarkHandler.Update)
		api.DELETE("/:id", bookmarkHandler.Delete)
		api.POST("/:id/move", bookmarkHandler.MoveToFolder)
	}

	folders := router.Group("/api/bookmark-folders")
	{
		folders.POST("", folderHandler.Create)
		folders.GET("/:id", folderHandler.GetByID)
		folders.GET("/user/:userId", folderHandler.GetByUser)
		folders.PUT("/:id", folderHandler.Update)
		folders.DELETE("/:id", folderHandler.Delete)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "5010"
	}

	logger.Info("Starting bookmark service", zap.String("port", port))
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
