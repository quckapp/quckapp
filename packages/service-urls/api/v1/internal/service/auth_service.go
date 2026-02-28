package service

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type AuthService struct {
	jwtSecret string
}

func NewAuthService(jwtSecret string) *AuthService {
	return &AuthService{jwtSecret: jwtSecret}
}

type LoginRequest struct {
	PhoneNumber string `json:"phoneNumber" binding:"required"`
	Password    string `json:"password" binding:"required"`
}

type LoginResponse struct {
	AccessToken string    `json:"accessToken"`
	User        AdminUser `json:"user"`
}

type AdminUser struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	PhoneNumber string `json:"phoneNumber"`
	Role        string `json:"role"`
}

func (s *AuthService) Login(req LoginRequest) (*LoginResponse, error) {
	adminPhone := os.Getenv("ADMIN_PHONE")
	adminPass := os.Getenv("ADMIN_PASSWORD")
	if adminPhone == "" {
		adminPhone = "+1234567890"
	}
	if adminPass == "" {
		adminPass = "admin123"
	}

	if req.PhoneNumber != adminPhone || req.Password != adminPass {
		return nil, errors.New("invalid credentials")
	}

	adminID := os.Getenv("ADMIN_USER_ID")
	if adminID == "" {
		adminID = uuid.New().String()
	}

	user := AdminUser{
		ID:          adminID,
		DisplayName: "Admin",
		PhoneNumber: req.PhoneNumber,
		Role:        "super_admin",
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{AccessToken: token, User: user}, nil
}

func (s *AuthService) generateToken(user AdminUser) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.PhoneNumber,
		"iss":   "quckapp-auth",
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) GetProfile(userID string) *AdminUser {
	return &AdminUser{
		ID:          userID,
		DisplayName: "Admin",
		PhoneNumber: os.Getenv("ADMIN_PHONE"),
		Role:        "super_admin",
	}
}
