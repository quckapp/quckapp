---
sidebar_position: 6
title: Security Architecture
description: Security measures and authentication flow
---

# Security Architecture

QuckChat implements multiple layers of security to protect user data and ensure secure communication.

## Security Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SECURITY ARCHITECTURE                            │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  LAYER 1: NETWORK                                                   ││
│  │  • Firewall rules • VPC isolation • DDoS protection                 ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  LAYER 2: TRANSPORT                                                 ││
│  │  • HTTPS/TLS 1.3 • Certificate pinning • HSTS                       ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  LAYER 3: APPLICATION                                               ││
│  │  • JWT Auth • Rate Limiting • Input Validation • CORS               ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  LAYER 4: DATA                                                      ││
│  │  • Encryption at rest • Field-level encryption • Secure hashing     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Authentication

### Authentication Methods

| Method | Use Case | Security Level |
|--------|----------|----------------|
| Phone OTP | Primary login | High |
| Email + Password | Alternative login | Medium |
| OAuth 2.0 | Social login | High |
| 2FA (TOTP) | Enhanced security | Very High |

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                              │
│                                                                       │
│  ┌──────────┐   Send OTP   ┌──────────┐   SMS    ┌──────────┐       │
│  │  Client  │ ───────────▶ │ Backend  │ ───────▶ │  Twilio  │       │
│  └──────────┘              └──────────┘          └──────────┘       │
│       │                         │                                    │
│       │    Enter Code           │                                    │
│       │ ◀───────────────────────│                                    │
│       │                         │                                    │
│  ┌──────────┐  Verify OTP  ┌──────────┐  Verify  ┌──────────┐       │
│  │  Client  │ ───────────▶ │ Backend  │ ───────▶ │  Twilio  │       │
│  └──────────┘              └──────────┘          └──────────┘       │
│       │                         │                                    │
│       │                    Issue JWT                                 │
│       │ ◀───────────────────────│                                    │
│       │                         │                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    JWT Token Response                         │   │
│  │  {                                                            │   │
│  │    "accessToken": "eyJhbGc...",                              │   │
│  │    "refreshToken": "eyJhbGc...",                             │   │
│  │    "expiresIn": 604800                                        │   │
│  │  }                                                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### JWT Structure

```typescript
// Access Token Payload
{
  sub: '507f1f77bcf86cd799439011',  // User ID
  phoneNumber: '+1234567890',
  role: 'user',
  iat: 1704067200,                   // Issued at
  exp: 1704672000                    // Expires (7 days)
}

// Refresh Token Payload
{
  sub: '507f1f77bcf86cd799439011',
  type: 'refresh',
  iat: 1704067200,
  exp: 1706659200                    // Expires (30 days)
}
```

### JWT Strategy Implementation

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);

    if (!user || user.isBanned) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
```

## Two-Factor Authentication (2FA)

### TOTP Setup Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         2FA SETUP FLOW                                │
│                                                                       │
│  1. User enables 2FA                                                  │
│     ┌──────────┐    POST /auth/2fa/setup    ┌──────────┐            │
│     │  Client  │ ─────────────────────────▶ │ Backend  │            │
│     └──────────┘                            └──────────┘            │
│          │                                       │                   │
│          │                              Generate Secret              │
│          │                                       │                   │
│          │ ◀──── { secret, qrCode, backupCodes } │                   │
│          │                                       │                   │
│  2. User scans QR code with authenticator app                        │
│                                                                       │
│  3. User verifies with code                                          │
│     ┌──────────┐    POST /auth/2fa/verify   ┌──────────┐            │
│     │  Client  │ ─────────────────────────▶ │ Backend  │            │
│     │          │    { code: "123456" }      │          │            │
│     └──────────┘                            └──────────┘            │
│          │                                       │                   │
│          │ ◀──── 2FA enabled ────────────────────│                   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Backup Codes

```typescript
// 10 one-time backup codes generated on 2FA setup
{
  backupCodes: [
    { code: 'A1B2C3D4', usedAt: null },
    { code: 'E5F6G7H8', usedAt: null },
    // ... 8 more codes
  ]
}
```

## Rate Limiting

### Multi-Tier Rate Limiting

```typescript
// Global rate limiting
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 100, ttl: 60000 } })
@Controller()
export class AppController {}

