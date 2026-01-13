package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/quikapp/bookmark-service/internal/model"
	"github.com/quikapp/bookmark-service/internal/repository"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

type BookmarkService interface {
	Create(bookmark *model.Bookmark) error
	GetByID(id uuid.UUID) (*model.Bookmark, error)
	GetByUser(userID uuid.UUID, page, limit int) ([]model.Bookmark, int64, error)
	GetByUserAndWorkspace(userID, workspaceID uuid.UUID, page, limit int) ([]model.Bookmark, int64, error)
	Update(bookmark *model.Bookmark) error
	Delete(id uuid.UUID) error
	MoveToFolder(bookmarkID uuid.UUID, folderID *uuid.UUID) error
}

type bookmarkService struct {
	repo       repository.BookmarkRepository
	folderRepo repository.FolderRepository
	redis      *redis.Client
	logger     *zap.Logger
}

func NewBookmarkService(
	repo repository.BookmarkRepository,
	folderRepo repository.FolderRepository,
	redis *redis.Client,
	logger *zap.Logger,
) BookmarkService {
	return &bookmarkService{
		repo:       repo,
		folderRepo: folderRepo,
		redis:      redis,
		logger:     logger,
	}
}

func (s *bookmarkService) Create(bookmark *model.Bookmark) error {
	// Validate folder exists if provided
	if bookmark.FolderID != nil {
		_, err := s.folderRepo.GetByID(*bookmark.FolderID)
		if err != nil {
			return fmt.Errorf("folder not found")
		}
	}

	err := s.repo.Create(bookmark)
	if err != nil {
		return err
	}

	// Invalidate cache
	s.invalidateUserCache(bookmark.UserID)
	s.logger.Info("Created bookmark", zap.String("id", bookmark.ID.String()))
	return nil
}

func (s *bookmarkService) GetByID(id uuid.UUID) (*model.Bookmark, error) {
	// Try cache first
	ctx := context.Background()
	cacheKey := fmt.Sprintf("bookmark:%s", id.String())
	cached, err := s.redis.Get(ctx, cacheKey).Result()
	if err == nil {
		var bookmark model.Bookmark
		if json.Unmarshal([]byte(cached), &bookmark) == nil {
			return &bookmark, nil
		}
	}

	bookmark, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Cache result
	if data, err := json.Marshal(bookmark); err == nil {
		s.redis.Set(ctx, cacheKey, data, 15*time.Minute)
	}

	return bookmark, nil
}

func (s *bookmarkService) GetByUser(userID uuid.UUID, page, limit int) ([]model.Bookmark, int64, error) {
	offset := page * limit
	return s.repo.GetByUser(userID, limit, offset)
}

func (s *bookmarkService) GetByUserAndWorkspace(userID, workspaceID uuid.UUID, page, limit int) ([]model.Bookmark, int64, error) {
	offset := page * limit
	return s.repo.GetByUserAndWorkspace(userID, workspaceID, limit, offset)
}

func (s *bookmarkService) Update(bookmark *model.Bookmark) error {
	existing, err := s.repo.GetByID(bookmark.ID)
	if err != nil {
		return err
	}

	existing.Title = bookmark.Title
	existing.Description = bookmark.Description
	existing.Position = bookmark.Position
	existing.Metadata = bookmark.Metadata

	err = s.repo.Update(existing)
	if err != nil {
		return err
	}

	// Invalidate cache
	s.invalidateBookmarkCache(bookmark.ID)
	s.invalidateUserCache(existing.UserID)
	return nil
}

func (s *bookmarkService) Delete(id uuid.UUID) error {
	bookmark, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	err = s.repo.Delete(id)
	if err != nil {
		return err
	}

	s.invalidateBookmarkCache(id)
	s.invalidateUserCache(bookmark.UserID)
	s.logger.Info("Deleted bookmark", zap.String("id", id.String()))
	return nil
}

func (s *bookmarkService) MoveToFolder(bookmarkID uuid.UUID, folderID *uuid.UUID) error {
	if folderID != nil {
		_, err := s.folderRepo.GetByID(*folderID)
		if err != nil {
			return fmt.Errorf("folder not found")
		}
	}

	return s.repo.MoveToFolder(bookmarkID, folderID)
}

func (s *bookmarkService) invalidateBookmarkCache(id uuid.UUID) {
	ctx := context.Background()
	s.redis.Del(ctx, fmt.Sprintf("bookmark:%s", id.String()))
}

func (s *bookmarkService) invalidateUserCache(userID uuid.UUID) {
	ctx := context.Background()
	s.redis.Del(ctx, fmt.Sprintf("user_bookmarks:%s", userID.String()))
}
