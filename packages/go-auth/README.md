# go-auth

Shared JWT authentication middleware for QuckApp Go services.

## Installation

```bash
go get github.com/quckapp/go-auth
```

For local development, add a `replace` directive in your service's `go.mod`:

```go
replace github.com/quckapp/go-auth => ../../packages/go-auth
```

## Usage

```go
import goauth "github.com/quckapp/go-auth"

func main() {
    cfg := goauth.DefaultConfig(os.Getenv("JWT_SECRET"))

    router := gin.New()
    router.Use(gin.Recovery())
    router.Use(goauth.RequestID())
    router.Use(goauth.CORS())
    router.Use(goauth.Auth(cfg))

    api := router.Group("/api/bookmarks")
    {
        api.GET("", func(c *gin.Context) {
            userID, _ := goauth.GetUserID(c)
            // use userID...
        })
    }
}
```

## JWT Claims

Tokens issued by auth-service contain:

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | User ID (UUID) |
| `email` | string | User email |
| `sessionId` | string | Session identifier |
| `2fa` | bool | Two-factor verified |
| `iss` | string | Issuer ("quckapp-auth") |
| `iat` | number | Issued at |
| `exp` | number | Expiration |

## Available Middleware

- `Auth(cfg)` - JWT validation and claims extraction
- `Logger(logger)` - Request logging with logrus
- `CORS()` - Cross-Origin Resource Sharing headers
- `RequestID()` - X-Request-ID propagation/generation

## Helper Functions

- `GetUserID(c)` - Extract user ID from context
- `GetEmail(c)` - Extract email from context
- `GetSessionID(c)` - Extract session ID from context
- `GetClaims(c)` - Extract full claims from context
- `Is2FAVerified(c)` - Check 2FA status

## Migration from Inline Middleware

If your service has a copy-pasted `internal/middleware/middleware.go`:

1. Add go-auth dependency to `go.mod`
2. Replace `middleware.Auth(secret)` with `goauth.Auth(goauth.DefaultConfig(secret))`
3. Replace `middleware.Logger(logger)` with `goauth.Logger(logger)`
4. Replace `middleware.CORS()` with `goauth.CORS()`
5. Replace `middleware.RequestID()` with `goauth.RequestID()`
6. Replace `c.Get("user_id")` with `goauth.GetUserID(c)`
7. Delete `internal/middleware/middleware.go`
