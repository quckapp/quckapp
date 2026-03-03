package service

import (
	"fmt"
	"strings"

	"github.com/quckapp/service-urls-api/internal/repository"
)

type ConfigService struct {
	serviceUrlRepo   *repository.ServiceUrlRepository
	infraRepo        *repository.InfrastructureRepository
	firebaseRepo     *repository.FirebaseRepository
	configEntryRepo  *repository.ConfigEntryRepository
}

func NewConfigService(
	serviceUrlRepo *repository.ServiceUrlRepository,
	infraRepo *repository.InfrastructureRepository,
	firebaseRepo *repository.FirebaseRepository,
	configEntryRepo *repository.ConfigEntryRepository,
) *ConfigService {
	return &ConfigService{
		serviceUrlRepo:  serviceUrlRepo,
		infraRepo:       infraRepo,
		firebaseRepo:    firebaseRepo,
		configEntryRepo: configEntryRepo,
	}
}

func (s *ConfigService) GetFlatConfig(env string) (map[string]string, error) {
	result := make(map[string]string)

	services, err := s.serviceUrlRepo.FindAllActiveByEnv(env)
	if err != nil {
		return nil, fmt.Errorf("failed to load service urls: %w", err)
	}
	for _, svc := range services {
		result[svc.ServiceKey] = svc.URL
	}

	infra, err := s.infraRepo.FindByEnv(env)
	if err != nil {
		return nil, fmt.Errorf("failed to load infrastructure: %w", err)
	}
	for _, i := range infra {
		result[i.InfraKey+"_HOST"] = i.Host
		result[i.InfraKey+"_PORT"] = fmt.Sprintf("%d", i.Port)
		if i.Username != "" {
			result[i.InfraKey+"_USERNAME"] = i.Username
		}
		if i.ConnectionString != "" {
			result[i.InfraKey+"_CONNECTION_STRING"] = i.ConnectionString
		}
	}

	fb, err := s.firebaseRepo.FindByEnv(env)
	if err == nil && fb != nil {
		result["FIREBASE_PROJECT_ID"] = fb.ProjectID
		result["FIREBASE_CLIENT_EMAIL"] = fb.ClientEmail
		result["FIREBASE_PRIVATE_KEY"] = fb.PrivateKey
		result["FIREBASE_STORAGE_BUCKET"] = fb.StorageBucket
	}

	// Config entries loaded last — can override any colliding keys (intentional escape hatch)
	entries, err := s.configEntryRepo.FindAllActiveByEnv(env)
	if err != nil {
		return nil, fmt.Errorf("failed to load config entries: %w", err)
	}
	for _, e := range entries {
		result[e.ConfigKey] = e.ConfigValue
	}

	return result, nil
}

func FormatEnvFile(config map[string]string) string {
	var b strings.Builder
	for k, v := range config {
		if strings.ContainsAny(v, " \t=:#\"'\\") {
			b.WriteString(fmt.Sprintf("%s=\"%s\"\n", k, strings.ReplaceAll(v, "\"", "\\\"")))
		} else {
			b.WriteString(fmt.Sprintf("%s=%s\n", k, v))
		}
	}
	return b.String()
}

func FormatDockerCompose(config map[string]string) string {
	var b strings.Builder
	b.WriteString("environment:\n")
	for k, v := range config {
		b.WriteString(fmt.Sprintf("  %s: \"%s\"\n", k, strings.ReplaceAll(v, "\"", "\\\"")))
	}
	return b.String()
}

func (s *ConfigService) GetSingleValue(env, key string) (string, error) {
	config, err := s.GetFlatConfig(env)
	if err != nil {
		return "", err
	}
	val, ok := config[key]
	if !ok {
		return "", fmt.Errorf("key %q not found in environment %q", key, env)
	}
	return val, nil
}
