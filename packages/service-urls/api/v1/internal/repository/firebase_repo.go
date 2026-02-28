package repository

import (
	"github.com/quckapp/service-urls-api/internal/model"
	"gorm.io/gorm"
)

type FirebaseRepository struct {
	db *gorm.DB
}

func NewFirebaseRepository(db *gorm.DB) *FirebaseRepository {
	return &FirebaseRepository{db: db}
}

func (r *FirebaseRepository) FindByEnv(env string) (*model.FirebaseConfig, error) {
	var result model.FirebaseConfig
	err := r.db.Where("environment = ?", env).First(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *FirebaseRepository) Upsert(f *model.FirebaseConfig) error {
	var existing model.FirebaseConfig
	err := r.db.Where("environment = ?", f.Environment).First(&existing).Error
	if err == gorm.ErrRecordNotFound {
		return r.db.Create(f).Error
	}
	if err != nil {
		return err
	}
	f.ID = existing.ID
	return r.db.Save(f).Error
}

func (r *FirebaseRepository) ExistsByEnv(env string) (bool, error) {
	var count int64
	err := r.db.Model(&model.FirebaseConfig{}).Where("environment = ?", env).Count(&count).Error
	return count > 0, err
}
