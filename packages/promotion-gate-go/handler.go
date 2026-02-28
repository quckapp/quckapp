package promotiongate

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Handler exposes promotion-gate HTTP endpoints via a Gin router group.
type Handler struct {
	store       Store
	serviceName string
	environment string
}

// NewHandler creates a Handler that records promotions in the given store.
// serviceName identifies the owning service (e.g. "user-service").
// environment is the current deployment environment (e.g. "staging").
func NewHandler(store Store, serviceName, environment string) *Handler {
	return &Handler{
		store:       store,
		serviceName: serviceName,
		environment: environment,
	}
}

// RegisterRoutes mounts promotion-gate endpoints under a /promotion group on
// the supplied router group.
//
//	GET  /promotion/can-promote?serviceKey=&apiVersion=&toEnvironment=
//	POST /promotion/promote
//	POST /promotion/emergency-activate
//	GET  /promotion/history?serviceKey=&apiVersion=
//	GET  /promotion/status?serviceKey=&apiVersion=
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	pg := rg.Group("/promotion")
	{
		pg.GET("/can-promote", h.canPromote)
		pg.POST("/promote", h.promote)
		pg.POST("/emergency-activate", h.emergencyActivate)
		pg.GET("/history", h.history)
		pg.GET("/status", h.status)
	}
}

// canPromote checks whether a service+version can be promoted to a target environment.
func (h *Handler) canPromote(c *gin.Context) {
	serviceKey := c.Query("serviceKey")
	apiVersion := c.Query("apiVersion")
	toEnv := c.Query("toEnvironment")

	if serviceKey == "" || apiVersion == "" || toEnv == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"data": gin.H{
				"error": "serviceKey, apiVersion, and toEnvironment query parameters are required",
			},
		})
		return
	}

	normTo := Normalize(toEnv)

	// Unrestricted environments (local, dev) always allow promotion.
	if IsUnrestricted(normTo) {
		c.JSON(http.StatusOK, gin.H{
			"data": CanPromoteResponse{
				Allowed:          true,
				Reason:           fmt.Sprintf("%s is an unrestricted environment", normTo),
				FromEnvironment:  "",
				ToEnvironment:    normTo,
				ServiceKey:       serviceKey,
				APIVersion:       apiVersion,
				ActiveInPrevious: true,
			},
		})
		return
	}

	prev := PreviousOf(normTo)
	if prev == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"data": gin.H{
				"error": fmt.Sprintf("unknown environment: %s", toEnv),
			},
		})
		return
	}

	// For UAT variants, check that the service is active in any of them (normalised to "uat").
	active, err := h.store.IsActiveInEnv(c.Request.Context(), prev, serviceKey, apiVersion)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"data": gin.H{"error": "failed to query promotion records: " + err.Error()},
		})
		return
	}

	resp := CanPromoteResponse{
		Allowed:          active,
		ToEnvironment:    normTo,
		FromEnvironment:  prev,
		ServiceKey:       serviceKey,
		APIVersion:       apiVersion,
		PreviousRequired: prev,
		ActiveInPrevious: active,
	}

	if active {
		resp.Reason = fmt.Sprintf("service is active in %s; promotion to %s is allowed", prev, normTo)
	} else {
		resp.Reason = fmt.Sprintf("service must be active in %s before promoting to %s", prev, normTo)
	}

	c.JSON(http.StatusOK, gin.H{"data": resp})
}

// promote records a normal (non-emergency) promotion.
func (h *Handler) promote(c *gin.Context) {
	var req PromoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"data": gin.H{"error": err.Error()},
		})
		return
	}

	normTo := Normalize(req.ToEnvironment)

	// Enforce the promotion chain unless the target is unrestricted.
	if !IsUnrestricted(normTo) {
		prev := PreviousOf(normTo)
		if prev == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"data": gin.H{"error": fmt.Sprintf("unknown target environment: %s", req.ToEnvironment)},
			})
			return
		}

		active, err := h.store.IsActiveInEnv(c.Request.Context(), prev, req.ServiceKey, req.APIVersion)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"data": gin.H{"error": "failed to check promotion chain: " + err.Error()},
			})
			return
		}
		if !active {
			c.JSON(http.StatusForbidden, gin.H{
				"data": gin.H{
					"error": fmt.Sprintf("promotion blocked: service %s %s is not active in %s", req.ServiceKey, req.APIVersion, prev),
				},
			})
			return
		}
	}

	rec := &PromotionRecord{
		ServiceKey:      req.ServiceKey,
		APIVersion:      req.APIVersion,
		FromEnvironment: Normalize(req.FromEnvironment),
		ToEnvironment:   normTo,
		Status:          "ACTIVE",
		PromotedBy:      req.PromotedBy,
		Reason:          req.Reason,
		IsEmergency:     false,
	}

	if err := h.store.Record(c.Request.Context(), rec); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"data": gin.H{"error": "failed to record promotion: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": rec})
}

// emergencyActivate records an emergency activation that bypasses the normal chain
// but requires dual approval (promotedBy != approvedBy).
func (h *Handler) emergencyActivate(c *gin.Context) {
	var req EmergencyActivateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"data": gin.H{"error": err.Error()},
		})
		return
	}

	// Dual-approval validation: the promoter and approver must be different people.
	if req.PromotedBy == req.ApprovedBy {
		c.JSON(http.StatusBadRequest, gin.H{
			"data": gin.H{
				"error": "dual approval required: promotedBy and approvedBy must be different users",
			},
		})
		return
	}

	normTo := Normalize(req.ToEnvironment)

	rec := &PromotionRecord{
		ServiceKey:      req.ServiceKey,
		APIVersion:      req.APIVersion,
		FromEnvironment: "",
		ToEnvironment:   normTo,
		Status:          "ACTIVE",
		PromotedBy:      req.PromotedBy,
		ApprovedBy:      req.ApprovedBy,
		Reason:          req.Reason,
		IsEmergency:     true,
	}

	if err := h.store.Record(c.Request.Context(), rec); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"data": gin.H{"error": "failed to record emergency activation: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": rec})
}

// history returns the most recent promotion records for a service+version.
func (h *Handler) history(c *gin.Context) {
	serviceKey := c.Query("serviceKey")
	apiVersion := c.Query("apiVersion")

	if serviceKey == "" || apiVersion == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"data": gin.H{"error": "serviceKey and apiVersion query parameters are required"},
		})
		return
	}

	records, err := h.store.History(c.Request.Context(), serviceKey, apiVersion)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"data": gin.H{"error": "failed to fetch history: " + err.Error()},
		})
		return
	}

	if records == nil {
		records = []PromotionRecord{}
	}

	c.JSON(http.StatusOK, gin.H{"data": records})
}

// status returns the current active promotion status of a service+version in
// this handler's configured environment.
func (h *Handler) status(c *gin.Context) {
	serviceKey := c.Query("serviceKey")
	apiVersion := c.Query("apiVersion")

	if serviceKey == "" || apiVersion == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"data": gin.H{"error": "serviceKey and apiVersion query parameters are required"},
		})
		return
	}

	normEnv := Normalize(h.environment)

	active, err := h.store.IsActiveInEnv(c.Request.Context(), normEnv, serviceKey, apiVersion)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"data": gin.H{"error": "failed to check status: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"serviceKey":  serviceKey,
			"apiVersion":  apiVersion,
			"environment": normEnv,
			"active":      active,
		},
	})
}
