# QuikApp

A modern, scalable real-time communication platform built with a microservices architecture.

## Project Structure

```
QuikApp/
├── admin/                  # Admin dashboard
├── docs/                   # Documentation (OpenAPI, guides)
├── infrastructure/         # All infrastructure configs
│   ├── azure-pipelines/    # Azure DevOps CI/CD pipelines
│   ├── docker/             # Docker Compose & Dockerfiles
│   ├── ecs/                # AWS ECS configs
│   ├── helm/               # Helm charts
│   ├── k8s/                # Kubernetes manifests
│   ├── monitoring/         # Prometheus, Grafana, Loki
│   ├── nginx/              # Nginx configs
│   ├── scripts/            # Utility scripts
│   └── terraform/          # Infrastructure as Code (AWS/Azure)
├── mobile/                 # Mobile application
├── packages/               # Shared packages
│   └── api-client/         # TypeScript API client
├── services/               # Microservices (33 total)
│   ├── admin-service       # Admin operations (Spring)
│   ├── analytics-service   # Analytics & metrics (Python)
│   ├── attachment-service  # File attachments (Go)
│   ├── audit-service       # Audit logging (Spring)
│   ├── auth-service        # Authentication (Spring)
│   ├── backend-gateway     # API Gateway (NestJS)
│   ├── bookmark-service    # Bookmarks (Go)
│   ├── call-service        # Voice/Video calls (Elixir)
│   ├── cdn-service         # CDN management (Go)
│   ├── channel-service     # Channels (Go)
│   ├── event-broadcast-service  # Event broadcasting (Elixir)
│   ├── export-service      # Data export (Python)
│   ├── file-service        # File storage (Go)
│   ├── huddle-service      # Huddles (Elixir)
│   ├── insights-service    # User insights (Python)
│   ├── integration-service # Third-party integrations (Python)
│   ├── media-service       # Media processing (Go)
│   ├── message-service     # Messaging (Elixir)
│   ├── ml-service          # ML inference (Python)
│   ├── moderation-service  # Content moderation (Python)
│   ├── notification-orchestrator  # Notification routing (Elixir)
│   ├── notification-service      # Push notifications (NestJS)
│   ├── permission-service  # RBAC (Spring)
│   ├── presence-service    # Online status (Elixir)
│   ├── realtime-service    # WebSocket server (NestJS)
│   ├── reminder-service    # Reminders (Go)
│   ├── search-service      # Full-text search (Go)
│   ├── sentiment-service   # Sentiment analysis (Python)
│   ├── smart-reply-service # Smart replies (Python)
│   ├── spark-etl           # Batch ETL pipeline (Scala/Spark)
│   ├── thread-service      # Threads (Go)
│   ├── user-service        # User management (Spring)
│   └── workspace-service   # Workspaces (Go)
└── web/                    # React web application
```

## Tech Stack

### Frontend
- **Web**: React 18, TypeScript, Vite, Tailwind CSS
- **Mobile**: React Native
- **Admin**: React Admin Dashboard

### Backend Services

| Stack | Services | Count |
|-------|----------|-------|
| **NestJS** | backend-gateway, notification-service, realtime-service | 3 |
| **Spring Boot** | auth, user, permission, audit, admin | 5 |
| **Elixir/Phoenix** | presence, message, call, notification-orchestrator, huddle, event-broadcast | 6 |
| **Go** | workspace, channel, thread, search, file, media, bookmark, reminder, attachment, cdn | 10 |
| **Python** | analytics, ml, moderation, export, integration, sentiment, insights, smart-reply | 8 |
| **Scala/Spark** | spark-etl | 1 |

### Infrastructure
- **Databases**: MongoDB, MySQL, PostgreSQL, Redis, Elasticsearch
- **Messaging**: Apache Kafka, RabbitMQ
- **Storage**: AWS S3, MinIO
- **Container Orchestration**: Kubernetes, AWS ECS
- **IaC**: Terraform
- **CI/CD**: Azure DevOps Pipelines, GitHub Actions
- **Monitoring**: Prometheus, Grafana, Loki, OpenTelemetry

### Cloud Services (Firebase)
- Firebase Authentication (OAuth2: Google, GitHub, Facebook)
- Cloud Firestore
- Firebase Hosting

## Repository Setup

This repository uses **Git submodules** to organize 40 independent components (apps, services, infrastructure).

### Cloning the Repository

```bash
# Clone with all submodules
git clone --recurse-submodules https://github.com/quikapp/quikapp.git

# Or if already cloned, initialize submodules
git submodule update --init --recursive
```

### Working with Submodules

```bash
# Update all submodules to latest commits
git submodule update --remote --merge

# Pull changes in main repo and all submodules
git pull --recurse-submodules

# Check submodule status
git submodule status

# Run command in all submodules
git submodule foreach 'git status'
```

### Submodule Structure

| Category | Submodules |
|----------|------------|
| **Apps** | `admin`, `web`, `mobile` |
| **Documentation** | `docs` |
| **Infrastructure** | `infrastructure` |
| **Packages** | `packages/api-client` |
| **Services** | 33 microservices in `services/*` |

