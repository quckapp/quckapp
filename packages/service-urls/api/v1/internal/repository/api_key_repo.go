package repository

import (
	"github.com/quckapp/service-urls-api/internal/model"
	"gorm.io/gorm"
)

type ApiKeyRepository struct {
	db *gorm.DB
}

func NewApiKeyRepository(db *gorm.DB) *ApiKeyRepository {
	return &ApiKeyRepository{db: db}
}

func (r *ApiKeyRepository) ValidateKey(rawKey, env string) (bool, error) {
	hash := model.HashKey(rawKey)
	var count int64
	err := r.db.Model(&model.ApiKey{}).
		Where("key_hash = ? AND is_active = ? AND (environment IS NULL OR environment = ?)", hash, true, env).
		Count(&count).Error
	return count > 0, err
}
