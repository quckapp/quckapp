package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Bookmark struct {
	ID          uuid.UUID      `gorm:"type:char(36);primary_key" json:"id"`
	UserID      uuid.UUID      `gorm:"type:char(36);not null;index" json:"userId"`
	WorkspaceID uuid.UUID      `gorm:"type:char(36);not null;index" json:"workspaceId"`
	FolderID    *uuid.UUID     `gorm:"type:char(36);index" json:"folderId,omitempty"`
	Type        BookmarkType   `gorm:"type:varchar(20);not null" json:"type"`
	Title       string         `gorm:"type:varchar(255);not null" json:"title"`
	Description string         `gorm:"type:text" json:"description,omitempty"`
	TargetID    uuid.UUID      `gorm:"type:char(36);not null" json:"targetId"`
	TargetURL   string         `gorm:"type:varchar(500)" json:"targetUrl,omitempty"`
	Metadata    string         `gorm:"type:json" json:"metadata,omitempty"`
	Position    int            `gorm:"default:0" json:"position"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type BookmarkType string

const (
	BookmarkTypeMessage  BookmarkType = "message"
	BookmarkTypeChannel  BookmarkType = "channel"
	BookmarkTypeFile     BookmarkType = "file"
	BookmarkTypeThread   BookmarkType = "thread"
	BookmarkTypeExternal BookmarkType = "external"
)

func (b *Bookmark) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

type BookmarkFolder struct {
	ID          uuid.UUID      `gorm:"type:char(36);primary_key" json:"id"`
	UserID      uuid.UUID      `gorm:"type:char(36);not null;index" json:"userId"`
	WorkspaceID uuid.UUID      `gorm:"type:char(36);not null;index" json:"workspaceId"`
	ParentID    *uuid.UUID     `gorm:"type:char(36);index" json:"parentId,omitempty"`
	Name        string         `gorm:"type:varchar(100);not null" json:"name"`
	Color       string         `gorm:"type:varchar(20)" json:"color,omitempty"`
	Icon        string         `gorm:"type:varchar(50)" json:"icon,omitempty"`
	Position    int            `gorm:"default:0" json:"position"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (f *BookmarkFolder) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}
