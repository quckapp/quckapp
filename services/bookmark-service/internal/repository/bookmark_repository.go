package repository

import (
	"github.com/google/uuid"
	"github.com/quikapp/bookmark-service/internal/model"
	"gorm.io/gorm"
)

type BookmarkRepository interface {
	Create(bookmark *model.Bookmark) error
	GetByID(id uuid.UUID) (*model.Bookmark, error)
	GetByUser(userID uuid.UUID, limit, offset int) ([]model.Bookmark, int64, error)
	GetByUserAndWorkspace(userID, workspaceID uuid.UUID, limit, offset int) ([]model.Bookmark, int64, error)
	GetByFolder(folderID uuid.UUID) ([]model.Bookmark, error)
	Update(bookmark *model.Bookmark) error
	Delete(id uuid.UUID) error
	MoveToFolder(bookmarkID uuid.UUID, folderID *uuid.UUID) error
}

type bookmarkRepository struct {
	db *gorm.DB
}

func NewBookmarkRepository(db *gorm.DB) BookmarkRepository {
	db.AutoMigrate(&model.Bookmark{})
	return &bookmarkRepository{db: db}
}

func (r *bookmarkRepository) Create(bookmark *model.Bookmark) error {
	return r.db.Create(bookmark).Error
}

func (r *bookmarkRepository) GetByID(id uuid.UUID) (*model.Bookmark, error) {
	var bookmark model.Bookmark
	err := r.db.First(&bookmark, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &bookmark, nil
}

func (r *bookmarkRepository) GetByUser(userID uuid.UUID, limit, offset int) ([]model.Bookmark, int64, error) {
	var bookmarks []model.Bookmark
	var total int64

	r.db.Model(&model.Bookmark{}).Where("user_id = ?", userID).Count(&total)
	err := r.db.Where("user_id = ?", userID).
		Order("position ASC, created_at DESC").
		Limit(limit).Offset(offset).
		Find(&bookmarks).Error

	return bookmarks, total, err
}

func (r *bookmarkRepository) GetByUserAndWorkspace(userID, workspaceID uuid.UUID, limit, offset int) ([]model.Bookmark, int64, error) {
	var bookmarks []model.Bookmark
	var total int64

	r.db.Model(&model.Bookmark{}).Where("user_id = ? AND workspace_id = ?", userID, workspaceID).Count(&total)
	err := r.db.Where("user_id = ? AND workspace_id = ?", userID, workspaceID).
		Order("position ASC, created_at DESC").
		Limit(limit).Offset(offset).
		Find(&bookmarks).Error

	return bookmarks, total, err
}

func (r *bookmarkRepository) GetByFolder(folderID uuid.UUID) ([]model.Bookmark, error) {
	var bookmarks []model.Bookmark
	err := r.db.Where("folder_id = ?", folderID).
		Order("position ASC").
		Find(&bookmarks).Error
	return bookmarks, err
}

func (r *bookmarkRepository) Update(bookmark *model.Bookmark) error {
	return r.db.Save(bookmark).Error
}

func (r *bookmarkRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Bookmark{}, "id = ?", id).Error
}

func (r *bookmarkRepository) MoveToFolder(bookmarkID uuid.UUID, folderID *uuid.UUID) error {
	return r.db.Model(&model.Bookmark{}).Where("id = ?", bookmarkID).Update("folder_id", folderID).Error
}
