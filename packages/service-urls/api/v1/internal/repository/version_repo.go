package repository

import (
	"github.com/quckapp/service-urls-api/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type VersionRepository struct {
	db *gorm.DB
}

func NewVersionRepository(db *gorm.DB) *VersionRepository {
	return &VersionRepository{db: db}
}

func (r *VersionRepository) FindByEnv(env string) ([]model.VersionConfig, error) {
	var results []model.VersionConfig
	err := r.db.Where("environment = ?", env).
		Order("service_key ASC, api_version ASC").
		Find(&results).Error
	return results, err
}

func (r *VersionRepository) FindOne(env, serviceKey, ver string) (*model.VersionConfig, error) {
	var result model.VersionConfig
	err := r.db.Where("environment = ? AND service_key = ? AND api_version = ?", env, serviceKey, ver).
		First(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *VersionRepository) Create(vc *model.VersionConfig) error {
	return r.db.Create(vc).Error
}

func (r *VersionRepository) Delete(env, serviceKey, ver string) error {
	return r.db.Where("environment = ? AND service_key = ? AND api_version = ?", env, serviceKey, ver).
		Delete(&model.VersionConfig{}).Error
}

func (r *VersionRepository) UpdateStatus(vc *model.VersionConfig) error {
	return r.db.Model(vc).Select(
		"status", "sunset_date", "sunset_duration_days", "deprecated_at", "updated_by",
	).Updates(vc).Error
}

func (r *VersionRepository) BulkCreate(vcs []model.VersionConfig) error {
	if len(vcs) == 0 {
		return nil
	}
	return r.db.Create(&vcs).Error
}

func (r *VersionRepository) ActivateAllReady(env, apiVersion string) error {
	return r.db.Model(&model.VersionConfig{}).
		Where("environment = ? AND api_version = ? AND status = ?", env, apiVersion, model.StatusReady).
		Updates(map[string]interface{}{
			"status":        model.StatusActive,
			"deprecated_at": nil,
		}).Error
}

func (r *VersionRepository) FindGlobalConfig(env string) (*model.GlobalVersionConfig, error) {
	var result model.GlobalVersionConfig
	err := r.db.Where("environment = ?", env).First(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *VersionRepository) UpsertGlobalConfig(gc *model.GlobalVersionConfig) error {
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "environment"}},
		DoUpdates: clause.AssignmentColumns([]string{"default_api_version", "default_sunset_days", "updated_by", "updated_at"}),
	}).Create(gc).Error
}
