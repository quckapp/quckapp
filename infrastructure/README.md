# QuikApp Infrastructure

This directory contains all infrastructure-related configurations for deploying and operating QuikApp.

## Directory Structure

```
infrastructure/
├── azure-pipelines/    # Azure DevOps CI/CD pipelines
├── docker/             # Docker Compose & Dockerfiles
├── ecs/                # AWS ECS task definitions
├── helm/               # Helm charts for Kubernetes
├── k8s/                # Kubernetes manifests (Kustomize)
├── monitoring/         # Observability stack (Prometheus, Grafana, Loki)
├── nginx/              # Nginx reverse proxy configuration
├── scripts/            # Deployment & utility scripts
└── terraform/          # Infrastructure as Code (AWS/Azure)
```

## Components

### Azure Pipelines (`azure-pipelines/`)

Azure DevOps CI/CD pipelines for automated builds and deployments.

```
azure-pipelines/
├── docker-ci.yml              # Docker image builds
├── terraform-cd.yml           # Infrastructure deployment
├── terraform-promote.yml      # Multi-env infrastructure promotion
├── kubernetes-cd.yml          # Kubernetes deployments
├── kubernetes-promote.yml     # Multi-env K8s promotion
├── spring-boot-cd.yml         # Spring Boot service deployments
├── nestjs-cd.yml              # NestJS service deployments
├── elixir-cd.yml              # Elixir service deployments
├── go-cd.yml                  # Go service deployments
├── python-cd.yml              # Python service deployments
├── variable-groups.yml        # Variable group definitions
├── README.md                  # Pipeline documentation
└── templates/                 # Reusable pipeline templates
    ├── docker-build-*.yml     # Docker build templates per stack
    ├── terraform-*.yml        # Terraform operation templates
    ├── kubernetes-*.yml       # K8s deployment templates
    ├── deploy-*.yml           # Deployment step templates
    └── *-tests.yml            # Test execution templates
```

**Pipeline Setup:**
```bash
# In Azure DevOps, create pipelines pointing to:
infrastructure/azure-pipelines/docker-ci.yml
infrastructure/azure-pipelines/terraform-cd.yml
infrastructure/azure-pipelines/kubernetes-cd.yml
```

### Docker (`docker/`)

Docker configurations for local development and containerization.

```
docker/
├── docker-compose.infra.yml      # Infrastructure services
├── docker-compose.services.yml   # Application services (22 microservices)
├── docker-compose.aws-local.yml  # AWS alternatives (LocalStack)
├── .env.example                  # Environment variables template
├── README.md                     # Docker documentation
├── dockerfiles/                  # Multi-stage Dockerfiles
│   ├── springboot/Dockerfile
│   ├── nestjs/Dockerfile
│   ├── go/Dockerfile
│   ├── elixir/Dockerfile
│   └── python/Dockerfile
├── init-scripts/                 # Database initialization
│   ├── postgres/
│   ├── mongodb/
│   ├── clickhouse/
│   └── localstack/
└── config/                       # Service configurations
    ├── prometheus/
    └── grafana/
```

**Quick Start:**
```bash
cd infrastructure/docker
cp .env.example .env

# Start infrastructure only (databases, brokers, monitoring)
docker compose -f docker-compose.infra.yml up -d

# Start full stack (infrastructure + all 22 services)
docker compose -f docker-compose.infra.yml -f docker-compose.services.yml up -d

# AWS local development with LocalStack
docker compose -f docker-compose.aws-local.yml up -d
```

**Service Ports:**

| Category | Services | Ports |
|----------|----------|-------|
| Infrastructure | PostgreSQL, MongoDB, Redis, Kafka, etc. | 5432, 27017, 6379, 29092 |
| NestJS | Gateway, Auth, User, Notification | 3000-3002, 3010 |
| Spring Boot | Workspace, Channel, Permission, Audit, Admin | 3003-3004, 3011-3013 |
| Go | Message, Thread, File, Media, Search | 3005-3009 |
| Elixir | Realtime, Presence, Call, Huddle | 4000-4003 |
| Python | Analytics, ML, Moderation, Sentiment | 8000-8003 |
| Monitoring | Grafana, Prometheus, Jaeger | 3030, 9090, 16686 |

### Terraform (`terraform/`)

Infrastructure as Code for cloud resources.

```
terraform/
├── backend/              # S3/Azure state backend setup
├── environments/         # Environment configs
│   ├── dev/
│   ├── qa/
│   ├── staging/
│   └── prod/
└── modules/              # Reusable modules
    ├── api-gateway/
    ├── cloudfront/
    ├── cognito/
    ├── dynamodb/
    ├── elasticache/
    ├── iam/
    ├── kms/
    ├── lambda/
    ├── rds/
    ├── s3/
    ├── sns/
    ├── sqs/
    └── vpc/
```

