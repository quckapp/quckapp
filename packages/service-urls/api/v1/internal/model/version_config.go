package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type VersionStatus string

const (
	StatusPlanned    VersionStatus = "PLANNED"
	StatusReady      VersionStatus = "READY"
	StatusActive     VersionStatus = "ACTIVE"
	StatusDeprecated VersionStatus = "DEPRECATED"
	StatusSunset     VersionStatus = "SUNSET"
	StatusDisabled   VersionStatus = "DISABLED"
)

type VersionConfig struct {
	ID                uuid.UUID     `gorm:"type:char(36);primaryKey" json:"id"`
	Environment       string        `gorm:"type:varchar(20);not null;uniqueIndex:idx_env_svc_ver" json:"environment"`
	ServiceKey        string        `gorm:"type:varchar(100);not null;uniqueIndex:idx_env_svc_ver" json:"serviceKey"`
	ApiVersion        string        `gorm:"type:varchar(20);not null;uniqueIndex:idx_env_svc_ver" json:"apiVersion"`
	ReleaseVersion    string        `gorm:"type:varchar(30);not null" json:"releaseVersion"`
	Status            VersionStatus `gorm:"type:varchar(20);not null;default:PLANNED" json:"status"`
	SunsetDate        *time.Time    `json:"sunsetDate"`
	SunsetDurationDays *int         `json:"sunsetDurationDays"`
	DeprecatedAt      *time.Time    `json:"deprecatedAt"`
	Changelog         string        `gorm:"type:text" json:"changelog"`
	UpdatedBy         string        `gorm:"type:varchar(100)" json:"updatedBy"`
	CreatedAt         time.Time     `json:"createdAt"`
	UpdatedAt         time.Time     `json:"updatedAt"`
}

func (vc *VersionConfig) BeforeCreate(tx *gorm.DB) error {
	if vc.ID == uuid.Nil {
		vc.ID = uuid.New()
	}
	return nil
}

type GlobalVersionConfig struct {
	ID                uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	Environment       string    `gorm:"type:varchar(20);not null;uniqueIndex" json:"environment"`
	DefaultApiVersion string    `gorm:"type:varchar(20);not null" json:"defaultApiVersion"`
	DefaultSunsetDays int       `gorm:"default:90" json:"defaultSunsetDays"`
	UpdatedBy         string    `gorm:"type:varchar(100)" json:"updatedBy"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

func (gc *GlobalVersionConfig) BeforeCreate(tx *gorm.DB) error {
	if gc.ID == uuid.Nil {
		gc.ID = uuid.New()
	}
	return nil
}
