package api

import (
	"net/http"
	"strconv"

	"attachment-service/internal/config"
	"attachment-service/internal/models"
	"attachment-service/internal/service"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *service.AttachmentService
	cfg     *config.Config
}

func RegisterRoutes(router *gin.Engine, svc *service.AttachmentService, cfg *config.Config) {
	h := &Handler{service: svc, cfg: cfg}

	// Health endpoints
	router.GET("/health", h.Health)
	router.GET("/health/ready", h.HealthReady)
	router.GET("/health/live", h.HealthLive)

	// API routes
	api := router.Group("/api/v1")
	{
		// Direct upload
		api.POST("/attachments/upload", h.Upload)

		// Presigned URL upload flow
		api.POST("/attachments/initiate", h.InitiateUpload)
		api.POST("/attachments/complete", h.CompleteUpload)

		// CRUD
		api.GET("/attachments/:id", h.GetAttachment)
		api.DELETE("/attachments/:id", h.DeleteAttachment)
		api.GET("/attachments/:id/download", h.GetDownloadURL)

		// List endpoints
		api.GET("/messages/:message_id/attachments", h.GetByMessageID)
		api.GET("/channels/:channel_id/attachments", h.GetByChannelID)
		api.GET("/users/:user_id/attachments", h.GetByUserID)
	}
}

func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "attachment-service",
	})
}

func (h *Handler) HealthReady(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"ready": true})
}

func (h *Handler) HealthLive(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"live": true})
}

func (h *Handler) Upload(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	var req models.UploadRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	attachment, err := h.service.Upload(
		c.Request.Context(),
		&req,
		file,
		header.Filename,
		mimeType,
		header.Size,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": attachment})
}

func (h *Handler) InitiateUpload(c *gin.Context) {
	var req models.InitiateUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := h.service.InitiateUpload(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": response})
}

func (h *Handler) CompleteUpload(c *gin.Context) {
	var req models.CompleteUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	attachment, err := h.service.CompleteUpload(c.Request.Context(), req.AttachmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": attachment})
}

func (h *Handler) GetAttachment(c *gin.Context) {
	id := c.Param("id")

	attachment, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attachment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": attachment})
}

func (h *Handler) DeleteAttachment(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetHeader("X-User-ID")

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID required"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) GetDownloadURL(c *gin.Context) {
	id := c.Param("id")

	url, err := h.service.GetDownloadURL(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attachment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "url": url})
}

func (h *Handler) GetByMessageID(c *gin.Context) {
	messageID := c.Param("message_id")

	attachments, err := h.service.GetByMessageID(c.Request.Context(), messageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": attachments})
}

func (h *Handler) GetByChannelID(c *gin.Context) {
	channelID := c.Param("channel_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	attachments, err := h.service.GetByChannelID(c.Request.Context(), channelID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": attachments})
}

func (h *Handler) GetByUserID(c *gin.Context) {
	userID := c.Param("user_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	attachments, err := h.service.GetByUserID(c.Request.Context(), userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": attachments})
}
