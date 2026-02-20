package repository

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/quckapp/service-urls-api/internal/models"
)

type Repository struct {
	db *sqlx.DB
}

func New(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func newBinUUID() []byte {
	id := uuid.New()
	return id[:]
}

func binToUUID(b []byte) string {
	if len(b) != 16 {
		return ""
	}
	u, err := uuid.FromBytes(b)
	if err != nil {
		return ""
	}
	return u.String()
}

// ── Admin Users ──

func (r *Repository) GetUserByPhone(phone string) (*models.AdminUser, error) {
	var raw struct {
		ID           []byte `db:"id"`
		PhoneNumber  string `db:"phone_number"`
		PasswordHash string `db:"password_hash"`
		DisplayName  string `db:"display_name"`
		Email        *string `db:"email"`
		Role         string `db:"role"`
		IsActive     bool   `db:"is_active"`
	}
	err := r.db.Get(&raw, "SELECT id, phone_number, password_hash, display_name, email, role, is_active FROM admin_users WHERE phone_number = ?", phone)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &models.AdminUser{
		ID:           binToUUID(raw.ID),
		PhoneNumber:  raw.PhoneNumber,
		PasswordHash: raw.PasswordHash,
		DisplayName:  raw.DisplayName,
		Email:        raw.Email,
		Role:         raw.Role,
		IsActive:     raw.IsActive,
	}, nil
}

func (r *Repository) GetUserByID(id string) (*models.AdminUser, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}
	var raw struct {
		ID          []byte  `db:"id"`
		PhoneNumber string  `db:"phone_number"`
		DisplayName string  `db:"display_name"`
		Email       *string `db:"email"`
		Role        string  `db:"role"`
		IsActive    bool    `db:"is_active"`
	}
	err = r.db.Get(&raw, "SELECT id, phone_number, display_name, email, role, is_active FROM admin_users WHERE id = ?", uid[:])
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &models.AdminUser{
		ID:          binToUUID(raw.ID),
		PhoneNumber: raw.PhoneNumber,
		DisplayName: raw.DisplayName,
		Email:       raw.Email,
		Role:        raw.Role,
		IsActive:    raw.IsActive,
	}, nil
}

// ── Environment Summary ──

func (r *Repository) GetEnvironmentSummaries(envs []string) ([]models.EnvironmentSummary, error) {
	summaries := make([]models.EnvironmentSummary, 0, len(envs))
	for _, env := range envs {
		var svcCount, infraCount, secretCount int
		var hasFb int
		var lastUpdated *string

		r.db.Get(&svcCount, "SELECT COUNT(*) FROM service_url_configs WHERE environment = ?", env)
		r.db.Get(&infraCount, "SELECT COUNT(*) FROM infrastructure_configs WHERE environment = ?", env)
		r.db.Get(&secretCount, "SELECT COUNT(*) FROM secret_configs WHERE environment = ?", env)
		r.db.Get(&hasFb, "SELECT COUNT(*) FROM firebase_configs WHERE environment = ?", env)
		r.db.Get(&lastUpdated, "SELECT MAX(updated_at) FROM service_url_configs WHERE environment = ?", env)

		summaries = append(summaries, models.EnvironmentSummary{
			Environment:  env,
			ServiceCount: svcCount,
			InfraCount:   infraCount,
			SecretCount:  secretCount,
			HasFirebase:  hasFb > 0,
			LastUpdated:  lastUpdated,
		})
	}
	return summaries, nil
}

// ── Service URL Configs ──

type serviceURLRow struct {
	ID          []byte  `db:"id"`
	Environment string  `db:"environment"`
	ServiceKey  string  `db:"service_key"`
	Category    string  `db:"category"`
	URL         string  `db:"url"`
	Description *string `db:"description"`
	IsActive    bool    `db:"is_active"`
	UpdatedBy   []byte  `db:"updated_by"`
	CreatedAt   string  `db:"created_at"`
	UpdatedAt   string  `db:"updated_at"`
}

