package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/quckapp/service-urls-api/internal/model"
	"github.com/quckapp/service-urls-api/internal/repository"
)

type VersionService struct {
	versionRepo *repository.VersionRepository
	profileRepo *repository.VersionProfileRepository
}

func NewVersionService(
	versionRepo *repository.VersionRepository,
	profileRepo *repository.VersionProfileRepository,
) *VersionService {
	return &VersionService{
		versionRepo: versionRepo,
		profileRepo: profileRepo,
	}
}

func (s *VersionService) List(env string) ([]model.VersionConfig, error) {
	return s.versionRepo.FindByEnv(env)
}

func (s *VersionService) Create(env string, vc *model.VersionConfig) error {
	vc.Environment = env
	vc.Status = model.StatusPlanned
	return s.versionRepo.Create(vc)
}

func (s *VersionService) Delete(env, serviceKey, ver string) error {
	return s.versionRepo.Delete(env, serviceKey, ver)
}

// ── Status Transitions ──

func (s *VersionService) MarkReady(env, serviceKey, ver string) (*model.VersionConfig, error) {
	vc, err := s.versionRepo.FindOne(env, serviceKey, ver)
	if err != nil {
		return nil, err
	}
	if vc.Status != model.StatusPlanned {
		return nil, fmt.Errorf("cannot mark ready: current status is %s (expected PLANNED)", vc.Status)
	}
	vc.Status = model.StatusReady
	if err := s.versionRepo.UpdateStatus(vc); err != nil {
		return nil, err
	}
	return vc, nil
}

func (s *VersionService) Activate(env, serviceKey, ver string) (*model.VersionConfig, error) {
	vc, err := s.versionRepo.FindOne(env, serviceKey, ver)
	if err != nil {
		return nil, err
	}
	if vc.Status != model.StatusReady {
		return nil, fmt.Errorf("cannot activate: current status is %s (expected READY)", vc.Status)
	}
	vc.Status = model.StatusActive
	vc.DeprecatedAt = nil
	if err := s.versionRepo.UpdateStatus(vc); err != nil {
		return nil, err
	}
	return vc, nil
}

func (s *VersionService) Deprecate(env, serviceKey, ver string) (*model.VersionConfig, error) {
	vc, err := s.versionRepo.FindOne(env, serviceKey, ver)
	if err != nil {
		return nil, err
	}
	if vc.Status != model.StatusActive {
		return nil, fmt.Errorf("cannot deprecate: current status is %s (expected ACTIVE)", vc.Status)
	}
	now := time.Now()
	vc.Status = model.StatusDeprecated
	vc.DeprecatedAt = &now
	if err := s.versionRepo.UpdateStatus(vc); err != nil {
		return nil, err
	}
	return vc, nil
}

func (s *VersionService) Disable(env, serviceKey, ver string) (*model.VersionConfig, error) {
	vc, err := s.versionRepo.FindOne(env, serviceKey, ver)
	if err != nil {
		return nil, err
	}
	if vc.Status != model.StatusDeprecated && vc.Status != model.StatusSunset {
		return nil, fmt.Errorf("cannot disable: current status is %s (expected DEPRECATED or SUNSET)", vc.Status)
	}
	vc.Status = model.StatusDisabled
	if err := s.versionRepo.UpdateStatus(vc); err != nil {
		return nil, err
	}
	return vc, nil
}

// ── Bulk Operations ──

func (s *VersionService) BulkPlan(env, apiVersion string, serviceKeys []string, changelog string) error {
	vcs := make([]model.VersionConfig, 0, len(serviceKeys))
	for _, sk := range serviceKeys {
		vcs = append(vcs, model.VersionConfig{
			Environment:    env,
			ServiceKey:     sk,
			ApiVersion:     apiVersion,
			ReleaseVersion: "0.0.0",
			Status:         model.StatusPlanned,
			Changelog:      changelog,
		})
	}
	return s.versionRepo.BulkCreate(vcs)
}

func (s *VersionService) BulkActivate(env, apiVersion string) error {
	return s.versionRepo.ActivateAllReady(env, apiVersion)
}

// ── Global Config ──

func (s *VersionService) GetGlobalConfig(env string) (*model.GlobalVersionConfig, error) {
	return s.versionRepo.FindGlobalConfig(env)
}

func (s *VersionService) UpdateGlobalConfig(env string, gc *model.GlobalVersionConfig) error {
	gc.Environment = env
	return s.versionRepo.UpsertGlobalConfig(gc)
}

// ── Export ──

func (s *VersionService) ExportEnvFile(env string) (string, error) {
	versions, err := s.versionRepo.FindByEnv(env)
	if err != nil {
		return "", err
	}
	var b strings.Builder
	for _, v := range versions {
		if v.Status == model.StatusActive {
			key := strings.ToUpper(strings.ReplaceAll(v.ServiceKey, "-", "_")) + "_VERSION"
			b.WriteString(fmt.Sprintf("%s=%s\n", key, v.ApiVersion))
		}
	}
	return b.String(), nil
}