### Adding Remote URLs

Submodules currently use local paths. To add remote repositories:

```bash
# Edit .gitmodules to update URLs
[submodule "admin"]
    path = admin
    url = https://github.com/your-org/quikapp-admin.git

# Sync the changes
git submodule sync

# Or use command line
git submodule set-url admin https://github.com/your-org/quikapp-admin.git
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Go 1.21+
- Python 3.12+
- Java 17+
- Elixir 1.15+

### Local Development

```bash
# Clone the repository
git clone https://github.com/quikapp/quikapp.git
cd quikapp

# Copy environment file
cp .env.example .env

# Option 1: Start infrastructure only (databases, brokers, monitoring)
cd infrastructure/docker
cp .env.example .env
docker compose -f docker-compose.infra.yml up -d

# Option 2: Start full stack (infrastructure + all 22 services)
docker compose -f docker-compose.infra.yml -f docker-compose.services.yml up -d

# Option 3: AWS local development with LocalStack
docker compose -f docker-compose.aws-local.yml up -d

# Start the web app (in a new terminal)
cd web && npm install && npm run dev

# Start backend gateway (in a new terminal)
cd services/backend-gateway && npm install && npm run dev
```

### Using Makefile

```bash
# Show all commands
make help

# Start infrastructure
make docker-up-infra

# Build all services
make build

# Run tests
make test

# Lint code
make lint
```

### Using Docker Compose

```bash
# Navigate to infrastructure/docker
cd infrastructure/docker

# Start infrastructure services (PostgreSQL, MongoDB, Redis, Kafka, etc.)
docker compose -f docker-compose.infra.yml up -d

# Start all application services (22 microservices)
docker compose -f docker-compose.infra.yml -f docker-compose.services.yml up -d

# View logs
docker compose -f docker-compose.infra.yml -f docker-compose.services.yml logs -f

# Stop everything
docker compose -f docker-compose.infra.yml -f docker-compose.services.yml down
```

**Service Access Points:**
| Service | URL |
|---------|-----|
| Grafana | http://localhost:3030 (admin/admin) |
| Prometheus | http://localhost:9090 |
| Jaeger | http://localhost:16686 |
| Kafka UI | http://localhost:8085 |
| API Gateway | http://localhost:3000 |

## Deployment

### Kubernetes (Helm)

```bash
cd infrastructure/terraform
make init ENV=dev
make apply ENV=dev

# Deploy with Helm
helm install quikapp infrastructure/helm/quikapp \
  --namespace quikapp \
  --create-namespace \
  -f infrastructure/helm/quikapp/values-development.yaml
```

### Kubernetes (Kustomize)

```bash
# Deploy to dev
kustomize build infrastructure/k8s/overlays/dev | kubectl apply -f -

# Deploy to prod
kustomize build infrastructure/k8s/overlays/prod | kubectl apply -f -
```

### Azure DevOps Pipelines

CI/CD pipelines are located in `infrastructure/azure-pipelines/`:

| Pipeline | Purpose |
|----------|---------|
| `docker-ci.yml` | Build and push Docker images to ACR |
| `terraform-cd.yml` | Deploy infrastructure per environment |
| `kubernetes-cd.yml` | Deploy services to AKS |
| `*-cd.yml` | Tech stack specific deployments |

```bash
# In Azure DevOps, create pipelines pointing to:
infrastructure/azure-pipelines/docker-ci.yml
infrastructure/azure-pipelines/terraform-cd.yml
infrastructure/azure-pipelines/kubernetes-cd.yml
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Documentation

- [API Documentation](docs/openapi/) - OpenAPI/Swagger specs
- [Services Overview](SERVICES.md) - Microservices architecture
- [Deployment Guide](DEPLOYMENT.md) - Deployment instructions
- [Infrastructure](infrastructure/README.md) - Infrastructure overview
- [Docker Setup](infrastructure/docker/README.md) - Docker Compose guide
- [Azure Pipelines](infrastructure/azure-pipelines/README.md) - CI/CD pipelines

## Development

### Project Commands

```bash
# Install all dependencies
make install

# Build all services
make build

# Run all tests
make test

# Lint all code
make lint

# Format code
make format
```

### Service-Specific Development

```bash
# NestJS services
cd services/backend-gateway && npm run dev

# Spring Boot services
cd services/auth-service && ./mvnw spring-boot:run

# Go services
cd services/workspace-service && go run .

# Python services
cd services/ml-service && python src/main.py

# Elixir services
cd services/message-service && mix phx.server
```

### API Client

```bash
# Generate TypeScript client from OpenAPI spec
make api-client-generate

# Build the client
make api-client-build
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=admin123
MYSQL_ROOT_PASSWORD=root123
POSTGRES_USER=quikapp
POSTGRES_PASSWORD=quikapp123

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Firebase
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id

# AWS (for S3, etc.)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.