func rowToService(row serviceURLRow) models.ServiceUrlConfig {
	desc := ""
	if row.Description != nil {
		desc = *row.Description
	}
	var ub *string
	if s := binToUUID(row.UpdatedBy); s != "" {
		ub = &s
	}
	return models.ServiceUrlConfig{
		ID:          binToUUID(row.ID),
		Environment: row.Environment,
		ServiceKey:  row.ServiceKey,
		Category:    row.Category,
		URL:         row.URL,
		Description: desc,
		IsActive:    row.IsActive,
		UpdatedBy:   ub,
	}
}

func (r *Repository) GetServicesByEnv(env string) ([]models.ServiceUrlConfig, error) {
	var rows []serviceURLRow
	err := r.db.Select(&rows, "SELECT id, environment, service_key, category, url, description, is_active, updated_by, created_at, updated_at FROM service_url_configs WHERE environment = ? ORDER BY category, service_key", env)
	if err != nil {
		return nil, err
	}
	out := make([]models.ServiceUrlConfig, len(rows))
	for i, row := range rows {
		out[i] = rowToService(row)
	}
	return out, nil
}

func (r *Repository) GetServicesByEnvAndCategory(env, category string) ([]models.ServiceUrlConfig, error) {
	var rows []serviceURLRow
	err := r.db.Select(&rows, "SELECT id, environment, service_key, category, url, description, is_active, updated_by, created_at, updated_at FROM service_url_configs WHERE environment = ? AND category = ? ORDER BY service_key", env, category)
	if err != nil {
		return nil, err
	}
	out := make([]models.ServiceUrlConfig, len(rows))
	for i, row := range rows {
		out[i] = rowToService(row)
	}
	return out, nil
}

func (r *Repository) GetService(env, key string) (*models.ServiceUrlConfig, error) {
	var row serviceURLRow
	err := r.db.Get(&row, "SELECT id, environment, service_key, category, url, description, is_active, updated_by, created_at, updated_at FROM service_url_configs WHERE environment = ? AND service_key = ?", env, key)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	svc := rowToService(row)
	return &svc, nil
}

func (r *Repository) UpsertService(env string, req models.CreateServiceRequest) (*models.ServiceUrlConfig, error) {
	id := newBinUUID()
	_, err := r.db.Exec(
		`INSERT INTO service_url_configs (id, environment, service_key, category, url, description, is_active)
		 VALUES (?, ?, ?, ?, ?, ?, TRUE)
		 ON DUPLICATE KEY UPDATE category=VALUES(category), url=VALUES(url), description=VALUES(description), is_active=TRUE`,
		id, env, req.ServiceKey, req.Category, req.URL, req.Description,
	)
	if err != nil {
		return nil, err
	}
	return r.GetService(env, req.ServiceKey)
}

func (r *Repository) UpdateService(env, key string, req models.UpdateServiceRequest) (*models.ServiceUrlConfig, error) {
	existing, err := r.GetService(env, key)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, nil
	}
	if req.URL != nil {
		existing.URL = *req.URL
	}
	if req.Description != nil {
		existing.Description = *req.Description
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}
	_, err = r.db.Exec(
		"UPDATE service_url_configs SET url=?, description=?, is_active=? WHERE environment=? AND service_key=?",
		existing.URL, existing.Description, existing.IsActive, env, key,
	)
	if err != nil {
		return nil, err
	}
	return r.GetService(env, key)
}

func (r *Repository) DeleteService(env, key string) error {
	_, err := r.db.Exec("DELETE FROM service_url_configs WHERE environment=? AND service_key=?", env, key)
	return err
}

// ── Infrastructure Configs ──

