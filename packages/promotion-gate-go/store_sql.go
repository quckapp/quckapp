package promotiongate

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

// defaultSQLTable is used when no table name is provided to NewSQLStore.
const defaultSQLTable = "promotion_records"

// SQLStore implements Store using a *sql.DB connection.
// It works with any database/sql-compatible driver (MySQL, PostgreSQL, etc.).
type SQLStore struct {
	db    *sql.DB
	table string
}

// NewSQLStore creates a new SQLStore. If tableName is empty, "promotion_records" is used.
func NewSQLStore(db *sql.DB, tableName string) *SQLStore {
	if tableName == "" {
		tableName = defaultSQLTable
	}
	return &SQLStore{db: db, table: tableName}
}

// Migrate creates the promotion_records table and required indexes if they do not exist.
func (s *SQLStore) Migrate(ctx context.Context) error {
	createTable := `CREATE TABLE IF NOT EXISTS ` + s.table + ` (
		id               VARCHAR(36)  NOT NULL PRIMARY KEY,
		service_key      VARCHAR(255) NOT NULL,
		api_version      VARCHAR(50)  NOT NULL,
		from_environment VARCHAR(50)  NOT NULL DEFAULT '',
		to_environment   VARCHAR(50)  NOT NULL,
		status           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
		promoted_by      VARCHAR(255) NOT NULL DEFAULT '',
		approved_by      VARCHAR(255) NOT NULL DEFAULT '',
		reason           TEXT         NOT NULL,
		is_emergency     BOOLEAN      NOT NULL DEFAULT FALSE,
		created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`

	if _, err := s.db.ExecContext(ctx, createTable); err != nil {
		return err
	}

	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_` + s.table + `_env_svc_ver ON ` + s.table + ` (to_environment, service_key, api_version, status)`,
		`CREATE INDEX IF NOT EXISTS idx_` + s.table + `_svc_ver ON ` + s.table + ` (service_key, api_version, created_at)`,
	}

	for _, idx := range indexes {
		if _, err := s.db.ExecContext(ctx, idx); err != nil {
			return err
		}
	}

	return nil
}

// IsActiveInEnv returns true when at least one ACTIVE record exists for the
// given environment, serviceKey, and apiVersion.
func (s *SQLStore) IsActiveInEnv(ctx context.Context, env, serviceKey, apiVersion string) (bool, error) {
	query := `SELECT COUNT(*) FROM ` + s.table + ` WHERE to_environment = ? AND service_key = ? AND api_version = ? AND status = 'ACTIVE'`

	var count int
	if err := s.db.QueryRowContext(ctx, query, env, serviceKey, apiVersion).Scan(&count); err != nil {
		return false, err
	}
	return count > 0, nil
}

// Record inserts a new promotion record with a generated UUID and current timestamp.
func (s *SQLStore) Record(ctx context.Context, rec *PromotionRecord) error {
	rec.ID = uuid.New().String()
	rec.CreatedAt = time.Now().UTC()

	query := `INSERT INTO ` + s.table + ` (id, service_key, api_version, from_environment, to_environment, status, promoted_by, approved_by, reason, is_emergency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.ExecContext(ctx, query,
		rec.ID,
		rec.ServiceKey,
		rec.APIVersion,
		rec.FromEnvironment,
		rec.ToEnvironment,
		rec.Status,
		rec.PromotedBy,
		rec.ApprovedBy,
		rec.Reason,
		rec.IsEmergency,
		rec.CreatedAt,
	)
	return err
}

// History returns the 100 most recent promotion records for a service+version,
// ordered by created_at descending.
func (s *SQLStore) History(ctx context.Context, serviceKey, apiVersion string) ([]PromotionRecord, error) {
	query := `SELECT id, service_key, api_version, from_environment, to_environment, status, promoted_by, approved_by, reason, is_emergency, created_at FROM ` + s.table + ` WHERE service_key = ? AND api_version = ? ORDER BY created_at DESC LIMIT 100`

	rows, err := s.db.QueryContext(ctx, query, serviceKey, apiVersion)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []PromotionRecord
	for rows.Next() {
		var r PromotionRecord
		if err := rows.Scan(
			&r.ID,
			&r.ServiceKey,
			&r.APIVersion,
			&r.FromEnvironment,
			&r.ToEnvironment,
			&r.Status,
			&r.PromotedBy,
			&r.ApprovedBy,
			&r.Reason,
			&r.IsEmergency,
			&r.CreatedAt,
		); err != nil {
			return nil, err
		}
		records = append(records, r)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return records, nil
}
