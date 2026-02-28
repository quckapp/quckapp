package service

import (
	"github.com/quckapp/service-urls-api/internal/model"
	"github.com/quckapp/service-urls-api/internal/repository"
)

type InfrastructureService struct {
	repo *repository.InfrastructureRepository
}

func NewInfrastructureService(repo *repository.InfrastructureRepository) *InfrastructureService {
	return &InfrastructureService{repo: repo}
}

func (s *InfrastructureService) List(env string) ([]model.InfrastructureConfig, error) {
	return s.repo.FindByEnv(env)
}

func (s *InfrastructureService) Create(infra *model.InfrastructureConfig) error {
	return s.repo.Create(infra)
}

func (s *InfrastructureService) Update(env, key string, updates *model.InfrastructureConfig) error {
	existing, err := s.repo.FindByEnvAndKey(env, key)
	if err != nil {
		return err
	}
	updates.ID = existing.ID
	updates.Environment = env
	updates.InfraKey = key
	return s.repo.Update(updates)
}

func (s *InfrastructureService) Delete(env, key string) error {
	return s.repo.Delete(env, key)
}

func (s *InfrastructureService) CountByEnv(env string) (int64, error) {
	return s.repo.CountByEnv(env)
}
