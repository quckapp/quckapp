package repository

import (
	"github.com/google/uuid"
	"github.com/quikapp/bookmark-service/internal/model"
	"gorm.io/gorm"
)

type FolderRepository interface {
	Create(folder *model.BookmarkFolder) error
	GetByID(id uuid.UUID) (*model.BookmarkFolder, error)
	GetByUser(userID uuid.UUID) ([]model.BookmarkFolder, error)
	GetByUserAndWorkspace(userID, workspaceID uuid.UUID) ([]model.BookmarkFolder, error)
	Update(folder *model.BookmarkFolder) error
	Delete(id uuid.UUID) error
}

type folderRepository struct {
	db *gorm.DB
}

func NewFolderRepository(db *gorm.DB) FolderRepository {
	db.AutoMigrate(&model.BookmarkFolder{})
	return &folderRepository{db: db}
}

func (r *folderRepository) Create(folder *model.BookmarkFolder) error {
	return r.db.Create(folder).Error
}

func (r *folderRepository) GetByID(id uuid.UUID) (*model.BookmarkFolder, error) {
	var folder model.BookmarkFolder
	err := r.db.First(&folder, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &folder, nil
}

func (r *folderRepository) GetByUser(userID uuid.UUID) ([]model.BookmarkFolder, error) {
	var folders []model.BookmarkFolder
	err := r.db.Where("user_id = ?", userID).
		Order("position ASC, name ASC").
		Find(&folders).Error
	return folders, err
}

func (r *folderRepository) GetByUserAndWorkspace(userID, workspaceID uuid.UUID) ([]model.BookmarkFolder, error) {
	var folders []model.BookmarkFolder
	err := r.db.Where("user_id = ? AND workspace_id = ?", userID, workspaceID).
		Order("position ASC, name ASC").
		Find(&folders).Error
	return folders, err
}

func (r *folderRepository) Update(folder *model.BookmarkFolder) error {
	return r.db.Save(folder).Error
}

func (r *folderRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.BookmarkFolder{}, "id = ?", id).Error
}
