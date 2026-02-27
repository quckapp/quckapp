// Package promotiongate provides a shared promotion-gate system for QuckApp Go services.
//
// It enforces environment promotion chains (local -> dev -> qa -> uat -> staging -> production -> live)
// and exposes Gin HTTP endpoints that any service can mount to participate in coordinated deployments.
//
// Usage:
//
//	store := promotiongate.NewSQLStore(db, "")
//	h := promotiongate.NewHandler(store, "user-service", os.Getenv("ENVIRONMENT"))
//	h.RegisterRoutes(router.Group("/api/v1"))
package promotiongate

import (
	"context"
	"strings"
	"time"
)

// environmentChain defines the ordered promotion path.
// A service must be active in the previous environment before promoting to the next.
var environmentChain = []string{
	"local",
	"dev",
	"qa",
	"uat",
	"staging",
	"production",
	"live",
}

// uatVariants lists the accepted UAT sub-environments.
// All UAT variants are treated as equivalent to "uat" in the chain.
var uatVariants = []string{"uat", "uat1", "uat2", "uat3"}

// unrestrictedEnvs are environments that do not require a prior promotion step.
var unrestrictedEnvs = map[string]struct{}{
	"local": {},
	"dev":   {},
}

// Normalize converts an environment name to its canonical chain form.
// UAT variants (uat1, uat2, uat3) are normalised to "uat".
// All names are lower-cased.
func Normalize(env string) string {
	env = strings.ToLower(strings.TrimSpace(env))
	for _, v := range uatVariants {
		if env == v {
			return "uat"
		}
	}
	return env
}

// PreviousOf returns the environment that must contain an active promotion
// before a service can be promoted into the given target environment.
// Returns "" if env is the first in the chain or is unknown.
func PreviousOf(env string) string {
	norm := Normalize(env)
	for i, e := range environmentChain {
		if e == norm && i > 0 {
			return environmentChain[i-1]
		}
	}
	return ""
}

// IsUnrestricted returns true when the environment does not require a prior
// promotion record (e.g. local, dev).
func IsUnrestricted(env string) bool {
	_, ok := unrestrictedEnvs[Normalize(env)]
	return ok
}

// UATVariants returns the list of accepted UAT sub-environments.
func UATVariants() []string {
	out := make([]string, len(uatVariants))
	copy(out, uatVariants)
	return out
}

// PromotionRecord represents a single promotion event stored by the gate.
type PromotionRecord struct {
	ID              string    `json:"id"              bson:"_id"`
	ServiceKey      string    `json:"serviceKey"      bson:"service_key"`
	APIVersion      string    `json:"apiVersion"      bson:"api_version"`
	FromEnvironment string    `json:"fromEnvironment" bson:"from_environment"`
	ToEnvironment   string    `json:"toEnvironment"   bson:"to_environment"`
	Status          string    `json:"status"          bson:"status"`
	PromotedBy      string    `json:"promotedBy"      bson:"promoted_by"`
	ApprovedBy      string    `json:"approvedBy"      bson:"approved_by"`
	Reason          string    `json:"reason"          bson:"reason"`
	IsEmergency     bool      `json:"isEmergency"     bson:"is_emergency"`
	CreatedAt       time.Time `json:"createdAt"       bson:"created_at"`
}

// CanPromoteResponse is returned by the can-promote endpoint.
type CanPromoteResponse struct {
	Allowed           bool   `json:"allowed"`
	Reason            string `json:"reason"`
	FromEnvironment   string `json:"fromEnvironment"`
	ToEnvironment     string `json:"toEnvironment"`
	ServiceKey        string `json:"serviceKey"`
	APIVersion        string `json:"apiVersion"`
	PreviousRequired  string `json:"previousRequired,omitempty"`
	ActiveInPrevious  bool   `json:"activeInPrevious"`
}

// PromoteRequest is the JSON body for a normal promotion.
type PromoteRequest struct {
	ServiceKey      string `json:"serviceKey"      binding:"required"`
	APIVersion      string `json:"apiVersion"      binding:"required"`
	FromEnvironment string `json:"fromEnvironment" binding:"required"`
	ToEnvironment   string `json:"toEnvironment"   binding:"required"`
	PromotedBy      string `json:"promotedBy"      binding:"required"`
	Reason          string `json:"reason"`
}

// EmergencyActivateRequest is the JSON body for an emergency activation.
type EmergencyActivateRequest struct {
	ServiceKey      string `json:"serviceKey"      binding:"required"`
	APIVersion      string `json:"apiVersion"      binding:"required"`
	ToEnvironment   string `json:"toEnvironment"   binding:"required"`
	PromotedBy      string `json:"promotedBy"      binding:"required"`
	ApprovedBy      string `json:"approvedBy"      binding:"required"`
	Reason          string `json:"reason"           binding:"required"`
}

// Store abstracts the persistence layer for promotion records.
// Implementations exist for database/sql (MySQL / PostgreSQL) and MongoDB.
type Store interface {
	// Migrate creates the required table / collection and indexes.
	Migrate(ctx context.Context) error

	// IsActiveInEnv returns true when at least one ACTIVE record exists for
	// the given environment, serviceKey, and apiVersion.
	IsActiveInEnv(ctx context.Context, env, serviceKey, apiVersion string) (bool, error)

	// Record persists a new PromotionRecord (the ID is generated internally).
	Record(ctx context.Context, rec *PromotionRecord) error

	// History returns the most recent promotion records for a service+version
	// (up to 100 entries, newest first).
	History(ctx context.Context, serviceKey, apiVersion string) ([]PromotionRecord, error)
}
