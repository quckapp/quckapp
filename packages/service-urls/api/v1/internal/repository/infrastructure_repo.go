package repository

import (
	"github.com/quckapp/service-urls-api/internal/model"
	"gorm.io/gorm"
)

type InfrastructureRepository struct {
	db *gorm.DB
}

func NewInfrastructureRepository(db *gorm.DB) *InfrastructureRepository {
	return &InfrastructureRepository{db: db}
}

func (r *InfrastructureRepository) FindByEnv(env string) ([]model.InfrastructureConfig, error) {
	var results []model.InfrastructureConfig
	err := r.db.Where("environment = ? AND is_active = ?", env, true).Order("infra_key ASC").Find(&results).Error
	return results, err
}

func (r *InfrastructureRepository) FindByEnvAndKey(env, key string) (*model.InfrastructureConfig, error) {
	var result model.InfrastructureConfig
	err := r.db.Where("environment = ? AND infra_key = ?", env, key).First(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *InfrastructureRepository) Create(i *model.InfrastructureConfig) error {
	return r.db.Create(i).Error
}

func (r *InfrastructureRepository) Update(i *model.InfrastructureConfig) error {
	return r.db.Save(i).Error
}

func (r *InfrastructureRepository) Delete(env, key string) error {
	return r.db.Where("environment = ? AND infra_key = ?", env, key).Delete(&model.InfrastructureConfig{}).Error
}

func (r *InfrastructureRepository) CountByEnv(env string) (int64, error) {
	var count int64
	err := r.db.Model(&model.InfrastructureConfig{}).Where("environment = ? AND is_active = ?", env, true).Count(&count).Error
	return count, err
}
