package repository

import (
	"github.com/quckapp/service-urls-api/internal/model"
	"gorm.io/gorm"
)

type VersionProfileRepository struct {
	db *gorm.DB
}

func NewVersionProfileRepository(db *gorm.DB) *VersionProfileRepository {
	return &VersionProfileRepository{db: db}
}

func (r *VersionProfileRepository) FindAll() ([]model.VersionProfile, error) {
	var results []model.VersionProfile
	err := r.db.Preload("Entries").Order("created_at DESC").Find(&results).Error
	return results, err
}

func (r *VersionProfileRepository) FindByID(id string) (*model.VersionProfile, error) {
	var result model.VersionProfile
	err := r.db.Preload("Entries").Where("id = ?", id).First(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *VersionProfileRepository) Create(profile *model.VersionProfile) error {
	return r.db.Create(profile).Error
}
