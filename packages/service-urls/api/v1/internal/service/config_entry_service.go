package service

import (
	"github.com/quckapp/service-urls-api/internal/model"
	"github.com/quckapp/service-urls-api/internal/repository"
)

type ConfigEntryService struct {
	repo *repository.ConfigEntryRepository
}

func NewConfigEntryService(repo *repository.ConfigEntryRepository) *ConfigEntryService {
	return &ConfigEntryService{repo: repo}
}

// List returns config entries with secret values masked (for admin API).
func (s *ConfigEntryService) List(env, category string) ([]model.ConfigEntry, error) {
	entries, err := s.repo.FindByEnv(env, category)
	if err != nil {
		return nil, err
	}
	for i := range entries {
		entries[i].MaskValue()
	}
	return entries, nil
}

// FindAllActiveByEnv returns config entries with real values (for config API).
func (s *ConfigEntryService) FindAllActiveByEnv(env string) ([]model.ConfigEntry, error) {
	return s.repo.FindAllActiveByEnv(env)
}

// ListUnmasked returns config entries with real values (for clone/internal operations).
func (s *ConfigEntryService) ListUnmasked(env, category string) ([]model.ConfigEntry, error) {
	return s.repo.FindByEnv(env, category)
}

func (s *ConfigEntryService) Create(entry *model.ConfigEntry) error {
	return s.repo.Create(entry)
}

func (s *ConfigEntryService) Update(env, key string, updates *model.ConfigEntry) (*model.ConfigEntry, error) {
	existing, err := s.repo.FindByEnvAndKey(env, key)
	if err != nil {
		return nil, err
	}

	// If updating a secret and configValue is empty or masked, keep existing value
	if existing.IsSecret && (updates.ConfigValue == "" || updates.ConfigValue == "****") {
		updates.ConfigValue = existing.ConfigValue
	}

	updates.ID = existing.ID
	updates.Environment = env
	updates.ConfigKey = key
	if err := s.repo.Update(updates); err != nil {
		return nil, err
	}

	// Return the full entry from DB so the response reflects actual state
	return s.repo.FindByEnvAndKey(env, key)
}

func (s *ConfigEntryService) Delete(env, key string) error {
	return s.repo.Delete(env, key)
}

func (s *ConfigEntryService) CountByEnv(env string) (int64, error) {
	return s.repo.CountByEnv(env)
}
