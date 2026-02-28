package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InfrastructureConfig struct {
	ID               uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	Environment      string    `gorm:"type:varchar(20);not null;uniqueIndex:idx_infra_env_key" json:"environment"`
	InfraKey         string    `gorm:"type:varchar(100);not null;uniqueIndex:idx_infra_env_key" json:"infraKey"`
	Host             string    `gorm:"type:varchar(255);not null" json:"host"`
	Port             int       `gorm:"not null" json:"port"`
	Username         string    `gorm:"type:varchar(100)" json:"username,omitempty"`
	ConnectionString string    `gorm:"type:varchar(500)" json:"connectionString,omitempty"`
	IsActive         bool      `gorm:"default:true" json:"isActive"`
	UpdatedBy        string    `gorm:"type:varchar(100)" json:"updatedBy"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

func (i *InfrastructureConfig) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}
