package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ServiceUrl struct {
	ID          uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	Environment string    `gorm:"type:varchar(20);not null;uniqueIndex:idx_env_key" json:"environment"`
	ServiceKey  string    `gorm:"type:varchar(100);not null;uniqueIndex:idx_env_key" json:"serviceKey"`
	Category    string    `gorm:"type:varchar(20);not null" json:"category"`
	URL         string    `gorm:"type:varchar(500);not null;column:url" json:"url"`
	Description string    `gorm:"type:text" json:"description"`
	IsActive    bool      `gorm:"default:true" json:"isActive"`
	UpdatedBy   string    `gorm:"type:varchar(100)" json:"updatedBy"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (s *ServiceUrl) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