type infraRow struct {
	ID          []byte  `db:"id"`
	Environment string  `db:"environment"`
	InfraKey    string  `db:"infra_key"`
	Host        string  `db:"host"`
	Port        int     `db:"port"`
	Username    *string `db:"username"`
	PasswordEnc *string `db:"password_encrypted"`
	ConnString  *string `db:"connection_string"`
	IsActive    bool    `db:"is_active"`
	UpdatedBy   []byte  `db:"updated_by"`
	CreatedAt   string  `db:"created_at"`
	UpdatedAt   string  `db:"updated_at"`
}

func rowToInfra(row infraRow) models.InfrastructureConfig {
	var ub *string
	if s := binToUUID(row.UpdatedBy); s != "" {
		ub = &s
	}
	return models.InfrastructureConfig{
		ID:               binToUUID(row.ID),
		Environment:      row.Environment,
		InfraKey:         row.InfraKey,
		Host:             row.Host,
		Port:             row.Port,
		Username:         row.Username,
		ConnectionString: row.ConnString,
		IsActive:         row.IsActive,
		UpdatedBy:        ub,
	}
}

func (r *Repository) GetInfraByEnv(env string) ([]models.InfrastructureConfig, error) {
	var rows []infraRow
	err := r.db.Select(&rows, "SELECT id, environment, infra_key, host, port, username, password_encrypted, connection_string, is_active, updated_by, created_at, updated_at FROM infrastructure_configs WHERE environment = ? ORDER BY infra_key", env)
	if err != nil {
		return nil, err
	}
	out := make([]models.InfrastructureConfig, len(rows))
	for i, row := range rows {
		out[i] = rowToInfra(row)
	}
	return out, nil
}

func (r *Repository) GetInfra(env, key string) (*models.InfrastructureConfig, error) {
	var row infraRow
	err := r.db.Get(&row, "SELECT id, environment, infra_key, host, port, username, password_encrypted, connection_string, is_active, updated_by, created_at, updated_at FROM infrastructure_configs WHERE environment = ? AND infra_key = ?", env, key)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	infra := rowToInfra(row)
	return &infra, nil
}

func (r *Repository) UpsertInfra(env string, req models.CreateInfraRequest) (*models.InfrastructureConfig, error) {
	id := newBinUUID()
	_, err := r.db.Exec(
		`INSERT INTO infrastructure_configs (id, environment, infra_key, host, port, username, password_encrypted, connection_string, is_active)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
		 ON DUPLICATE KEY UPDATE host=VALUES(host), port=VALUES(port), username=VALUES(username), password_encrypted=COALESCE(VALUES(password_encrypted), password_encrypted), connection_string=VALUES(connection_string), is_active=TRUE`,
		id, env, req.InfraKey, req.Host, req.Port, req.Username, req.Password, req.ConnectionString,
	)
	if err != nil {
		return nil, err
	}
	return r.GetInfra(env, req.InfraKey)
}

func (r *Repository) UpdateInfra(env, key string, req models.UpdateInfraRequest) (*models.InfrastructureConfig, error) {
	existing, err := r.GetInfra(env, key)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, nil
	}
	if req.Host != nil {
		existing.Host = *req.Host
	}
	if req.Port != nil {
		existing.Port = *req.Port
	}
	if req.Username != nil {
		existing.Username = req.Username
	}
	if req.ConnectionString != nil {
		existing.ConnectionString = req.ConnectionString
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}
	query := "UPDATE infrastructure_configs SET host=?, port=?, username=?, connection_string=?, is_active=?"
	args := []interface{}{existing.Host, existing.Port, existing.Username, existing.ConnectionString, existing.IsActive}
	if req.Password != nil {
		query += ", password_encrypted=?"
		args = append(args, *req.Password)
	}
	query += " WHERE environment=? AND infra_key=?"
	args = append(args, env, key)
	_, err = r.db.Exec(query, args...)
	if err != nil {
		return nil, err
	}
	return r.GetInfra(env, key)
}

func (r *Repository) DeleteInfra(env, key string) error {
	_, err := r.db.Exec("DELETE FROM infrastructure_configs WHERE environment=? AND infra_key=?", env, key)
	return err
}

