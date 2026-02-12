package goauth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const testSecret = "test-secret-key-for-unit-tests-minimum-32-chars"

func init() {
	gin.SetMode(gin.TestMode)
}

func generateTestToken(sub, email, sessionID, issuer string, twoFA bool, expiry time.Duration) string {
	claims := Claims{
		Sub:       sub,
		Email:     email,
		SessionID: sessionID,
		TwoFA:     twoFA,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte(testSecret))
	return signed
}

func setupRouter(cfg Config) *gin.Engine {
	router := gin.New()
	router.Use(Auth(cfg))
	router.GET("/test", func(c *gin.Context) {
		userID, _ := GetUserID(c)
		email, _ := GetEmail(c)
		c.JSON(200, gin.H{"user_id": userID, "email": email})
	})
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	return router
}

func TestAuth_ValidToken(t *testing.T) {
	cfg := DefaultConfig(testSecret)
	router := setupRouter(cfg)

	token := generateTestToken("user-123", "test@example.com", "sess-456", "quckapp-auth", false, time.Hour)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuth_MissingHeader(t *testing.T) {
	cfg := DefaultConfig(testSecret)
	router := setupRouter(cfg)

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuth_MalformedBearer(t *testing.T) {
	cfg := DefaultConfig(testSecret)
	router := setupRouter(cfg)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "InvalidFormat")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuth_ExpiredToken(t *testing.T) {
	cfg := DefaultConfig(testSecret)
	router := setupRouter(cfg)

	token := generateTestToken("user-123", "test@example.com", "sess-456", "quckapp-auth", false, -time.Hour)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuth_InvalidIssuer(t *testing.T) {
	cfg := DefaultConfig(testSecret)
	router := setupRouter(cfg)

	token := generateTestToken("user-123", "test@example.com", "sess-456", "wrong-issuer", false, time.Hour)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuth_InvalidSecret(t *testing.T) {
	cfg := DefaultConfig(testSecret)
	router := setupRouter(cfg)

	// Sign with a different secret
	claims := Claims{
		Sub:   "user-123",
		Email: "test@example.com",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "quckapp-auth",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte("different-secret-key-for-signing"))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuth_Require2FA(t *testing.T) {
	cfg := DefaultConfig(testSecret)
	cfg.RequireTwoFA = true
	router := setupRouter(cfg)

	// Token without 2FA
	token := generateTestToken("user-123", "test@example.com", "sess-456", "quckapp-auth", false, time.Hour)
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 for missing 2FA, got %d", w.Code)
	}

	// Token with 2FA
	token2FA := generateTestToken("user-123", "test@example.com", "sess-456", "quckapp-auth", true, time.Hour)
	req2 := httptest.NewRequest("GET", "/test", nil)
	req2.Header.Set("Authorization", "Bearer "+token2FA)
	w2 := httptest.NewRecorder()

	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("expected 200 for valid 2FA, got %d", w2.Code)
	}
}

func TestAuth_SkipPaths(t *testing.T) {
	cfg := DefaultConfig(testSecret)
	router := setupRouter(cfg)

	// /health should be accessible without auth
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for skip path, got %d", w.Code)
	}
}

func TestAuth_EmptySubClaim(t *testing.T) {
	cfg := DefaultConfig(testSecret)
	router := setupRouter(cfg)

	token := generateTestToken("", "test@example.com", "sess-456", "quckapp-auth", false, time.Hour)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for empty sub, got %d", w.Code)
	}
}

func TestGetUserID(t *testing.T) {
	cfg := DefaultConfig(testSecret)
	router := gin.New()
	router.Use(Auth(cfg))
	router.GET("/test", func(c *gin.Context) {
		userID, ok := GetUserID(c)
		if !ok || userID != "user-abc-123" {
			t.Errorf("expected user-abc-123, got %s (ok=%v)", userID, ok)
		}
		c.Status(200)
	})

	token := generateTestToken("user-abc-123", "test@example.com", "sess-1", "quckapp-auth", false, time.Hour)
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
}

func TestGetClaims(t *testing.T) {
	cfg := DefaultConfig(testSecret)
	router := gin.New()
	router.Use(Auth(cfg))
	router.GET("/test", func(c *gin.Context) {
		claims, ok := GetClaims(c)
		if !ok {
			t.Error("expected claims to be present")
			return
		}
		if claims.Sub != "user-xyz" {
			t.Errorf("expected sub=user-xyz, got %s", claims.Sub)
		}
		if claims.Email != "xyz@example.com" {
			t.Errorf("expected email=xyz@example.com, got %s", claims.Email)
		}
		if claims.SessionID != "sess-999" {
			t.Errorf("expected sessionId=sess-999, got %s", claims.SessionID)
		}
		c.Status(200)
	})

	token := generateTestToken("user-xyz", "xyz@example.com", "sess-999", "quckapp-auth", true, time.Hour)
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
}
