package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type VersionProfile struct {
	ID          uuid.UUID             `gorm:"type:char(36);primaryKey" json:"id"`
	Name        string                `gorm:"type:varchar(100);not null" json:"name"`
	Description string                `gorm:"type:text" json:"description"`
	CreatedBy   string                `gorm:"type:varchar(100)" json:"createdBy"`
	CreatedAt   time.Time             `json:"createdAt"`
	Entries     []VersionProfileEntry `gorm:"foreignKey:ProfileID;constraint:OnDelete:CASCADE" json:"entries"`
}

func (vp *VersionProfile) BeforeCreate(tx *gorm.DB) error {
	if vp.ID == uuid.Nil {
		vp.ID = uuid.New()
	}
	return nil
}

type VersionProfileEntry struct {
	ID             uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	ProfileID      uuid.UUID `gorm:"type:char(36);not null;index" json:"profileId"`
	ServiceKey     string    `gorm:"type:varchar(100);not null" json:"serviceKey"`
	ApiVersion     string    `gorm:"type:varchar(20);not null" json:"apiVersion"`
	ReleaseVersion string    `gorm:"type:varchar(30);not null" json:"releaseVersion"`
}

func (e *VersionProfileEntry) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}
