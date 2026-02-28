package service

import (
	"github.com/quckapp/service-urls-api/internal/model"
	"github.com/quckapp/service-urls-api/internal/repository"
)

type ServiceUrlService struct {
	repo *repository.ServiceUrlRepository
}

func NewServiceUrlService(repo *repository.ServiceUrlRepository) *ServiceUrlService {
	return &ServiceUrlService{repo: repo}
}

func (s *ServiceUrlService) List(env, category string) ([]model.ServiceUrl, error) {
	return s.repo.FindByEnv(env, category)
}

func (s *ServiceUrlService) Create(svc *model.ServiceUrl) error {
	return s.repo.Create(svc)
}

func (s *ServiceUrlService) Update(env, key string, updates *model.ServiceUrl) error {
	existing, err := s.repo.FindByEnvAndKey(env, key)
	if err != nil {
		return err
	}
	updates.ID = existing.ID
	updates.Environment = env
	updates.ServiceKey = key
	return s.repo.Update(updates)
}

func (s *ServiceUrlService) Delete(env, key string) error {
	return s.repo.Delete(env, key)
}

func (s *ServiceUrlService) CountByEnv(env string) (int64, error) {
	return s.repo.CountByEnv(env)
}
