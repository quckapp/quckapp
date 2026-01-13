package service

import (
	"github.com/google/uuid"
	"github.com/quikapp/bookmark-service/internal/model"
	"github.com/quikapp/bookmark-service/internal/repository"
	"go.uber.org/zap"
)

type FolderService interface {
	Create(folder *model.BookmarkFolder) error
	GetByID(id uuid.UUID) (*model.BookmarkFolder, error)
	GetByUser(userID uuid.UUID) ([]model.BookmarkFolder, error)
	Update(folder *model.BookmarkFolder) error
	Delete(id uuid.UUID) error
}

type folderService struct {
	repo   repository.FolderRepository
	logger *zap.Logger
}

func NewFolderService(repo repository.FolderRepository, logger *zap.Logger) FolderService {
	return &folderService{repo: repo, logger: logger}
}

func (s *folderService) Create(folder *model.BookmarkFolder) error {
	err := s.repo.Create(folder)
	if err != nil {
		return err
	}
	s.logger.Info("Created bookmark folder", zap.String("id", folder.ID.String()))
	return nil
}

func (s *folderService) GetByID(id uuid.UUID) (*model.BookmarkFolder, error) {
	return s.repo.GetByID(id)
}

func (s *folderService) GetByUser(userID uuid.UUID) ([]model.BookmarkFolder, error) {
	return s.repo.GetByUser(userID)
}

func (s *folderService) Update(folder *model.BookmarkFolder) error {
	existing, err := s.repo.GetByID(folder.ID)
	if err != nil {
		return err
	}

	existing.Name = folder.Name
	existing.Color = folder.Color
	existing.Icon = folder.Icon
	existing.Position = folder.Position
	existing.ParentID = folder.ParentID

	return s.repo.Update(existing)
}

func (s *folderService) Delete(id uuid.UUID) error {
	err := s.repo.Delete(id)
	if err != nil {
		return err
	}
	s.logger.Info("Deleted bookmark folder", zap.String("id", id.String()))
	return nil
}
