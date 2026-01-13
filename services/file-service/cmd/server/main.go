package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/segmentio/kafka-go"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// File represents a file stored in the system
type File struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	FileID       string             `json:"file_id" bson:"file_id"`
	Name         string             `json:"name" bson:"name"`
	OriginalName string             `json:"original_name" bson:"original_name"`
	MimeType     string             `json:"mime_type" bson:"mime_type"`
	Size         int64              `json:"size" bson:"size"`
	StorageKey   string             `json:"storage_key" bson:"storage_key"`
	URL          string             `json:"url" bson:"url"`
	ThumbnailURL *string            `json:"thumbnail_url" bson:"thumbnail_url"`
	WorkspaceID  string             `json:"workspace_id" bson:"workspace_id"`
	ChannelID    *string            `json:"channel_id" bson:"channel_id"`
	MessageID    *string            `json:"message_id" bson:"message_id"`
	UploadedBy   string             `json:"uploaded_by" bson:"uploaded_by"`
	Checksum     string             `json:"checksum" bson:"checksum"`
	FileType     string             `json:"file_type" bson:"file_type"` // image, video, audio, document
	Metadata     FileMetadata       `json:"metadata" bson:"metadata"`
	IsPublic     bool               `json:"is_public" bson:"is_public"`
	SharedWith   []string           `json:"shared_with" bson:"shared_with"`
	Downloads    int64              `json:"downloads" bson:"downloads"`
	DeletedAt    *time.Time         `json:"deleted_at" bson:"deleted_at"`
	CreatedAt    time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time          `json:"updated_at" bson:"updated_at"`
}

// FileMetadata stores type-specific metadata
type FileMetadata struct {
	Width    *int     `json:"width,omitempty" bson:"width,omitempty"`
	Height   *int     `json:"height,omitempty" bson:"height,omitempty"`
	Duration *float64 `json:"duration,omitempty" bson:"duration,omitempty"`
	Pages    *int     `json:"pages,omitempty" bson:"pages,omitempty"`
}

// FileEvent for Kafka publishing
type FileEvent struct {
	Type        string      `json:"type"`
	FileID      string      `json:"file_id"`
	WorkspaceID string      `json:"workspace_id"`
	UserID      string      `json:"user_id"`
	Data        interface{} `json:"data"`
	Timestamp   time.Time   `json:"timestamp"`
}

// PresignedURLResponse for upload URL generation
type PresignedURLResponse struct {
	UploadURL string `json:"upload_url"`
	FileID    string `json:"file_id"`
	Key       string `json:"key"`
	ExpiresAt int64  `json:"expires_at"`
}

var (
	log           *logrus.Logger
	mongoClient   *mongo.Client
	mongoDB       *mongo.Database
	filesCol      *mongo.Collection
	redisClient   *redis.Client
	s3Client      *s3.Client
	s3PresignClient *s3.PresignClient
	kafkaWriter   *kafka.Writer
	s3Bucket      string
)

// Allowed MIME types
var allowedMimeTypes = map[string]string{
	// Images
	"image/jpeg":    "image",
	"image/png":     "image",
	"image/gif":     "image",
	"image/webp":    "image",
	"image/svg+xml": "image",
	// Videos
	"video/mp4":       "video",
	"video/webm":      "video",
	"video/quicktime": "video",
	// Audio
	"audio/mpeg":  "audio",
	"audio/wav":   "audio",
	"audio/ogg":   "audio",
	"audio/webm":  "audio",
	// Documents
	"application/pdf":    "document",
	"application/msword": "document",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
	"application/vnd.ms-excel": "document",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":       "document",
	"application/vnd.ms-powerpoint": "document",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": "document",
	"text/plain":      "document",
	"text/csv":        "document",
	"application/json": "document",
	"application/zip": "archive",
	"application/x-rar-compressed": "archive",
	"application/x-7z-compressed":  "archive",
}

