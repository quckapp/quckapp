package repository

import (
	"github.com/quckapp/service-urls-api/internal/model"
	"gorm.io/gorm"
)

type ServiceUrlRepository struct {
	db *gorm.DB
}

func NewServiceUrlRepository(db *gorm.DB) *ServiceUrlRepository {
	return &ServiceUrlRepository{db: db}
}

func (r *ServiceUrlRepository) FindByEnv(env string, category string) ([]model.ServiceUrl, error) {
	var results []model.ServiceUrl
	q := r.db.Where("environment = ? AND is_active = ?", env, true)
	if category != "" {
		q = q.Where("category = ?", category)
	}
	err := q.Order("service_key ASC").Find(&results).Error
	return results, err
}

func (r *ServiceUrlRepository) FindByEnvAndKey(env, key string) (*model.ServiceUrl, error) {
	var result model.ServiceUrl
	err := r.db.Where("environment = ? AND service_key = ?", env, key).First(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *ServiceUrlRepository) Create(s *model.ServiceUrl) error {
	return r.db.Create(s).Error
}

func (r *ServiceUrlRepository) Update(s *model.ServiceUrl) error {
	return r.db.Save(s).Error
}

func (r *ServiceUrlRepository) Delete(env, key string) error {
	return r.db.Where("environment = ? AND service_key = ?", env, key).Delete(&model.ServiceUrl{}).Error
}

func (r *ServiceUrlRepository) CountByEnv(env string) (int64, error) {
	var count int64
	err := r.db.Model(&model.ServiceUrl{}).Where("environment = ? AND is_active = ?", env, true).Count(&count).Error
	return count, err
}

func (r *ServiceUrlRepository) FindAllActiveByEnv(env string) ([]model.ServiceUrl, error) {
	var results []model.ServiceUrl
	err := r.db.Where("environment = ? AND is_active = ?", env, true).Find(&results).Error
	return results, err
}
