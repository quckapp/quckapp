package service

import (
	"github.com/quckapp/service-urls-api/internal/model"
	"github.com/quckapp/service-urls-api/internal/repository"
)

type FirebaseService struct {
	repo *repository.FirebaseRepository
}

func NewFirebaseService(repo *repository.FirebaseRepository) *FirebaseService {
	return &FirebaseService{repo: repo}
}

func (s *FirebaseService) Get(env string) (*model.FirebaseConfig, error) {
	fb, err := s.repo.FindByEnv(env)
	if err != nil {
		return nil, err
	}
	fb.MaskPrivateKey()
	return fb, nil
}

func (s *FirebaseService) Upsert(fb *model.FirebaseConfig) error {
	return s.repo.Upsert(fb)
}

func (s *FirebaseService) Exists(env string) (bool, error) {
	return s.repo.ExistsByEnv(env)
}
