package repository

import (
	"github.com/quckapp/service-urls-api/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ConfigEntryRepository struct {
	db *gorm.DB
}

func NewConfigEntryRepository(db *gorm.DB) *ConfigEntryRepository {
	return &ConfigEntryRepository{db: db}
}

func (r *ConfigEntryRepository) FindByEnv(env string, category string) ([]model.ConfigEntry, error) {
	var results []model.ConfigEntry
	q := r.db.Where("environment = ? AND is_active = ?", env, true)
	if category != "" {
		q = q.Where("category = ?", category)
	}
	err := q.Order("config_key ASC").Find(&results).Error
	return results, err
}

func (r *ConfigEntryRepository) FindByEnvAndKey(env, key string) (*model.ConfigEntry, error) {
	var result model.ConfigEntry
	err := r.db.Where("environment = ? AND config_key = ?", env, key).First(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *ConfigEntryRepository) Create(e *model.ConfigEntry) error {
	return r.db.Create(e).Error
}

func (r *ConfigEntryRepository) Update(e *model.ConfigEntry) error {
	return r.db.Model(e).Select(
		"config_value", "category", "is_secret", "description", "updated_by",
	).Updates(e).Error
}

func (r *ConfigEntryRepository) SetActive(env, key string, active bool) error {
	return r.db.Model(&model.ConfigEntry{}).
		Where("environment = ? AND config_key = ?", env, key).
		Update("is_active", active).Error
}

func (r *ConfigEntryRepository) Delete(env, key string) error {
	return r.db.Where("environment = ? AND config_key = ?", env, key).Delete(&model.ConfigEntry{}).Error
}

func (r *ConfigEntryRepository) CountByEnv(env string) (int64, error) {
	var count int64
	err := r.db.Model(&model.ConfigEntry{}).Where("environment = ? AND is_active = ?", env, true).Count(&count).Error
	return count, err
}

func (r *ConfigEntryRepository) FindAllActiveByEnv(env string) ([]model.ConfigEntry, error) {
	var results []model.ConfigEntry
	err := r.db.Where("environment = ? AND is_active = ?", env, true).Find(&results).Error
	return results, err
}

func (r *ConfigEntryRepository) Upsert(e *model.ConfigEntry) error {
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "environment"}, {Name: "config_key"}},
		DoUpdates: clause.AssignmentColumns([]string{"config_value", "category", "is_secret", "description", "is_active", "updated_by", "updated_at"}),
	}).Create(e).Error
}