// Max file sizes by type (in bytes)
var maxFileSizes = map[string]int64{
	"image":    10 * 1024 * 1024,  // 10 MB
	"video":    100 * 1024 * 1024, // 100 MB
	"audio":    50 * 1024 * 1024,  // 50 MB
	"document": 25 * 1024 * 1024,  // 25 MB
	"archive":  50 * 1024 * 1024,  // 50 MB
}

func main() {
	log = logrus.New()
	log.SetFormatter(&logrus.JSONFormatter{})
	_ = godotenv.Load()

	ctx := context.Background()

	// Initialize MongoDB
	mongoURI := getEnv("MONGODB_URI", "mongodb://localhost:27017")
	var err error
	mongoClient, err = mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer mongoClient.Disconnect(ctx)

	mongoDB = mongoClient.Database(getEnv("MONGODB_DATABASE", "quckchat_files"))
	filesCol = mongoDB.Collection("files")

	// Create indexes
	createIndexes(ctx)

	// Initialize Redis
	redisClient = redis.NewClient(&redis.Options{
		Addr:     getEnv("REDIS_URL", "localhost:6379"),
		Password: getEnv("REDIS_PASSWORD", ""),
		DB:       0,
	})
	defer redisClient.Close()

	// Initialize S3
	s3Bucket = getEnv("S3_BUCKET", "quckchat-files")
	awsCfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(getEnv("AWS_REGION", "us-east-1")),
	)
	if err != nil {
		log.Warnf("Failed to load AWS config: %v (S3 features disabled)", err)
	} else {
		s3Client = s3.NewFromConfig(awsCfg)
		s3PresignClient = s3.NewPresignClient(s3Client)
	}

	// Initialize Kafka
	kafkaWriter = &kafka.Writer{
		Addr:         kafka.TCP(getEnv("KAFKA_BROKERS", "localhost:9092")),
		Topic:        getEnv("KAFKA_TOPIC", "file-events"),
		Balancer:     &kafka.LeastBytes{},
		BatchTimeout: 10 * time.Millisecond,
	}
	defer kafkaWriter.Close()

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(requestLogger())
	r.Use(corsMiddleware())

	// Set max multipart memory
	r.MaxMultipartMemory = 100 << 20 // 100 MB

	// Health checks
	r.GET("/health", healthCheck)
	r.GET("/ready", readinessCheck)

	api := r.Group("/api/v1/files")
	{
		// File operations
		api.POST("/upload", uploadFile)
		api.POST("/upload/presigned", getPresignedUploadURL)
		api.POST("/upload/complete", completeUpload)
		api.GET("/:id", getFile)
		api.GET("/:id/download", downloadFile)
		api.DELETE("/:id", deleteFile)
		api.PUT("/:id", updateFile)

		// Batch operations
		api.POST("/batch", batchGetFiles)
		api.DELETE("/batch", batchDeleteFiles)

		// Sharing
		api.POST("/:id/share", shareFile)
		api.DELETE("/:id/share/:userId", unshareFile)

		// User files
		api.GET("/user/:userId", getUserFiles)

		// Workspace/Channel files
		api.GET("/workspace/:workspaceId", getWorkspaceFiles)
		api.GET("/channel/:channelId", getChannelFiles)

		// Stats
		api.GET("/stats", getStats)
		api.GET("/user/:userId/stats", getUserStats)
	}

	port := getEnv("PORT", "5002")
	srv := &http.Server{Addr: ":" + port, Handler: r}

	go func() {
		log.Infof("File service starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down file service...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Errorf("Server shutdown error: %v", err)
	}
	log.Info("File service stopped")
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func createIndexes(ctx context.Context) {
	indexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "file_id", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "uploaded_by", Value: 1}}},
		{Keys: bson.D{{Key: "workspace_id", Value: 1}}},
		{Keys: bson.D{{Key: "channel_id", Value: 1}}},
		{Keys: bson.D{{Key: "created_at", Value: -1}}},
		{Keys: bson.D{{Key: "deleted_at", Value: 1}}},
		{Keys: bson.D{{Key: "checksum", Value: 1}}},
	}
	filesCol.Indexes().CreateMany(ctx, indexes)
}

func requestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		log.WithFields(logrus.Fields{
			"method":   c.Request.Method,
			"path":     c.Request.URL.Path,
			"status":   c.Writer.Status(),
			"duration": time.Since(start).Milliseconds(),
		}).Info("request")
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

// Health checks
func healthCheck(c *gin.Context) {
	c.JSON(200, gin.H{
		"status":  "healthy",
		"service": "file-service",
		"time":    time.Now().UTC(),
	})
}

func readinessCheck(c *gin.Context) {
	ctx := c.Request.Context()

	// Check MongoDB
	if err := mongoClient.Ping(ctx, nil); err != nil {
		c.JSON(503, gin.H{"status": "not ready", "error": "mongodb unavailable"})
		return
	}

	// Check Redis
	if err := redisClient.Ping(ctx).Err(); err != nil {
		c.JSON(503, gin.H{"status": "not ready", "error": "redis unavailable"})
		return
	}

	c.JSON(200, gin.H{"status": "ready"})
}

// Upload file directly (multipart)
func uploadFile(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "no file provided"})
		return
	}
	defer file.Close()

	workspaceID := c.PostForm("workspace_id")
	uploadedBy := c.PostForm("uploaded_by")
	channelID := c.PostForm("channel_id")
	messageID := c.PostForm("message_id")

	if workspaceID == "" || uploadedBy == "" {
		c.JSON(400, gin.H{"error": "workspace_id and uploaded_by are required"})
		return
	}

	// Validate MIME type
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = detectMimeType(header.Filename)
	}

	fileType, ok := allowedMimeTypes[mimeType]
	if !ok {
		c.JSON(400, gin.H{"error": "file type not allowed", "mime_type": mimeType})
		return
	}

	// Validate size
	maxSize := maxFileSizes[fileType]
	if header.Size > maxSize {
		c.JSON(400, gin.H{"error": fmt.Sprintf("file too large, max size is %d MB", maxSize/(1024*1024))})
		return
	}

	// Read file content
	content, err := io.ReadAll(file)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to read file"})
		return
	}

	// Calculate checksum
	hash := sha256.Sum256(content)
	checksum := hex.EncodeToString(hash[:])

	// Check for duplicate
	var existingFile File
	err = filesCol.FindOne(c.Request.Context(), bson.M{
		"checksum":     checksum,
		"workspace_id": workspaceID,
		"deleted_at":   nil,
	}).Decode(&existingFile)
	if err == nil {
		// Return existing file
		c.JSON(200, gin.H{
			"file":      existingFile,
			"duplicate": true,
			"message":   "file already exists",
		})
		return
	}

	// Generate file ID and storage key
	fileID := uuid.New().String()
	ext := filepath.Ext(header.Filename)
	storageKey := fmt.Sprintf("files/%s/%s/%s%s", workspaceID, uploadedBy, fileID, ext)

	// Upload to S3
	var fileURL string
	if s3Client != nil {
		_, err = s3Client.PutObject(c.Request.Context(), &s3.PutObjectInput{
			Bucket:      aws.String(s3Bucket),
			Key:         aws.String(storageKey),
			Body:        strings.NewReader(string(content)),
			ContentType: aws.String(mimeType),
		})
		if err != nil {
			log.Errorf("Failed to upload to S3: %v", err)
			c.JSON(500, gin.H{"error": "failed to store file"})
			return
		}
		fileURL = fmt.Sprintf("https://%s.s3.amazonaws.com/%s", s3Bucket, storageKey)
	} else {
		// Fallback: store locally (for development)
		localPath := filepath.Join("uploads", storageKey)
		os.MkdirAll(filepath.Dir(localPath), 0755)
		if err := os.WriteFile(localPath, content, 0644); err != nil {
			c.JSON(500, gin.H{"error": "failed to store file locally"})
			return
		}
		fileURL = fmt.Sprintf("/uploads/%s", storageKey)
	}

	now := time.Now()
	newFile := File{
		FileID:       fileID,
		Name:         fileID + ext,
		OriginalName: header.Filename,
		MimeType:     mimeType,
		Size:         header.Size,
		StorageKey:   storageKey,
		URL:          fileURL,
		WorkspaceID:  workspaceID,
		UploadedBy:   uploadedBy,
		Checksum:     checksum,
		FileType:     fileType,
		Metadata:     FileMetadata{},
		IsPublic:     false,
		SharedWith:   []string{},
		Downloads:    0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if channelID != "" {
		newFile.ChannelID = &channelID
	}
	if messageID != "" {
		newFile.MessageID = &messageID
	}

	result, err := filesCol.InsertOne(c.Request.Context(), newFile)
	if err != nil {
		log.Errorf("Failed to save file metadata: %v", err)
		c.JSON(500, gin.H{"error": "failed to save file"})
		return
	}

	newFile.ID = result.InsertedID.(primitive.ObjectID)

	// Publish event
	publishEvent(FileEvent{
		Type:        "file.uploaded",
		FileID:      fileID,
		WorkspaceID: workspaceID,
		UserID:      uploadedBy,
		Data: map[string]interface{}{
			"filename":  header.Filename,
			"size":      header.Size,
			"mime_type": mimeType,
		},
		Timestamp: now,
	})

	// Cache file metadata
	cacheFile(c.Request.Context(), &newFile)

	log.WithFields(logrus.Fields{"file_id": fileID, "size": header.Size}).Info("File uploaded")
	c.JSON(201, newFile)
}