// ── Firebase Configs ──

type firebaseRow struct {
	ID            []byte  `db:"id"`
	Environment   string  `db:"environment"`
	ProjectID     *string `db:"project_id"`
	ClientEmail   *string `db:"client_email"`
	PrivateKeyEnc *string `db:"private_key_encrypted"`
	StorageBucket *string `db:"storage_bucket"`
	IsActive      bool    `db:"is_active"`
	UpdatedBy     []byte  `db:"updated_by"`
	CreatedAt     string  `db:"created_at"`
	UpdatedAt     string  `db:"updated_at"`
}

func rowToFirebase(row firebaseRow) models.FirebaseConfig {
	mask := ""
	if row.PrivateKeyEnc != nil && len(*row.PrivateKeyEnc) > 20 {
		pk := *row.PrivateKeyEnc
		mask = pk[:10] + "..." + pk[len(pk)-10:]
	} else if row.PrivateKeyEnc != nil {
		mask = "***"
	}
	return models.FirebaseConfig{
		ID:             binToUUID(row.ID),
		Environment:    row.Environment,
		ProjectID:      row.ProjectID,
		ClientEmail:    row.ClientEmail,
		PrivateKeyMask: mask,
		StorageBucket:  row.StorageBucket,
		IsActive:       row.IsActive,
	}
}

func (r *Repository) GetFirebase(env string) (*models.FirebaseConfig, error) {
	var row firebaseRow
	err := r.db.Get(&row, "SELECT id, environment, project_id, client_email, private_key_encrypted, storage_bucket, is_active, updated_by, created_at, updated_at FROM firebase_configs WHERE environment = ?", env)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	fb := rowToFirebase(row)
	return &fb, nil
}

