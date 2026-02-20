package models

// ── API Response wrapper ──

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// ── Auth ──

type LoginRequest struct {
	PhoneNumber string `json:"phoneNumber" binding:"required"`
	Password    string `json:"password" binding:"required"`
}

type LoginResponse struct {
	AccessToken string    `json:"accessToken"`
	User        AdminUser `json:"user"`
}

// ── Service URLs ──

type CreateServiceRequest struct {
	ServiceKey  string `json:"serviceKey" binding:"required"`
	Category    string `json:"category" binding:"required"`
	URL         string `json:"url" binding:"required"`
	Description string `json:"description"`
}

type UpdateServiceRequest struct {
	URL         *string `json:"url"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"isActive"`
}

// ── Infrastructure ──

type CreateInfraRequest struct {
	InfraKey         string  `json:"infraKey" binding:"required"`
	Host             string  `json:"host" binding:"required"`
	Port             int     `json:"port" binding:"required"`
	Username         *string `json:"username"`
	Password         *string `json:"password"`
	ConnectionString *string `json:"connectionString"`
}

type UpdateInfraRequest struct {
	Host             *string `json:"host"`
	Port             *int    `json:"port"`
	Username         *string `json:"username"`
	Password         *string `json:"password"`
	ConnectionString *string `json:"connectionString"`
	IsActive         *bool   `json:"isActive"`
}

// ── Firebase ──

type UpsertFirebaseRequest struct {
	ProjectID     *string `json:"projectId"`
	ClientEmail   *string `json:"clientEmail"`
	PrivateKey    *string `json:"privateKey"`
	StorageBucket *string `json:"storageBucket"`
}

// ── Secrets ──

type UpsertSecretRequest struct {
	SecretKey   string `json:"secretKey"`
	Category    string `json:"category" binding:"required"`
	Value       string `json:"value" binding:"required"`
	Description string `json:"description"`
	IsRequired  *bool  `json:"isRequired"`
}

type UpsertSecretsBatchRequest struct {
	Secrets []UpsertSecretRequest `json:"secrets" binding:"required"`
}

// ── Bulk operations ──

type BulkImportRequest struct {
	Services       []CreateServiceRequest `json:"services"`
	Infrastructure []CreateInfraRequest   `json:"infrastructure"`
}

type BulkExportResponse struct {
	Environment    string                 `json:"environment"`
	Services       []ServiceUrlConfig     `json:"services"`
	Infrastructure []InfrastructureConfig `json:"infrastructure"`
	Secrets        []SecretConfig         `json:"secrets"`
	Firebase       *FirebaseConfig        `json:"firebase"`
}

type CloneRequest struct {
	SourceEnvironment string `json:"sourceEnvironment" binding:"required"`
	TargetEnvironment string `json:"targetEnvironment" binding:"required"`
	Overwrite         bool   `json:"overwrite"`
}
