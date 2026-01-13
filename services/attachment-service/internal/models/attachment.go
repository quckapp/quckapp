package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AttachmentType string

const (
	TypeImage    AttachmentType = "image"
	TypeVideo    AttachmentType = "video"
	TypeAudio    AttachmentType = "audio"
	TypeDocument AttachmentType = "document"
	TypeOther    AttachmentType = "other"
)

type AttachmentStatus string

const (
	StatusPending    AttachmentStatus = "pending"
	StatusUploading  AttachmentStatus = "uploading"
	StatusProcessing AttachmentStatus = "processing"
	StatusReady      AttachmentStatus = "ready"
	StatusFailed     AttachmentStatus = "failed"
	StatusDeleted    AttachmentStatus = "deleted"
)

type Attachment struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID       string             `bson:"user_id" json:"user_id"`
	WorkspaceID  string             `bson:"workspace_id" json:"workspace_id"`
	ChannelID    string             `bson:"channel_id,omitempty" json:"channel_id,omitempty"`
	MessageID    string             `bson:"message_id,omitempty" json:"message_id,omitempty"`
	FileName     string             `bson:"file_name" json:"file_name"`
	OriginalName string             `bson:"original_name" json:"original_name"`
	MimeType     string             `bson:"mime_type" json:"mime_type"`
	Type         AttachmentType     `bson:"type" json:"type"`
	Size         int64              `bson:"size" json:"size"`
	Status       AttachmentStatus   `bson:"status" json:"status"`
	StoragePath  string             `bson:"storage_path" json:"storage_path"`
	URL          string             `bson:"url" json:"url"`
	ThumbnailURL string             `bson:"thumbnail_url,omitempty" json:"thumbnail_url,omitempty"`
	Metadata     *AttachmentMeta    `bson:"metadata,omitempty" json:"metadata,omitempty"`
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
	ExpiresAt    *time.Time         `bson:"expires_at,omitempty" json:"expires_at,omitempty"`
}

type AttachmentMeta struct {
	Width       int     `bson:"width,omitempty" json:"width,omitempty"`
	Height      int     `bson:"height,omitempty" json:"height,omitempty"`
	Duration    float64 `bson:"duration,omitempty" json:"duration,omitempty"`
	HasAudio    bool    `bson:"has_audio,omitempty" json:"has_audio,omitempty"`
	Checksum    string  `bson:"checksum,omitempty" json:"checksum,omitempty"`
	ContentType string  `bson:"content_type,omitempty" json:"content_type,omitempty"`
}

type UploadRequest struct {
	UserID      string `form:"user_id" binding:"required"`
	WorkspaceID string `form:"workspace_id" binding:"required"`
	ChannelID   string `form:"channel_id"`
	MessageID   string `form:"message_id"`
}

type UploadResponse struct {
	Attachment *Attachment `json:"attachment"`
	UploadURL  string      `json:"upload_url,omitempty"`
}

type InitiateUploadRequest struct {
	UserID      string `json:"user_id" binding:"required"`
	WorkspaceID string `json:"workspace_id" binding:"required"`
	ChannelID   string `json:"channel_id"`
	FileName    string `json:"file_name" binding:"required"`
	MimeType    string `json:"mime_type" binding:"required"`
	Size        int64  `json:"size" binding:"required"`
}

type CompleteUploadRequest struct {
	AttachmentID string `json:"attachment_id" binding:"required"`
	UploadID     string `json:"upload_id,omitempty"`
}
