package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"attachment-service/internal/config"
	"attachment-service/internal/kafka"
	"attachment-service/internal/models"
	"attachment-service/internal/repository"
	"attachment-service/internal/storage"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
)

type AttachmentService struct {
	repo     repository.Repository
	storage  storage.Storage
	producer *kafka.Producer
	cfg      *config.Config
}

func NewAttachmentService(repo repository.Repository, storage storage.Storage, producer *kafka.Producer, cfg *config.Config) *AttachmentService {
	return &AttachmentService{
		repo:     repo,
		storage:  storage,
		producer: producer,
		cfg:      cfg,
	}
}

func (s *AttachmentService) InitiateUpload(ctx context.Context, req *models.InitiateUploadRequest) (*models.UploadResponse, error) {
	// Validate file type
	if !s.isAllowedType(req.MimeType) {
		return nil, fmt.Errorf("file type not allowed: %s", req.MimeType)
	}

	// Validate file size
	if req.Size > s.cfg.MaxFileSize {
		return nil, fmt.Errorf("file too large: %d bytes (max: %d)", req.Size, s.cfg.MaxFileSize)
	}

	// Generate unique filename
	ext := filepath.Ext(req.FileName)
	fileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	storagePath := fmt.Sprintf("%s/%s/%s", req.WorkspaceID, time.Now().Format("2006/01/02"), fileName)

	attachment := &models.Attachment{
		UserID:       req.UserID,
		WorkspaceID:  req.WorkspaceID,
		ChannelID:    req.ChannelID,
		FileName:     fileName,
		OriginalName: req.FileName,
		MimeType:     req.MimeType,
		Type:         s.determineType(req.MimeType),
		Size:         req.Size,
		Status:       models.StatusPending,
		StoragePath:  storagePath,
	}

	if err := s.repo.Create(ctx, attachment); err != nil {
		return nil, fmt.Errorf("failed to create attachment record: %w", err)
	}

	// Generate presigned upload URL
	uploadURL, err := s.storage.GetPresignedUploadURL(ctx, storagePath, req.MimeType, 15*time.Minute)
	if err != nil {
		return nil, fmt.Errorf("failed to generate upload URL: %w", err)
	}

	return &models.UploadResponse{
		Attachment: attachment,
		UploadURL:  uploadURL,
	}, nil
}

func (s *AttachmentService) Upload(ctx context.Context, req *models.UploadRequest, reader io.Reader, fileName string, mimeType string, size int64) (*models.Attachment, error) {
	// Validate file type
	if !s.isAllowedType(mimeType) {
		return nil, fmt.Errorf("file type not allowed: %s", mimeType)
	}

	// Validate file size
	if size > s.cfg.MaxFileSize {
		return nil, fmt.Errorf("file too large: %d bytes (max: %d)", size, s.cfg.MaxFileSize)
	}

	// Generate unique filename
	ext := filepath.Ext(fileName)
	uniqueName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	storagePath := fmt.Sprintf("%s/%s/%s", req.WorkspaceID, time.Now().Format("2006/01/02"), uniqueName)

	// Calculate checksum while uploading
	hasher := sha256.New()
	teeReader := io.TeeReader(reader, hasher)

	// Upload to storage
	if err := s.storage.Upload(ctx, storagePath, teeReader, mimeType, size); err != nil {
		return nil, fmt.Errorf("failed to upload file: %w", err)
	}

	checksum := hex.EncodeToString(hasher.Sum(nil))

	// Create attachment record
	attachment := &models.Attachment{
		UserID:       req.UserID,
		WorkspaceID:  req.WorkspaceID,
		ChannelID:    req.ChannelID,
		MessageID:    req.MessageID,
		FileName:     uniqueName,
		OriginalName: fileName,
		MimeType:     mimeType,
		Type:         s.determineType(mimeType),
		Size:         size,
		Status:       models.StatusReady,
		StoragePath:  storagePath,
		URL:          fmt.Sprintf("%s/files/%s", s.cfg.CDNBaseURL, storagePath),
		Metadata: &models.AttachmentMeta{
			Checksum:    checksum,
			ContentType: mimeType,
		},
	}

	if err := s.repo.Create(ctx, attachment); err != nil {
		// Try to clean up uploaded file
		_ = s.storage.Delete(ctx, storagePath)
		return nil, fmt.Errorf("failed to create attachment record: %w", err)
	}

	// Publish event
	if s.producer != nil {
		s.producer.Publish("attachments.uploaded", map[string]any{
			"attachment_id": attachment.ID.Hex(),
			"user_id":       attachment.UserID,
			"workspace_id":  attachment.WorkspaceID,
			"channel_id":    attachment.ChannelID,
			"file_name":     attachment.OriginalName,
			"mime_type":     attachment.MimeType,
			"size":          attachment.Size,
		})
	}

	return attachment, nil
}

