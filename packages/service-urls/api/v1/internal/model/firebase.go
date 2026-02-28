package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FirebaseConfig struct {
	ID               uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	Environment      string    `gorm:"type:varchar(20);uniqueIndex;not null" json:"environment"`
	ProjectID        string    `gorm:"type:varchar(100);not null" json:"projectId"`
	ClientEmail      string    `gorm:"type:varchar(255);not null" json:"clientEmail"`
	PrivateKey       string    `gorm:"type:text" json:"-"`
	PrivateKeyMasked string    `gorm:"-" json:"privateKeyMasked,omitempty"`
	StorageBucket    string    `gorm:"type:varchar(255)" json:"storageBucket"`
	IsActive         bool      `gorm:"default:true" json:"isActive"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

func (f *FirebaseConfig) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}

func (f *FirebaseConfig) MaskPrivateKey() {
	if f.PrivateKey != "" {
		if len(f.PrivateKey) > 20 {
			f.PrivateKeyMasked = f.PrivateKey[:10] + "..." + f.PrivateKey[len(f.PrivateKey)-10:]
		} else {
			f.PrivateKeyMasked = "***"
		}
	}
}
