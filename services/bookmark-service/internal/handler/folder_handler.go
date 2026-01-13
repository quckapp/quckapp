package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quikapp/bookmark-service/internal/model"
	"github.com/quikapp/bookmark-service/internal/service"
)

type FolderHandler struct {
	service service.FolderService
}

func NewFolderHandler(service service.FolderService) *FolderHandler {
	return &FolderHandler{service: service}
}

type CreateFolderRequest struct {
	UserID      string `json:"userId" binding:"required"`
	WorkspaceID string `json:"workspaceId" binding:"required"`
	ParentID    string `json:"parentId,omitempty"`
	Name        string `json:"name" binding:"required"`
	Color       string `json:"color,omitempty"`
	Icon        string `json:"icon,omitempty"`
}

func (h *FolderHandler) Create(c *gin.Context) {
	var req CreateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := uuid.Parse(req.UserID)
	workspaceID, _ := uuid.Parse(req.WorkspaceID)

	folder := &model.BookmarkFolder{
		UserID:      userID,
		WorkspaceID: workspaceID,
		Name:        req.Name,
		Color:       req.Color,
		Icon:        req.Icon,
	}

	if req.ParentID != "" {
		parentID, _ := uuid.Parse(req.ParentID)
		folder.ParentID = &parentID
	}

	if err := h.service.Create(folder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": folder})
}

func (h *FolderHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	folder, err := h.service.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": folder})
}

func (h *FolderHandler) GetByUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	folders, err := h.service.GetByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": folders})
}

func (h *FolderHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var folder model.BookmarkFolder
	if err := c.ShouldBindJSON(&folder); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	folder.ID = id
	if err := h.service.Update(&folder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": folder})
}

func (h *FolderHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.service.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Folder deleted"})
}
