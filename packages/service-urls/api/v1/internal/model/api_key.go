package model

import (
	"crypto/sha256"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ApiKey struct {
	ID          uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	KeyHash     string    `gorm:"type:varchar(64);not null;index" json:"-"`
	Name        string    `gorm:"type:varchar(100);not null" json:"name"`
	Environment string    `gorm:"type:varchar(20)" json:"environment,omitempty"`
	IsActive    bool      `gorm:"default:true" json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
}

func (a *ApiKey) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

func HashKey(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("%x", h)
}