func (r *Repository) UpsertFirebase(env string, req models.UpsertFirebaseRequest) (*models.FirebaseConfig, error) {
	existing, _ := r.GetFirebase(env)
	if existing == nil {
		id := newBinUUID()
		_, err := r.db.Exec(
			`INSERT INTO firebase_configs (id, environment, project_id, client_email, private_key_encrypted, storage_bucket, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
			id, env, req.ProjectID, req.ClientEmail, req.PrivateKey, req.StorageBucket,
		)
		if err != nil {
			return nil, err
		}
	} else {
		query := "UPDATE firebase_configs SET "
		args := []interface{}{}
		sets := []string{}
		if req.ProjectID != nil {
			sets = append(sets, "project_id=?")
			args = append(args, *req.ProjectID)
		}
		if req.ClientEmail != nil {
			sets = append(sets, "client_email=?")
			args = append(args, *req.ClientEmail)
		}
		if req.PrivateKey != nil {
			sets = append(sets, "private_key_encrypted=?")
			args = append(args, *req.PrivateKey)
		}
		if req.StorageBucket != nil {
			sets = append(sets, "storage_bucket=?")
			args = append(args, *req.StorageBucket)
		}
		if len(sets) == 0 {
			return r.GetFirebase(env)
		}
		for i, s := range sets {
			if i > 0 {
				query += ", "
			}
			query += s
		}
		query += " WHERE environment=?"
		args = append(args, env)
		_, err := r.db.Exec(query, args...)
		if err != nil {
			return nil, err
		}
	}
	return r.GetFirebase(env)
}

// ── Secret Configs ──

type secretRow struct {
	ID          []byte  `db:"id"`
	Environment string  `db:"environment"`
	SecretKey   string  `db:"secret_key"`
	Category    string  `db:"category"`
	ValueEnc    *string `db:"value_encrypted"`
	ValueMasked *string `db:"value_masked"`
	Description *string `db:"description"`
	IsRequired  bool    `db:"is_required"`
	IsActive    bool    `db:"is_active"`
	UpdatedBy   []byte  `db:"updated_by"`
	CreatedAt   string  `db:"created_at"`
	UpdatedAt   string  `db:"updated_at"`
}

func rowToSecret(row secretRow) models.SecretConfig {
	var ub *string
	if s := binToUUID(row.UpdatedBy); s != "" {
		ub = &s
	}
	val := ""
	if row.ValueEnc != nil {
		val = *row.ValueEnc
	}
	desc := ""
	if row.Description != nil {
		desc = *row.Description
	}
	return models.SecretConfig{
		ID:          binToUUID(row.ID),
		Environment: row.Environment,
		SecretKey:   row.SecretKey,
		Category:    row.Category,
		Value:       val,
		ValueMasked: row.ValueMasked,
		Description: &desc,
		IsRequired:  row.IsRequired,
		IsActive:    row.IsActive,
		UpdatedBy:   ub,
	}
}

func (r *Repository) GetSecretsByEnv(env string) ([]models.SecretConfig, error) {
	var rows []secretRow
	err := r.db.Select(&rows, "SELECT id, environment, secret_key, category, value_encrypted, value_masked, description, is_required, is_active, updated_by, created_at, updated_at FROM secret_configs WHERE environment = ? ORDER BY category, secret_key", env)
	if err != nil {
		return nil, err
	}
	out := make([]models.SecretConfig, len(rows))
	for i, row := range rows {
		out[i] = rowToSecret(row)
	}
	return out, nil
}

func (r *Repository) GetSecretsByEnvAndCategory(env, category string) ([]models.SecretConfig, error) {
	var rows []secretRow
	err := r.db.Select(&rows, "SELECT id, environment, secret_key, category, value_encrypted, value_masked, description, is_required, is_active, updated_by, created_at, updated_at FROM secret_configs WHERE environment = ? AND category = ? ORDER BY secret_key", env, category)
	if err != nil {
		return nil, err
	}
	out := make([]models.SecretConfig, len(rows))
	for i, row := range rows {
		out[i] = rowToSecret(row)
	}
	return out, nil
}

func (r *Repository) GetSecret(env, key string) (*models.SecretConfig, error) {
	var row secretRow
	err := r.db.Get(&row, "SELECT id, environment, secret_key, category, value_encrypted, value_masked, description, is_required, is_active, updated_by, created_at, updated_at FROM secret_configs WHERE environment = ? AND secret_key = ?", env, key)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	s := rowToSecret(row)
	return &s, nil
}

func makeMask(val string) string {
	if len(val) <= 8 {
		return "****"
	}
	return val[:4] + "****" + val[len(val)-4:]
}

func (r *Repository) UpsertSecret(env string, req models.UpsertSecretRequest) (*models.SecretConfig, error) {
	id := newBinUUID()
	masked := makeMask(req.Value)
	isReq := false
	if req.IsRequired != nil {
		isReq = *req.IsRequired
	}
	_, err := r.db.Exec(
		`INSERT INTO secret_configs (id, environment, secret_key, category, value_encrypted, value_masked, description, is_required, is_active)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
		 ON DUPLICATE KEY UPDATE category=VALUES(category), value_encrypted=VALUES(value_encrypted), value_masked=VALUES(value_masked), description=VALUES(description), is_required=VALUES(is_required), is_active=TRUE`,
		id, env, req.SecretKey, req.Category, req.Value, masked, req.Description, isReq,
	)
	if err != nil {
		return nil, err
	}
	return r.GetSecret(env, req.SecretKey)
}

func (r *Repository) DeleteSecret(env, key string) error {
	_, err := r.db.Exec("DELETE FROM secret_configs WHERE environment=? AND secret_key=?", env, key)
	return err
}

// ── API Keys ──

type apiKeyRow struct {
	ID           []byte  `db:"id"`
	KeyHash      string  `db:"key_hash"`
	KeyPrefix    string  `db:"key_prefix"`
	Name         string  `db:"name"`
	Description  *string `db:"description"`
	ServiceName  *string `db:"service_name"`
	Environments *string `db:"environments"`
	Scopes       *string `db:"scopes"`
	IsActive     bool    `db:"is_active"`
	ExpiresAt    *string `db:"expires_at"`
	LastUsedAt   *string `db:"last_used_at"`
	CreatedBy    []byte  `db:"created_by"`
	CreatedAt    string  `db:"created_at"`
	UpdatedAt    string  `db:"updated_at"`
}

func rowToAPIKey(row apiKeyRow) models.ConfigAPIKey {
	var createdBy *string
	if s := binToUUID(row.CreatedBy); s != "" {
		createdBy = &s
	}
	envs := []string{"*"}
	if row.Environments != nil {
		_ = json.Unmarshal([]byte(*row.Environments), &envs)
	}
	scopes := []string{"config:read"}
	if row.Scopes != nil {
		_ = json.Unmarshal([]byte(*row.Scopes), &scopes)
	}
	return models.ConfigAPIKey{
		ID:           binToUUID(row.ID),
		KeyHash:      row.KeyHash,
		KeyPrefix:    row.KeyPrefix,
		Name:         row.Name,
		Description:  row.Description,
		ServiceName:  row.ServiceName,
		Environments: envs,
		Scopes:       scopes,
		IsActive:     row.IsActive,
		CreatedBy:    createdBy,
	}
}

func (r *Repository) ValidateAPIKey(keyHash string) (*models.ConfigAPIKey, error) {
	var row apiKeyRow
	err := r.db.Get(&row,
		`SELECT id, key_hash, key_prefix, name, description, service_name, environments, scopes, is_active, expires_at, last_used_at, created_by, created_at, updated_at
		 FROM config_api_keys
		 WHERE key_hash = ? AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())`,
		keyHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	// Update last_used_at async
	go func() { r.db.Exec("UPDATE config_api_keys SET last_used_at = NOW() WHERE key_hash = ?", keyHash) }()

	ak := rowToAPIKey(row)
	return &ak, nil
}

func (r *Repository) GetAllAPIKeys() ([]models.ConfigAPIKey, error) {
	var rows []apiKeyRow
	err := r.db.Select(&rows,
		`SELECT id, key_hash, key_prefix, name, description, service_name, environments, scopes, is_active, expires_at, last_used_at, created_by, created_at, updated_at
		 FROM config_api_keys ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	out := make([]models.ConfigAPIKey, len(rows))
	for i, row := range rows {
		out[i] = rowToAPIKey(row)
	}
	return out, nil
}

func (r *Repository) CreateAPIKey(keyHash, keyPrefix, name, description, serviceName string, environments []string, createdBy string) (*models.ConfigAPIKey, error) {
	id := newBinUUID()
	var cb []byte
	if uid, err := uuid.Parse(createdBy); err == nil {
		cb = uid[:]
	}
	envsJSON, _ := json.Marshal(environments)
	scopesJSON, _ := json.Marshal([]string{"config:read"})
	var svcPtr, descPtr *string
	if serviceName != "" {
		svcPtr = &serviceName
	}
	if description != "" {
		descPtr = &description
	}
	_, err := r.db.Exec(
		`INSERT INTO config_api_keys (id, key_hash, key_prefix, name, description, service_name, environments, scopes, is_active, created_by)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
		id, keyHash, keyPrefix, name, descPtr, svcPtr, string(envsJSON), string(scopesJSON), cb,
	)
	if err != nil {
		return nil, err
	}
	var row apiKeyRow
	err = r.db.Get(&row,
		`SELECT id, key_hash, key_prefix, name, description, service_name, environments, scopes, is_active, expires_at, last_used_at, created_by, created_at, updated_at
		 FROM config_api_keys WHERE key_hash = ?`, keyHash)
	if err != nil {
		return nil, err
	}
	ak := rowToAPIKey(row)
	return &ak, nil
}

func (r *Repository) RevokeAPIKey(id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid key id: %w", err)
	}
	_, err = r.db.Exec("UPDATE config_api_keys SET is_active = FALSE WHERE id = ?", uid[:])
	return err
}

func (r *Repository) DeleteAPIKey(id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid key id: %w", err)
	}
	_, err = r.db.Exec("DELETE FROM config_api_keys WHERE id = ?", uid[:])
	return err
}

// ── Clone Environment ──

func (r *Repository) CloneEnvironment(src, dst string) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Clone services
	rows, err := r.db.Queryx("SELECT service_key, category, url, description FROM service_url_configs WHERE environment = ?", src)
	if err != nil {
		return err
	}
	for rows.Next() {
		var sk, cat, u string
		var desc *string
		rows.Scan(&sk, &cat, &u, &desc)
		id := newBinUUID()
		tx.Exec(
			`INSERT INTO service_url_configs (id, environment, service_key, category, url, description, is_active)
			 VALUES (?, ?, ?, ?, ?, ?, TRUE)
			 ON DUPLICATE KEY UPDATE category=VALUES(category), url=VALUES(url), description=VALUES(description)`,
			id, dst, sk, cat, u, desc,
		)
	}

	// Clone infra
	irows, err := r.db.Queryx("SELECT infra_key, host, port, username, connection_string FROM infrastructure_configs WHERE environment = ?", src)
	if err != nil {
		return fmt.Errorf("clone infra: %w", err)
	}
	for irows.Next() {
		var ik, h string
		var p int
		var un, cs *string
		irows.Scan(&ik, &h, &p, &un, &cs)
		id := newBinUUID()
		tx.Exec(
			`INSERT INTO infrastructure_configs (id, environment, infra_key, host, port, username, connection_string, is_active)
			 VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
			 ON DUPLICATE KEY UPDATE host=VALUES(host), port=VALUES(port), username=VALUES(username), connection_string=VALUES(connection_string)`,
			id, dst, ik, h, p, un, cs,
		)
	}

	// Clone secrets
	srows, err := r.db.Queryx("SELECT secret_key, category, value_encrypted, value_masked, description, is_required FROM secret_configs WHERE environment = ?", src)
	if err != nil {
		return fmt.Errorf("clone secrets: %w", err)
	}
	for srows.Next() {
		var sk, cat string
		var ve, vm, desc *string
		var isReq bool
		srows.Scan(&sk, &cat, &ve, &vm, &desc, &isReq)
		id := newBinUUID()
		tx.Exec(
			`INSERT INTO secret_configs (id, environment, secret_key, category, value_encrypted, value_masked, description, is_required, is_active)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
			 ON DUPLICATE KEY UPDATE category=VALUES(category), value_encrypted=VALUES(value_encrypted), value_masked=VALUES(value_masked), description=VALUES(description), is_required=VALUES(is_required)`,
			id, dst, sk, cat, ve, vm, desc, isReq,
		)
	}

	// Clone firebase
	var fb firebaseRow
	err = r.db.Get(&fb, "SELECT id, environment, project_id, client_email, private_key_encrypted, storage_bucket, is_active, updated_by, created_at, updated_at FROM firebase_configs WHERE environment = ?", src)
	if err == nil {
		id := newBinUUID()
		tx.Exec(
			`INSERT INTO firebase_configs (id, environment, project_id, client_email, private_key_encrypted, storage_bucket, is_active)
			 VALUES (?, ?, ?, ?, ?, ?, TRUE)
			 ON DUPLICATE KEY UPDATE project_id=VALUES(project_id), client_email=VALUES(client_email), private_key_encrypted=VALUES(private_key_encrypted), storage_bucket=VALUES(storage_bucket)`,
			id, dst, fb.ProjectID, fb.ClientEmail, fb.PrivateKeyEnc, fb.StorageBucket,
		)
	}

	return tx.Commit()
}