// Get presigned URL for direct upload to S3
func getPresignedUploadURL(c *gin.Context) {
	var req struct {
		Filename    string `json:"filename" binding:"required"`
		ContentType string `json:"content_type" binding:"required"`
		Size        int64  `json:"size" binding:"required"`
		WorkspaceID string `json:"workspace_id" binding:"required"`
		UploadedBy  string `json:"uploaded_by" binding:"required"`
		ChannelID   string `json:"channel_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Validate MIME type
	fileType, ok := allowedMimeTypes[req.ContentType]
	if !ok {
		c.JSON(400, gin.H{"error": "file type not allowed"})
		return
	}

	// Validate size
	maxSize := maxFileSizes[fileType]
	if req.Size > maxSize {
		c.JSON(400, gin.H{"error": fmt.Sprintf("file too large, max size is %d MB", maxSize/(1024*1024))})
		return
	}

	if s3PresignClient == nil {
		c.JSON(503, gin.H{"error": "S3 not configured"})
		return
	}

	fileID := uuid.New().String()
	ext := filepath.Ext(req.Filename)
	storageKey := fmt.Sprintf("files/%s/%s/%s%s", req.WorkspaceID, req.UploadedBy, fileID, ext)

	presignResult, err := s3PresignClient.PresignPutObject(c.Request.Context(), &s3.PutObjectInput{
		Bucket:      aws.String(s3Bucket),
		Key:         aws.String(storageKey),
		ContentType: aws.String(req.ContentType),
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		log.Errorf("Failed to generate presigned URL: %v", err)
		c.JSON(500, gin.H{"error": "failed to generate upload URL"})
		return
	}

	// Store pending upload info in Redis
	pendingUpload := map[string]interface{}{
		"file_id":       fileID,
		"filename":      req.Filename,
		"content_type":  req.ContentType,
		"size":          req.Size,
		"workspace_id":  req.WorkspaceID,
		"uploaded_by":   req.UploadedBy,
		"channel_id":    req.ChannelID,
		"storage_key":   storageKey,
		"file_type":     fileType,
	}
	pendingJSON, _ := json.Marshal(pendingUpload)
	redisClient.Set(c.Request.Context(), "pending_upload:"+fileID, pendingJSON, 20*time.Minute)

	c.JSON(200, PresignedURLResponse{
		UploadURL: presignResult.URL,
		FileID:    fileID,
		Key:       storageKey,
		ExpiresAt: time.Now().Add(15 * time.Minute).Unix(),
	})
}

// Complete upload after presigned URL upload
func completeUpload(c *gin.Context) {
	var req struct {
		FileID   string `json:"file_id" binding:"required"`
		Checksum string `json:"checksum"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Get pending upload info from Redis
	pendingJSON, err := redisClient.Get(c.Request.Context(), "pending_upload:"+req.FileID).Bytes()
	if err != nil {
		c.JSON(404, gin.H{"error": "upload session not found or expired"})
		return
	}

	var pending map[string]interface{}
	json.Unmarshal(pendingJSON, &pending)

	now := time.Now()
	storageKey := pending["storage_key"].(string)
	fileURL := fmt.Sprintf("https://%s.s3.amazonaws.com/%s", s3Bucket, storageKey)

	newFile := File{
		FileID:       req.FileID,
		Name:         filepath.Base(storageKey),
		OriginalName: pending["filename"].(string),
		MimeType:     pending["content_type"].(string),
		Size:         int64(pending["size"].(float64)),
		StorageKey:   storageKey,
		URL:          fileURL,
		WorkspaceID:  pending["workspace_id"].(string),
		UploadedBy:   pending["uploaded_by"].(string),
		Checksum:     req.Checksum,
		FileType:     pending["file_type"].(string),
		Metadata:     FileMetadata{},
		IsPublic:     false,
		SharedWith:   []string{},
		Downloads:    0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if channelID, ok := pending["channel_id"].(string); ok && channelID != "" {
		newFile.ChannelID = &channelID
	}

	result, err := filesCol.InsertOne(c.Request.Context(), newFile)
	if err != nil {
		log.Errorf("Failed to save file metadata: %v", err)
		c.JSON(500, gin.H{"error": "failed to complete upload"})
		return
	}

	newFile.ID = result.InsertedID.(primitive.ObjectID)

	// Clean up Redis
	redisClient.Del(c.Request.Context(), "pending_upload:"+req.FileID)

	// Publish event
	publishEvent(FileEvent{
		Type:        "file.uploaded",
		FileID:      req.FileID,
		WorkspaceID: newFile.WorkspaceID,
		UserID:      newFile.UploadedBy,
		Data: map[string]interface{}{
			"filename":  newFile.OriginalName,
			"size":      newFile.Size,
			"mime_type": newFile.MimeType,
		},
		Timestamp: now,
	})

	// Cache file metadata
	cacheFile(c.Request.Context(), &newFile)

	log.WithFields(logrus.Fields{"file_id": req.FileID}).Info("Upload completed")
	c.JSON(201, newFile)
}

// Get file metadata
func getFile(c *gin.Context) {
	fileID := c.Param("id")

	// Try cache first
	cachedFile := getCachedFile(c.Request.Context(), fileID)
	if cachedFile != nil {
		c.JSON(200, cachedFile)
		return
	}

	var file File
	err := filesCol.FindOne(c.Request.Context(), bson.M{
		"file_id":    fileID,
		"deleted_at": nil,
	}).Decode(&file)
	if err != nil {
		c.JSON(404, gin.H{"error": "file not found"})
		return
	}

	// Cache for future requests
	cacheFile(c.Request.Context(), &file)

	c.JSON(200, file)
}

// Download file (get presigned download URL)
func downloadFile(c *gin.Context) {
	fileID := c.Param("id")

	var file File
	err := filesCol.FindOne(c.Request.Context(), bson.M{
		"file_id":    fileID,
		"deleted_at": nil,
	}).Decode(&file)
	if err != nil {
		c.JSON(404, gin.H{"error": "file not found"})
		return
	}

	// Generate presigned download URL
	var downloadURL string
	if s3PresignClient != nil {
		presignResult, err := s3PresignClient.PresignGetObject(c.Request.Context(), &s3.GetObjectInput{
			Bucket:                     aws.String(s3Bucket),
			Key:                        aws.String(file.StorageKey),
			ResponseContentDisposition: aws.String(fmt.Sprintf("attachment; filename=\"%s\"", file.OriginalName)),
		}, s3.WithPresignExpires(1*time.Hour))
		if err != nil {
			log.Errorf("Failed to generate download URL: %v", err)
			c.JSON(500, gin.H{"error": "failed to generate download URL"})
			return
		}
		downloadURL = presignResult.URL
	} else {
		downloadURL = file.URL
	}

	// Increment download count
	filesCol.UpdateOne(c.Request.Context(),
		bson.M{"file_id": fileID},
		bson.M{"$inc": bson.M{"downloads": 1}})

	c.JSON(200, gin.H{
		"download_url": downloadURL,
		"filename":     file.OriginalName,
		"expires_at":   time.Now().Add(1 * time.Hour).Unix(),
	})
}

// Delete file (soft delete)
func deleteFile(c *gin.Context) {
	fileID := c.Param("id")

	var file File
	err := filesCol.FindOne(c.Request.Context(), bson.M{
		"file_id":    fileID,
		"deleted_at": nil,
	}).Decode(&file)
	if err != nil {
		c.JSON(404, gin.H{"error": "file not found"})
		return
	}

	now := time.Now()
	_, err = filesCol.UpdateOne(c.Request.Context(),
		bson.M{"file_id": fileID},
		bson.M{"$set": bson.M{"deleted_at": now, "updated_at": now}})
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to delete file"})
		return
	}

	// Remove from cache
	redisClient.Del(c.Request.Context(), "file:"+fileID)

	// Publish event
	publishEvent(FileEvent{
		Type:        "file.deleted",
		FileID:      fileID,
		WorkspaceID: file.WorkspaceID,
		UserID:      file.UploadedBy,
		Timestamp:   now,
	})

	log.WithField("file_id", fileID).Info("File deleted")
	c.JSON(200, gin.H{"message": "file deleted"})
}

// Update file metadata
func updateFile(c *gin.Context) {
	fileID := c.Param("id")

	var req struct {
		OriginalName *string `json:"original_name"`
		IsPublic     *bool   `json:"is_public"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	update := bson.M{"updated_at": time.Now()}
	if req.OriginalName != nil {
		update["original_name"] = *req.OriginalName
	}
	if req.IsPublic != nil {
		update["is_public"] = *req.IsPublic
	}

	result, err := filesCol.UpdateOne(c.Request.Context(),
		bson.M{"file_id": fileID, "deleted_at": nil},
		bson.M{"$set": update})
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to update file"})
		return
	}
	if result.MatchedCount == 0 {
		c.JSON(404, gin.H{"error": "file not found"})
		return
	}

	// Invalidate cache
	redisClient.Del(c.Request.Context(), "file:"+fileID)

	var file File
	filesCol.FindOne(c.Request.Context(), bson.M{"file_id": fileID}).Decode(&file)
	c.JSON(200, file)
}

// Share file with users
func shareFile(c *gin.Context) {
	fileID := c.Param("id")

	var req struct {
		UserIDs []string `json:"user_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	result, err := filesCol.UpdateOne(c.Request.Context(),
		bson.M{"file_id": fileID, "deleted_at": nil},
		bson.M{
			"$addToSet": bson.M{"shared_with": bson.M{"$each": req.UserIDs}},
			"$set":      bson.M{"updated_at": time.Now()},
		})
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to share file"})
		return
	}
	if result.MatchedCount == 0 {
		c.JSON(404, gin.H{"error": "file not found"})
		return
	}

	// Invalidate cache
	redisClient.Del(c.Request.Context(), "file:"+fileID)

	c.JSON(200, gin.H{"message": "file shared", "shared_with": req.UserIDs})
}

