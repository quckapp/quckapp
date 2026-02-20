package models

import "time"

type ServiceUrlConfig struct {
	ID          string    `db:"id" json:"id"`
	Environment string    `db:"environment" json:"environment"`
	ServiceKey  string    `db:"service_key" json:"serviceKey"`
	Category    string    `db:"category" json:"category"`
	URL         string    `db:"url" json:"url"`
	Description string    `db:"description" json:"description"`
	IsActive    bool      `db:"is_active" json:"isActive"`
	UpdatedBy   *string   `db:"updated_by" json:"updatedBy"`
	CreatedAt   time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt   time.Time `db:"updated_at" json:"updatedAt"`
}

type InfrastructureConfig struct {
	ID               string    `db:"id" json:"id"`
	Environment      string    `db:"environment" json:"environment"`
	InfraKey         string    `db:"infra_key" json:"infraKey"`
	Host             string    `db:"host" json:"host"`
	Port             int       `db:"port" json:"port"`
	Username         *string   `db:"username" json:"username"`
	PasswordEnc      *string   `db:"password_encrypted" json:"-"`
	ConnectionString *string   `db:"connection_string" json:"connectionString"`
	IsActive         bool      `db:"is_active" json:"isActive"`
	UpdatedBy        *string   `db:"updated_by" json:"updatedBy"`
	CreatedAt        time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt        time.Time `db:"updated_at" json:"updatedAt"`
}

type FirebaseConfig struct {
	ID              string    `db:"id" json:"id"`
	Environment     string    `db:"environment" json:"environment"`
	ProjectID       *string   `db:"project_id" json:"projectId"`
	ClientEmail     *string   `db:"client_email" json:"clientEmail"`
	PrivateKeyEnc   *string   `db:"private_key_encrypted" json:"-"`
	PrivateKeyMask  string    `json:"privateKeyMasked"`
	StorageBucket   *string   `db:"storage_bucket" json:"storageBucket"`
	IsActive        bool      `db:"is_active" json:"isActive"`
	UpdatedBy       *string   `db:"updated_by" json:"updatedBy"`
	CreatedAt       time.Time `db:"created_at" json:"-"`
	UpdatedAt       time.Time `db:"updated_at" json:"updatedAt"`
}

type SecretConfig struct {
	ID          string    `db:"id" json:"id"`
	Environment string    `db:"environment" json:"environment"`
	SecretKey   string    `db:"secret_key" json:"secretKey"`
	Category    string    `db:"category" json:"category"`
	ValueEnc    *string   `db:"value_encrypted" json:"-"`
	Value       string    `json:"value"`
	ValueMasked *string   `db:"value_masked" json:"valueMasked"`
	Description *string   `db:"description" json:"description"`
	IsRequired  bool      `db:"is_required" json:"isRequired"`
	IsActive    bool      `db:"is_active" json:"isActive"`
	UpdatedBy   *string   `db:"updated_by" json:"updatedBy"`
	CreatedAt   time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt   time.Time `db:"updated_at" json:"updatedAt"`
}

type ConfigAPIKey struct {
	ID           string     `db:"id" json:"id"`
	KeyHash      string     `db:"key_hash" json:"-"`
	KeyPrefix    string     `db:"key_prefix" json:"keyPrefix"`
	Name         string     `db:"name" json:"name"`
	Description  *string    `db:"description" json:"description"`
	ServiceName  *string    `db:"service_name" json:"serviceName"`
	Environments []string   `json:"environments"`
	Scopes       []string   `json:"scopes"`
	IsActive     bool       `db:"is_active" json:"isActive"`
	ExpiresAt    *time.Time `db:"expires_at" json:"expiresAt"`
	LastUsedAt   *time.Time `db:"last_used_at" json:"lastUsedAt"`
	CreatedBy    *string    `json:"createdBy"`
	CreatedAt    time.Time  `db:"created_at" json:"createdAt"`
	UpdatedAt    time.Time  `db:"updated_at" json:"updatedAt"`
}

type CreateAPIKeyRequest struct {
	Name         string   `json:"name" binding:"required"`
	Description  string   `json:"description"`
	ServiceName  string   `json:"serviceName"`
	Environments []string `json:"environments"`
}

type CreateAPIKeyResponse struct {
	Key    string       `json:"key"`
	APIKey ConfigAPIKey `json:"apiKey"`
}

type EnvironmentSummary struct {
	Environment  string  `json:"environment"`
	ServiceCount int     `json:"serviceCount"`
	InfraCount   int     `json:"infraCount"`
	SecretCount  int     `json:"secretCount"`
	HasFirebase  bool    `json:"hasFirebase"`
	LastUpdated  *string `json:"lastUpdated"`
}

type AdminUser struct {
	ID           string     `db:"id" json:"id"`
	PhoneNumber  string     `db:"phone_number" json:"phoneNumber"`
	PasswordHash string     `db:"password_hash" json:"-"`
	DisplayName  string     `db:"display_name" json:"displayName"`
	Email        *string    `db:"email" json:"email"`
	Role         string     `db:"role" json:"role"`
	AvatarURL    *string    `db:"avatar_url" json:"avatarUrl"`
	IsActive     bool       `db:"is_active" json:"isActive"`
	LastLoginAt  *time.Time `db:"last_login_at" json:"lastLoginAt"`
	CreatedAt    time.Time  `db:"created_at" json:"createdAt"`
	UpdatedAt    time.Time  `db:"updated_at" json:"updatedAt"`
}
