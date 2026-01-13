package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quikapp/bookmark-service/internal/model"
	"github.com/quikapp/bookmark-service/internal/service"
)

type BookmarkHandler struct {
	service service.BookmarkService
}

func NewBookmarkHandler(service service.BookmarkService) *BookmarkHandler {
	return &BookmarkHandler{service: service}
}

type CreateBookmarkRequest struct {
	UserID      string `json:"userId" binding:"required"`
	WorkspaceID string `json:"workspaceId" binding:"required"`
	FolderID    string `json:"folderId,omitempty"`
	Type        string `json:"type" binding:"required"`
	Title       string `json:"title" binding:"required"`
	Description string `json:"description,omitempty"`
	TargetID    string `json:"targetId" binding:"required"`
	TargetURL   string `json:"targetUrl,omitempty"`
	Metadata    string `json:"metadata,omitempty"`
}

func (h *BookmarkHandler) Create(c *gin.Context) {
	var req CreateBookmarkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := uuid.Parse(req.UserID)
	workspaceID, _ := uuid.Parse(req.WorkspaceID)
	targetID, _ := uuid.Parse(req.TargetID)

	bookmark := &model.Bookmark{
		UserID:      userID,
		WorkspaceID: workspaceID,
		Type:        model.BookmarkType(req.Type),
		Title:       req.Title,
		Description: req.Description,
		TargetID:    targetID,
		TargetURL:   req.TargetURL,
		Metadata:    req.Metadata,
	}

	if req.FolderID != "" {
		folderID, _ := uuid.Parse(req.FolderID)
		bookmark.FolderID = &folderID
	}

	if err := h.service.Create(bookmark); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": bookmark})
}

func (h *BookmarkHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	bookmark, err := h.service.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": bookmark})
}

func (h *BookmarkHandler) GetByUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	bookmarks, total, err := h.service.GetByUser(userID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  bookmarks,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *BookmarkHandler) GetByUserAndWorkspace(c *gin.Context) {
	userID, _ := uuid.Parse(c.Param("userId"))
	workspaceID, _ := uuid.Parse(c.Param("workspaceId"))

	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	bookmarks, total, err := h.service.GetByUserAndWorkspace(userID, workspaceID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  bookmarks,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *BookmarkHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var bookmark model.Bookmark
	if err := c.ShouldBindJSON(&bookmark); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bookmark.ID = id
	if err := h.service.Update(&bookmark); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": bookmark})
}

func (h *BookmarkHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.service.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bookmark deleted"})
}

func (h *BookmarkHandler) MoveToFolder(c *gin.Context) {
	bookmarkID, _ := uuid.Parse(c.Param("id"))

	var req struct {
		FolderID string `json:"folderId"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var folderID *uuid.UUID
	if req.FolderID != "" {
		id, _ := uuid.Parse(req.FolderID)
		folderID = &id
	}

	if err := h.service.MoveToFolder(bookmarkID, folderID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bookmark moved"})
}
