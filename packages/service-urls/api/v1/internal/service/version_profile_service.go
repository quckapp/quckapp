package service

import (
	"fmt"

	"github.com/quckapp/service-urls-api/internal/model"
	"github.com/quckapp/service-urls-api/internal/repository"
)

type VersionProfileService struct {
	profileRepo *repository.VersionProfileRepository
	versionRepo *repository.VersionRepository
}

func NewVersionProfileService(
	profileRepo *repository.VersionProfileRepository,
	versionRepo *repository.VersionRepository,
) *VersionProfileService {
	return &VersionProfileService{
		profileRepo: profileRepo,
		versionRepo: versionRepo,
	}
}

func (s *VersionProfileService) ListProfiles() ([]model.VersionProfile, error) {
	return s.profileRepo.FindAll()
}

func (s *VersionProfileService) CreateProfile(profile *model.VersionProfile) error {
	return s.profileRepo.Create(profile)
}

func (s *VersionProfileService) ApplyProfile(profileID, env string) (int, error) {
	profile, err := s.profileRepo.FindByID(profileID)
	if err != nil {
		return 0, fmt.Errorf("profile not found: %w", err)
	}

	vcs := make([]model.VersionConfig, 0, len(profile.Entries))
	for _, entry := range profile.Entries {
		vcs = append(vcs, model.VersionConfig{
			Environment:    env,
			ServiceKey:     entry.ServiceKey,
			ApiVersion:     entry.ApiVersion,
			ReleaseVersion: entry.ReleaseVersion,
			Status:         model.StatusPlanned,
		})
	}

	if err := s.versionRepo.BulkCreate(vcs); err != nil {
		return 0, err
	}
	return len(vcs), nil
}