// Unshare file with user
func unshareFile(c *gin.Context) {
	fileID := c.Param("id")
	userID := c.Param("userId")

	result, err := filesCol.UpdateOne(c.Request.Context(),
		bson.M{"file_id": fileID, "deleted_at": nil},
		bson.M{
			"$pull": bson.M{"shared_with": userID},
			"$set":  bson.M{"updated_at": time.Now()},
		})
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to unshare file"})
		return
	}
	if result.MatchedCount == 0 {
		c.JSON(404, gin.H{"error": "file not found"})
		return
	}

	// Invalidate cache
	redisClient.Del(c.Request.Context(), "file:"+fileID)

	c.JSON(200, gin.H{"message": "file unshared"})
}

// Get user's files
func getUserFiles(c *gin.Context) {
	userID := c.Param("userId")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	fileType := c.Query("type")

	if limit > 100 {
		limit = 100
	}

	filter := bson.M{
		"uploaded_by": userID,
		"deleted_at":  nil,
	}
	if fileType != "" {
		filter["file_type"] = fileType
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(offset))

	cursor, err := filesCol.Find(c.Request.Context(), filter, opts)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch files"})
		return
	}
	defer cursor.Close(c.Request.Context())

	var files []File
	cursor.All(c.Request.Context(), &files)

	total, _ := filesCol.CountDocuments(c.Request.Context(), filter)

	c.JSON(200, gin.H{
		"files":  files,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// Get workspace files
func getWorkspaceFiles(c *gin.Context) {
	workspaceID := c.Param("workspaceId")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit > 100 {
		limit = 100
	}

	filter := bson.M{
		"workspace_id": workspaceID,
		"deleted_at":   nil,
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(offset))

	cursor, err := filesCol.Find(c.Request.Context(), filter, opts)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch files"})
		return
	}
	defer cursor.Close(c.Request.Context())

	var files []File
	cursor.All(c.Request.Context(), &files)

	total, _ := filesCol.CountDocuments(c.Request.Context(), filter)

	c.JSON(200, gin.H{
		"files":  files,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// Get channel files
func getChannelFiles(c *gin.Context) {
	channelID := c.Param("channelId")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit > 100 {
		limit = 100
	}

	filter := bson.M{
		"channel_id": channelID,
		"deleted_at": nil,
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(offset))

	cursor, err := filesCol.Find(c.Request.Context(), filter, opts)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch files"})
		return
	}
	defer cursor.Close(c.Request.Context())

	var files []File
	cursor.All(c.Request.Context(), &files)

	total, _ := filesCol.CountDocuments(c.Request.Context(), filter)

	c.JSON(200, gin.H{
		"files":  files,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// Batch get files
func batchGetFiles(c *gin.Context) {
	var req struct {
		FileIDs []string `json:"file_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if len(req.FileIDs) > 100 {
		c.JSON(400, gin.H{"error": "max 100 files per request"})
		return
	}

	cursor, err := filesCol.Find(c.Request.Context(), bson.M{
		"file_id":    bson.M{"$in": req.FileIDs},
		"deleted_at": nil,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch files"})
		return
	}
	defer cursor.Close(c.Request.Context())

	var files []File
	cursor.All(c.Request.Context(), &files)

	c.JSON(200, gin.H{"files": files})
}

// Batch delete files
func batchDeleteFiles(c *gin.Context) {
	var req struct {
		FileIDs []string `json:"file_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	result, err := filesCol.UpdateMany(c.Request.Context(),
		bson.M{"file_id": bson.M{"$in": req.FileIDs}, "deleted_at": nil},
		bson.M{"$set": bson.M{"deleted_at": now, "updated_at": now}})
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to delete files"})
		return
	}

	// Invalidate cache
	for _, fileID := range req.FileIDs {
		redisClient.Del(c.Request.Context(), "file:"+fileID)
	}

	c.JSON(200, gin.H{"deleted": result.ModifiedCount})
}

// Get stats
func getStats(c *gin.Context) {
	ctx := c.Request.Context()

	totalFiles, _ := filesCol.CountDocuments(ctx, bson.M{"deleted_at": nil})
	totalSize := int64(0)

	// Aggregate total size
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"deleted_at": nil}}},
		{{Key: "$group", Value: bson.M{"_id": nil, "total_size": bson.M{"$sum": "$size"}}}},
	}
	cursor, err := filesCol.Aggregate(ctx, pipeline)
	if err == nil {
		var results []bson.M
		cursor.All(ctx, &results)
		if len(results) > 0 {
			totalSize = results[0]["total_size"].(int64)
		}
	}

	// Count by type
	typeCounts := make(map[string]int64)
	for fileType := range map[string]bool{"image": true, "video": true, "audio": true, "document": true, "archive": true} {
		count, _ := filesCol.CountDocuments(ctx, bson.M{"file_type": fileType, "deleted_at": nil})
		typeCounts[fileType] = count
	}

	c.JSON(200, gin.H{
		"total_files":    totalFiles,
		"total_size":     totalSize,
		"total_size_mb":  float64(totalSize) / (1024 * 1024),
		"files_by_type":  typeCounts,
	})
}

// Get user stats
func getUserStats(c *gin.Context) {
	userID := c.Param("userId")
	ctx := c.Request.Context()

	totalFiles, _ := filesCol.CountDocuments(ctx, bson.M{"uploaded_by": userID, "deleted_at": nil})

	// Aggregate total size
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"uploaded_by": userID, "deleted_at": nil}}},
		{{Key: "$group", Value: bson.M{"_id": nil, "total_size": bson.M{"$sum": "$size"}}}},
	}
	cursor, err := filesCol.Aggregate(ctx, pipeline)
	totalSize := int64(0)
	if err == nil {
		var results []bson.M
		cursor.All(ctx, &results)
		if len(results) > 0 {
			totalSize = results[0]["total_size"].(int64)
		}
	}

	c.JSON(200, gin.H{
		"user_id":       userID,
		"total_files":   totalFiles,
		"total_size":    totalSize,
		"total_size_mb": float64(totalSize) / (1024 * 1024),
	})
}

