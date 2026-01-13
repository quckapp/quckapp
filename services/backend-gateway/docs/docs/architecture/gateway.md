---
sidebar_position: 3
title: API Gateway
description: API Gateway architecture and features
---

# API Gateway

The API Gateway serves as the single entry point for all client requests, handling routing, authentication, and real-time connections.

## Gateway Architecture

```
                           ┌───────────────────────────────────────┐
                           │           API GATEWAY                  │
                           │            Port 3000                   │
                           │                                        │
  ┌──────────────┐         │  ┌──────────────────────────────────┐ │
  │    Mobile    │ ───────▶│  │        Middleware Chain          │ │
  │    Client    │         │  │                                  │ │
  └──────────────┘         │  │  Helmet → CORS → Compression    │ │
                           │  │      ↓                           │ │
  ┌──────────────┐         │  │  Rate Limiter → Auth Guard      │ │
  │     Web      │ ───────▶│  │      ↓                           │ │
  │    Client    │         │  │  Validation Pipe                 │ │
  └──────────────┘         │  └──────────────────────────────────┘ │
                           │                                        │
  ┌──────────────┐         │  ┌──────────────────────────────────┐ │
  │    Admin     │ ───────▶│  │       Route Controllers          │ │
  │   Dashboard  │         │  │                                  │ │
  └──────────────┘         │  │  /auth  /users  /messages  ...   │ │
                           │  └──────────────────────────────────┘ │
                           │                                        │
                           │  ┌──────────────────────────────────┐ │
                           │  │      WebSocket Gateways          │ │
                           │  │                                  │ │
                           │  │  /chat (Socket.IO)               │ │
                           │  │  /webrtc (Socket.IO)             │ │
                           │  └──────────────────────────────────┘ │
                           │                                        │
                           └───────────────────────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │                   TCP/gRPC                    │
                    ▼                       ▼                       ▼
              ┌──────────┐           ┌──────────┐            ┌──────────┐
              │   Auth   │           │  Users   │            │ Messages │
              │  :4001   │           │  :4002   │            │  :4003   │
              └──────────┘           └──────────┘            └──────────┘
```

## Middleware Pipeline

### Order of Execution

```typescript
app.use(helmet(helmetConfig));      // 1. Security headers
app.use(compression());              // 2. Response compression
app.use(cors(corsConfig));           // 3. CORS handling
app.setGlobalPrefix('api/v1');       // 4. API prefix
// Validation & Exception filters    // 5. Request processing
```

### Security Middleware

#### Helmet Configuration
```typescript
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
}
```

#### CORS Configuration
```typescript
{
  origin: (origin, callback) => {
    // Validate against CORS_ORIGIN env variable
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
}
```

## Rate Limiting

### Multi-Tier Strategy

| Tier | Window | Limit | Purpose |
|------|--------|-------|---------|
| Default | 60s | 100 | General API |
| Auth | 60s | 10 | Login attempts |
| OTP | 60s | 3 | OTP requests |
| Upload | 60s | 10 | File uploads |

```typescript
@Throttle({ default: { limit: 100, ttl: 60000 } })
@Controller('api')
export class AppController {}

@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('auth/login')
async login() {}
```

### Redis-Backed Rate Limiting
```typescript
// Production: Distributed rate limiting via Redis
{
  RATE_LIMIT_USE_REDIS: true,
  REDIS_HOST: 'redis.internal',
}
```

## Route Controllers

### Gateway Controllers

| Controller | Prefix | Description |
|------------|--------|-------------|
| AuthController | `/auth` | Authentication endpoints |
| UsersController | `/users` | User management |
| ConversationsController | `/conversations` | Chat management |
| MessagesController | `/messages` | Messaging |
| CallsController | `/calls` | Voice/video calls |
| UploadController | `/upload` | File uploads |
| NotificationsController | `/notifications` | Notifications |
| HealthController | `/health` | Health checks |

### Request Flow

```typescript
// Gateway Controller
@Controller('users')
export class UsersGatewayController {
  constructor(
    @Inject('USERS_SERVICE')
    private usersClient: ClientProxy
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return this.usersClient.send(
      { cmd: 'users.getProfile' },
      { userId: user._id }
    );
  }
}
```

## WebSocket Gateways

### Chat Gateway (`/chat`)

**Namespace**: `/chat`
**Transport**: WebSocket only

#### Connection Flow
```
Client                    Gateway                    MongoDB
  │                          │                          │
  │── connect(token) ───────▶│                          │
  │                          │── verify JWT ───────────▶│
  │                          │◀─── user data ───────────│
  │                          │── update status ────────▶│
  │◀─── connected ───────────│                          │
  │                          │                          │
  │── join:conversation ────▶│                          │
  │◀─── joined ──────────────│                          │
```

#### Events

**Client → Server**:
| Event | Payload | Description |
|-------|---------|-------------|
| `message:send` | `{ conversationId, content, type }` | Send message |
| `message:read` | `{ messageId, conversationId }` | Mark as read |
| `user:typing` | `{ conversationId }` | Typing indicator |
| `user:stop-typing` | `{ conversationId }` | Stop typing |

**Server → Client**:
| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `Message` | New message |
| `message:updated` | `Message` | Message edited |
| `message:deleted` | `{ messageId }` | Message deleted |
| `user:typing` | `{ userId, conversationId }` | User typing |
| `user:online` | `{ userId }` | User online |
| `user:offline` | `{ userId }` | User offline |

### WebRTC Gateway (`/webrtc`)

**Namespace**: `/webrtc`

#### Signaling Flow
```
Caller                    Gateway                    Callee
  │                          │                          │
  │── call:initiate ────────▶│                          │
  │                          │── call:incoming ────────▶│
  │                          │◀─── call:answer ─────────│
  │◀─── call:accepted ───────│                          │
  │                          │                          │
  │── offer ────────────────▶│── offer ────────────────▶│
  │◀─── answer ──────────────│◀─── answer ──────────────│
  │                          │                          │
  │── ice-candidate ────────▶│── ice-candidate ────────▶│
  │◀─── ice-candidate ───────│◀─── ice-candidate ───────│
```

#### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `call:initiate` | C→S | Start call |
| `call:incoming` | S→C | Incoming call |
| `call:answer` | C→S | Answer call |
| `call:reject` | C→S | Reject call |
| `call:end` | Both | End call |
| `offer` | Both | WebRTC offer |
| `answer` | Both | WebRTC answer |
| `ice-candidate` | Both | ICE candidate |

## Authentication

### JWT Strategy

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    return { userId: payload.sub, phoneNumber: payload.phoneNumber };
  }
}
```

### Guards

| Guard | Purpose |
|-------|---------|
| `JwtAuthGuard` | Validate JWT token |
| `RolesGuard` | Role-based access |
| `ThrottlerGuard` | Rate limiting |

## API Documentation

Swagger UI available at `/api/docs`

```typescript
const swaggerConfig = new DocumentBuilder()
  .setTitle('QuickChat API')
  .setVersion('1.0')
  .addBearerAuth({
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  }, 'JWT-auth')
  .addTag('Auth')
  .addTag('Users')
  .addTag('Messages')
  .build();

SwaggerModule.setup('api/docs', app, document);
```

## Error Handling

### Exception Filters

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
      message: this.getErrorMessage(exception),
    });
  }
}
```

### Standard Error Response
```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/users/me",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

## Monitoring

### Health Endpoint
```bash
GET /api/v1/health
```

Response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "memory": { "status": "up", "heapUsed": "150MB" }
  }
}
```

### Metrics Endpoint
```bash
GET /metrics
```
Prometheus format metrics for monitoring.