// Endpoint-specific limits
@Throttle({ default: { limit: 3, ttl: 60000 } })
@Post('auth/send-otp')
async sendOtp() {}

@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('auth/login')
async login() {}
```

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067260
```

## Security Headers

### Helmet Configuration

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

### Applied Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Content-Security-Policy` | See above | Content restrictions |

## CORS Configuration

```typescript
const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-XSRF-TOKEN',
    'X-Requested-With',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400,
};
```

## Input Validation

### Validation Pipe

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip unknown properties
    forbidNonWhitelisted: true, // Throw on unknown properties
    transform: true,            // Auto-transform types
    transformOptions: {
      enableImplicitConversion: true,
    },
    validationError: {
      target: false,
      value: false,
    },
  }),
);
```

### DTO Validation

```typescript
export class SendMessageDto {
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @MaxLength(10000)
  @IsOptional()
  content?: string;

  @IsEnum(['text', 'image', 'video', 'audio', 'file'])
  type: MessageType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}
```

## Password Security

### Hashing

```typescript
import * as bcrypt from 'bcrypt';

// Hash password before storing
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Verify password
const isMatch = await bcrypt.compare(password, hashedPassword);
```

### Password Requirements

```typescript
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
  message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
})
password: string;
```

## Data Encryption

### Field-Level Encryption

```typescript
import { fieldEncryption } from 'mongoose-field-encryption';

UserSchema.plugin(fieldEncryption, {
  fields: ['email', 'phoneNumber'],
  secret: process.env.ENCRYPTION_KEY,
  saltGenerator: (secret) => secret.slice(0, 16),
});
```

### Encryption Key Requirements

```bash
# 32-character encryption key
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

## Role-Based Access Control (RBAC)

### Roles

| Role | Permissions |
|------|------------|
| `user` | Basic user actions |
| `moderator` | User actions + content moderation |
| `admin` | All above + user management |
| `super_admin` | Full system access |

### Permissions

```typescript
enum Permission {
  MANAGE_USERS = 'manage_users',
  MANAGE_REPORTS = 'manage_reports',
  MANAGE_COMMUNITIES = 'manage_communities',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_MODERATORS = 'manage_moderators',
  BAN_USERS = 'ban_users',
  DELETE_CONTENT = 'delete_content',
}
```

### Guards

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin')
export class AdminController {}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.BAN_USERS)
@Post('users/:id/ban')
async banUser() {}
```

## Session Management

### Active Session Tracking

```typescript
const SessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  token: String,
  deviceInfo: {
    deviceId: String,
    deviceName: String,
    platform: String,
    ip: String,
    userAgent: String,
  },
  isActive: { type: Boolean, default: true },
  lastActive: Date,
  expiresAt: Date,
});
```

### Session Termination

```typescript
// Terminate specific session
DELETE /auth/sessions/:sessionId

// Terminate all other sessions
DELETE /auth/sessions

// Logout (terminate current session)
POST /auth/logout
```

## Security Audit Logging

```typescript
const AuditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  resource: { type: String },
  resourceId: { type: String },
  details: { type: Schema.Types.Mixed },
  ip: { type: String },
  userAgent: { type: String },
  status: { type: String, enum: ['success', 'failure'] },
}, { timestamps: true });

// Logged actions
- Authentication events (login, logout, failed attempts)
- Permission changes
- User bans/unbans
- Data exports
- Admin actions
```

## Security Best Practices Checklist

- [x] HTTPS everywhere (TLS 1.3)
- [x] JWT with short expiration
- [x] Refresh token rotation
- [x] Rate limiting on all endpoints
- [x] Input validation and sanitization
- [x] SQL/NoSQL injection prevention
- [x] XSS protection headers
- [x] CSRF protection
- [x] Password hashing (bcrypt)
- [x] Field-level encryption
- [x] Audit logging
- [x] Session management
- [x] 2FA support
- [x] Role-based access control
- [x] Security headers (Helmet)
- [x] CORS configuration