func (s *AttachmentService) CompleteUpload(ctx context.Context, id string) (*models.Attachment, error) {
	attachment, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Update status and URL
	attachment.Status = models.StatusReady
	attachment.URL = fmt.Sprintf("%s/files/%s", s.cfg.CDNBaseURL, attachment.StoragePath)

	if err := s.repo.Update(ctx, id, bson.M{
		"status": models.StatusReady,
		"url":    attachment.URL,
	}); err != nil {
		return nil, err
	}

	// Publish event
	if s.producer != nil {
		s.producer.Publish("attachments.uploaded", map[string]any{
			"attachment_id": attachment.ID.Hex(),
			"user_id":       attachment.UserID,
			"workspace_id":  attachment.WorkspaceID,
		})
	}

	return attachment, nil
}

func (s *AttachmentService) GetByID(ctx context.Context, id string) (*models.Attachment, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *AttachmentService) GetByMessageID(ctx context.Context, messageID string) ([]*models.Attachment, error) {
	return s.repo.GetByMessageID(ctx, messageID)
}

func (s *AttachmentService) GetByChannelID(ctx context.Context, channelID string, limit, offset int) ([]*models.Attachment, error) {
	return s.repo.GetByChannelID(ctx, channelID, limit, offset)
}

func (s *AttachmentService) GetByUserID(ctx context.Context, userID string, limit, offset int) ([]*models.Attachment, error) {
	return s.repo.GetByUserID(ctx, userID, limit, offset)
}

func (s *AttachmentService) Delete(ctx context.Context, id string, userID string) error {
	attachment, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Verify ownership
	if attachment.UserID != userID {
		return fmt.Errorf("unauthorized")
	}

	// Delete from storage
	if err := s.storage.Delete(ctx, attachment.StoragePath); err != nil {
		// Log but continue with marking as deleted
	}

	// Mark as deleted
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	// Publish event
	if s.producer != nil {
		s.producer.Publish("attachments.deleted", map[string]any{
			"attachment_id": id,
			"user_id":       userID,
			"workspace_id":  attachment.WorkspaceID,
		})
	}

	return nil
}

func (s *AttachmentService) GetDownloadURL(ctx context.Context, id string) (string, error) {
	attachment, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", err
	}

	return s.storage.GetPresignedURL(ctx, attachment.StoragePath, 1*time.Hour)
}

func (s *AttachmentService) isAllowedType(mimeType string) bool {
	for _, allowed := range s.cfg.AllowedTypes {
		if allowed == mimeType {
			return true
		}
	}
	return false
}

func (s *AttachmentService) determineType(mimeType string) models.AttachmentType {
	if strings.HasPrefix(mimeType, "image/") {
		return models.TypeImage
	}
	if strings.HasPrefix(mimeType, "video/") {
		return models.TypeVideo
	}
	if strings.HasPrefix(mimeType, "audio/") {
		return models.TypeAudio
	}
	if strings.HasPrefix(mimeType, "application/pdf") ||
		strings.HasPrefix(mimeType, "application/msword") ||
		strings.HasPrefix(mimeType, "application/vnd.") ||
		strings.HasPrefix(mimeType, "text/") {
		return models.TypeDocument
	}
	return models.TypeOther
}