// Helper functions
func detectMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	mimeTypes := map[string]string{
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".webp": "image/webp",
		".svg":  "image/svg+xml",
		".mp4":  "video/mp4",
		".webm": "video/webm",
		".mov":  "video/quicktime",
		".mp3":  "audio/mpeg",
		".wav":  "audio/wav",
		".ogg":  "audio/ogg",
		".pdf":  "application/pdf",
		".doc":  "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xls":  "application/vnd.ms-excel",
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".ppt":  "application/vnd.ms-powerpoint",
		".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
		".txt":  "text/plain",
		".csv":  "text/csv",
		".json": "application/json",
		".zip":  "application/zip",
		".rar":  "application/x-rar-compressed",
		".7z":   "application/x-7z-compressed",
	}
	if mime, ok := mimeTypes[ext]; ok {
		return mime
	}
	return "application/octet-stream"
}

func cacheFile(ctx context.Context, file *File) {
	data, _ := json.Marshal(file)
	redisClient.Set(ctx, "file:"+file.FileID, data, 1*time.Hour)
}

func getCachedFile(ctx context.Context, fileID string) *File {
	data, err := redisClient.Get(ctx, "file:"+fileID).Bytes()
	if err != nil {
		return nil
	}
	var file File
	if err := json.Unmarshal(data, &file); err != nil {
		return nil
	}
	return &file
}

func publishEvent(event FileEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		log.Errorf("Failed to marshal event: %v", err)
		return
	}

	go func() {
		err := kafkaWriter.WriteMessages(context.Background(), kafka.Message{
			Key:   []byte(event.FileID),
			Value: data,
			Headers: []kafka.Header{
				{Key: "event_type", Value: []byte(event.Type)},
				{Key: "workspace_id", Value: []byte(event.WorkspaceID)},
			},
		})
		if err != nil {
			log.Errorf("Failed to publish event %s: %v", event.Type, err)
		} else {
			log.WithFields(logrus.Fields{
				"event_type": event.Type,
				"file_id":    event.FileID,
			}).Debug("Event published")
		}
	}()
}