**Quick Start:**
```bash
cd infrastructure/terraform/environments/dev
terraform init
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```

### Kubernetes (`k8s/`)

Kubernetes manifests using Kustomize for environment-specific deployments.

```
k8s/
├── base/                 # Base manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── *-deployment.yaml
│   ├── *-service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   └── kustomization.yaml
├── overlays/             # Environment overlays
│   ├── dev/
│   ├── qa/
│   ├── staging/
│   └── prod/
└── services/             # Service-specific manifests
    ├── spring-boot/
    ├── nestjs/
    ├── go/
    ├── elixir/
    └── python/
```

**Quick Start:**
```bash
# Deploy to dev environment
kustomize build infrastructure/k8s/overlays/dev | kubectl apply -f -

# Or with kubectl directly
kubectl apply -k infrastructure/k8s/overlays/dev
```

### Helm (`helm/`)

Helm charts for deploying QuikApp to Kubernetes clusters.

```
helm/
└── quikapp/
    ├── Chart.yaml
    ├── values.yaml
    ├── values-development.yaml
    ├── values-staging.yaml
    ├── values-production.yaml
    └── charts/
        ├── infrastructure/
        ├── monitoring/
        └── services/
```

**Quick Start:**
```bash
helm install quikapp infrastructure/helm/quikapp \
  --namespace quikapp \
  --create-namespace \
  -f infrastructure/helm/quikapp/values-development.yaml
```

### Monitoring (`monitoring/`)

Complete observability stack configurations.

| Component | Purpose |
|-----------|---------|
| `prometheus/` | Metrics collection and alerting rules |
| `grafana/` | Dashboards and visualizations |
| `alertmanager/` | Alert routing and notifications |
| `loki/` | Log aggregation |
| `promtail/` | Log collection agent |
| `otel/` | OpenTelemetry collector for distributed tracing |

**Access (via Docker Compose):**
- Grafana: http://localhost:3030 (admin/admin)
- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686
- Kafka UI: http://localhost:8085

### ECS (`ecs/`)

AWS Elastic Container Service configurations for serverless container deployments.

### Nginx (`nginx/`)

Reverse proxy and load balancer configuration.

- SSL/TLS termination
- Request routing
- Rate limiting
- WebSocket support

### Scripts (`scripts/`)

Deployment and utility scripts.

## Environment Matrix

| Environment | Docker Compose | Terraform | Helm Values | K8s Overlay |
|-------------|----------------|-----------|-------------|-------------|
| Local | `docker-compose.infra.yml` | - | - | - |
| Development | - | `dev` | `values-development.yaml` | `overlays/dev` |
| QA | - | `qa` | `values-qa.yaml` | `overlays/qa` |
| UAT | - | `uat` | `values-uat.yaml` | `overlays/uat` |
| Staging | - | `staging` | `values-staging.yaml` | `overlays/staging` |
| Production | - | `prod` | `values-production.yaml` | `overlays/prod` |

## CI/CD Integration

### Azure DevOps Pipelines

Pipelines are located in `infrastructure/azure-pipelines/`:

| Pipeline | Purpose |
|----------|---------|
| `docker-ci.yml` | Build and push Docker images to ACR |
| `terraform-cd.yml` | Deploy infrastructure per environment |
| `terraform-promote.yml` | Promote infrastructure across environments |
| `kubernetes-cd.yml` | Deploy services to AKS |
| `kubernetes-promote.yml` | Promote deployments across environments |
| `*-cd.yml` | Tech stack specific deployment pipelines |

### Pipeline Setup

1. **Create Service Connections** in Azure DevOps:
   - Azure Resource Manager connections per environment
   - Docker Registry (ACR) connection

2. **Create Variable Groups**:
   - See `azure-pipelines/variable-groups.yml` for definitions

3. **Create Pipelines**:
   ```
   infrastructure/azure-pipelines/docker-ci.yml
   infrastructure/azure-pipelines/terraform-cd.yml
   infrastructure/azure-pipelines/kubernetes-cd.yml
   ```

## Deployment Flows

### Local Development
```
infrastructure/docker/docker-compose.infra.yml → Local services
```

### CI/CD Pipeline
```
Code Push → Azure Pipelines → Docker Build → ACR → AKS Deployment
```

### Infrastructure Provisioning
```
Terraform Plan → Approval → Terraform Apply → Cloud Resources
```

## Quick Reference

| Task | Command |
|------|---------|
| Start local infra | `cd infrastructure/docker && docker compose -f docker-compose.infra.yml up -d` |
| Deploy to K8s dev | `kubectl apply -k infrastructure/k8s/overlays/dev` |
| Plan Terraform | `cd infrastructure/terraform/environments/dev && terraform plan` |
| Install Helm chart | `helm install quikapp infrastructure/helm/quikapp -n quikapp` |
