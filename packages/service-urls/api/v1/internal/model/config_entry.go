package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ConfigCategory string

// Tech Stack categories
const (
	CategorySpringBoot ConfigCategory = "SPRING_BOOT"
	CategoryNestJS     ConfigCategory = "NESTJS"
	CategoryElixir     ConfigCategory = "ELIXIR"
	CategoryGoServices ConfigCategory = "GO_SERVICES"
	CategoryPythonML   ConfigCategory = "PYTHON_ML"
)

// Per-Database categories
const (
	CategoryPostgres      ConfigCategory = "POSTGRES"
	CategoryMySQL         ConfigCategory = "MYSQL"
	CategoryMongoDB       ConfigCategory = "MONGODB"
	CategoryRedis         ConfigCategory = "REDIS"
	CategoryElasticsearch ConfigCategory = "ELASTICSEARCH"
	CategoryClickHouse    ConfigCategory = "CLICKHOUSE"
	CategoryKafka         ConfigCategory = "KAFKA"
	CategoryRabbitMQ      ConfigCategory = "RABBITMQ"
)

// Cloud Provider categories
const (
	CategoryAWS          ConfigCategory = "AWS"
	CategoryAzure        ConfigCategory = "AZURE"
	CategoryGCP          ConfigCategory = "GCP"
	CategoryCloudStorage ConfigCategory = "CLOUD_STORAGE"
)

// Orchestration categories
const (
	CategoryDocker     ConfigCategory = "DOCKER"
	CategoryKubernetes ConfigCategory = "KUBERNETES"
	CategoryPods       ConfigCategory = "PODS"
)

// Cross-cutting categories
const (
	CategorySecurity    ConfigCategory = "SECURITY"
	CategoryWebRTC      ConfigCategory = "WEBRTC"
	CategoryOAuth       ConfigCategory = "OAUTH"
	CategorySMTP        ConfigCategory = "SMTP"
	CategoryMonitoring  ConfigCategory = "MONITORING"
	CategoryFirebase    ConfigCategory = "FIREBASE"
	CategoryExternalAPI ConfigCategory = "EXTERNAL_API"
	CategoryInfra       ConfigCategory = "INFRA"
)

type ConfigEntry struct {
	ID          uuid.UUID      `gorm:"type:char(36);primaryKey" json:"id"`
	Environment string         `gorm:"type:varchar(20);not null;uniqueIndex:idx_env_config_key" json:"environment"`
	Category    ConfigCategory `gorm:"type:varchar(30);not null" json:"category"`
	ConfigKey   string         `gorm:"type:varchar(100);not null;uniqueIndex:idx_env_config_key" json:"configKey"`
	ConfigValue string         `gorm:"type:text;not null" json:"configValue"`
	IsSecret    bool           `gorm:"default:false" json:"isSecret"`
	Description string         `gorm:"type:text" json:"description"`
	IsActive    bool           `gorm:"default:true" json:"isActive"`
	UpdatedBy   string         `gorm:"type:varchar(100)" json:"updatedBy"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}

func (e *ConfigEntry) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}

func (e *ConfigEntry) MaskValue() {
	if e.IsSecret && e.ConfigValue != "" {
		e.ConfigValue = "****"
	}
}
