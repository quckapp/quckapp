# QuikApp Kubernetes Manifests

This directory contains all Kubernetes manifests for deploying the QuikApp microservices platform.

## Directory Structure

```
k8s/
├── base/                          # Base Kustomize configuration
│   ├── kustomization.yaml         # Main kustomization file
│   ├── namespace.yaml             # Namespace with quotas
│   ├── configmap.yaml             # ConfigMaps for all services
│   ├── secrets.yaml               # Secret templates
│   ├── rbac.yaml                  # Service accounts and roles
│   └── network-policies.yaml      # Network security policies
├── services/
│   ├── spring-boot/               # Java Spring Boot services
│   │   ├── auth-service.yaml      # Authentication & OAuth
│   │   ├── user-service.yaml      # User management
│   │   └── admin-services.yaml    # Permission, audit, admin
│   ├── nestjs/                    # Node.js NestJS services
│   │   ├── backend-gateway.yaml   # API Gateway
│   │   └── notification-realtime.yaml  # Notifications & WebSocket
│   ├── go/                        # Go services
│   │   └── core-services.yaml     # Workspace, channel, search, files
│   ├── elixir/                    # Elixir/Phoenix services
│   │   └── realtime-services.yaml # Presence, messaging, calls
│   └── python/                    # Python FastAPI services
│       └── analytics-ml-services.yaml  # Analytics, ML, moderation
├── ingress/
│   └── ingress.yaml               # Ingress controllers & TLS
└── overlays/                      # Environment-specific configs
    ├── dev/
    ├── qa/
    ├── staging/
    └── prod/
```

## Services Overview

### Spring Boot Services (Java)
| Service | Port | Description |
|---------|------|-------------|
| auth-service | 8080 | Authentication, OAuth2, MFA |
| user-service | 8080 | User profiles, accounts |
| permission-service | 8080 | RBAC permissions |
| audit-service | 8080 | Audit logging |
| admin-service | 8080 | Admin dashboard API |

### NestJS Services (Node.js)
| Service | Port | Description |
|---------|------|-------------|
| backend-gateway | 3000 | API Gateway, routing |
| notification-service | 3000 | Push/SMS notifications |
| realtime-service | 3000/3001 | Socket.io WebSocket |

### Go Services
| Service | Port | Description |
|---------|------|-------------|
| workspace-service | 8080/50051 | Workspace management |
| channel-service | 8080/50051 | Channel management |
| thread-service | 8080 | Thread management |
| search-service | 8080 | Search (Elasticsearch) |
| file-service | 8080 | File uploads |
| media-service | 8080 | Media processing |

### Elixir Services (Phoenix)
| Service | Port | Description |
|---------|------|-------------|
| presence-service | 4000 | User presence tracking |
| message-service | 4000 | Real-time messaging |
| call-service | 4000 | Voice/video calls |
| huddle-service | 4000 | Huddles (quick calls) |

### Python Services (FastAPI)
| Service | Port | Description |
|---------|------|-------------|
| analytics-service | 8000 | Analytics & metrics |
| ml-service | 8000/50051 | ML model inference |
| moderation-service | 8000 | Content moderation |
| sentiment-service | 8000 | Sentiment analysis |

## Prerequisites

- Kubernetes cluster 1.25+
- kubectl configured
- Kustomize 4.0+
- Helm 3.x (for dependencies)
- cert-manager (for TLS)
- NGINX Ingress Controller

## Deployment

### Using Kustomize

```bash
# Preview manifests for an environment
kubectl kustomize overlays/dev

# Deploy to development
kubectl apply -k overlays/dev

# Deploy to staging
kubectl apply -k overlays/staging

# Deploy to production
kubectl apply -k overlays/prod
```

### Using kubectl directly

```bash
# Create namespace and base resources
kubectl apply -f base/namespace.yaml
kubectl apply -f base/configmap.yaml
kubectl apply -f base/secrets.yaml
kubectl apply -f base/rbac.yaml
kubectl apply -f base/network-policies.yaml

# Deploy services
kubectl apply -f services/spring-boot/
kubectl apply -f services/nestjs/
kubectl apply -f services/go/
kubectl apply -f services/elixir/
kubectl apply -f services/python/

# Configure ingress
kubectl apply -f ingress/
```

### With specific image tags

```bash
# Set image tags during deployment
cd overlays/prod
kustomize edit set image quikapp.azurecr.io/backend-gateway:v1.2.3
kubectl apply -k .
```

## Configuration

### ConfigMaps

ConfigMaps are defined in `base/configmap.yaml`:

- `quikapp-common-config` - Common environment variables
- `quikapp-database-config` - Database connection settings
- `quikapp-broker-config` - Kafka/message broker config
- `quikapp-monitoring-config` - Observability settings

### Secrets

Secrets must be created before deployment:

```bash
# Create database secrets
kubectl create secret generic quikapp-database-secrets \
  --from-literal=POSTGRES_USERNAME=admin \
  --from-literal=POSTGRES_PASSWORD=<password> \
  --from-literal=REDIS_PASSWORD=<password> \
  --from-literal=MONGODB_URI=<uri> \
  -n quikapp

# Create JWT secrets
kubectl create secret generic quikapp-jwt-secrets \
  --from-literal=JWT_SECRET=<secret> \
  --from-literal=JWT_REFRESH_SECRET=<secret> \
  -n quikapp

# Create encryption secrets
kubectl create secret generic quikapp-encryption-secrets \
  --from-literal=SECRET_KEY_BASE=<key> \
  --from-literal=ENCRYPTION_KEY=<key> \
  -n quikapp
```

### Using Azure Key Vault

The manifests support Azure Key Vault CSI driver:

```yaml
# secrets.yaml includes SecretProviderClass for:
- quikapp-database-secrets
- quikapp-jwt-secrets
- quikapp-encryption-secrets
```

## Networking

### Network Policies

Default policies in `base/network-policies.yaml`:

- **Default deny** - All ingress/egress blocked by default
- **DNS allow** - Allow DNS resolution
- **Ingress allow** - Allow from ingress controller
- **Inter-service** - Allow backend to backend
- **Database access** - Allow to databases
- **Broker access** - Allow to Kafka/Redis
- **External HTTPS** - Allow outbound HTTPS

### Ingress

Three ingress configurations:

1. **API Ingress** (`api.quikapp.io`)
   - Routes to backend-gateway
   - Rate limiting enabled
   - CORS configured

2. **WebSocket Ingress** (`ws.quikapp.io`)
   - Sticky sessions for Socket.io
   - Long timeout for WebSocket
   - Routes to realtime-service

3. **Admin Ingress** (`admin.quikapp.io`)
   - IP whitelist protection
   - Basic auth enabled
   - Routes to admin-service

## Scaling

### Horizontal Pod Autoscaler

All critical services have HPA configured:

| Service | Min | Max | Target CPU |
|---------|-----|-----|------------|
| backend-gateway | 3 | 20 | 60% |
| realtime-service | 3 | 15 | 60% |
| presence-service | 3 | 12 | 60% |
| message-service | 3 | 15 | 60% |
| auth-service | 2 | 10 | 70% |

### Pod Disruption Budgets

PDBs ensure availability during updates:

```yaml
# Critical services maintain minimum available pods
backend-gateway-pdb: minAvailable: 2
realtime-service-pdb: minAvailable: 2
presence-service-pdb: minAvailable: 2
```

## Monitoring

### Prometheus Metrics

All services expose metrics:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "<port>"
  prometheus.io/path: "/metrics"
```

### Health Checks

Standard health endpoints:

- **Liveness**: `/health/live` or `/actuator/health/liveness`
- **Readiness**: `/health/ready` or `/actuator/health/readiness`

## Security

### Pod Security

All pods run with security best practices:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
```

### Service Accounts

Three service accounts with different permissions:

- `quikapp-service-account` - Full backend access
- `quikapp-backend-sa` - Standard backend services
- `quikapp-worker-sa` - Worker/batch services

## Environment Overlays

### Development (overlays/dev)
- Single replica per service
- Reduced resource limits
- Debug logging enabled
- CORS: `*`

### QA (overlays/qa)
- 1-2 replicas per service
- Moderate resources
- Info logging
- Environment-specific CORS

### Staging (overlays/staging)
- 2 replicas for critical services
- Near-production resources
- Info logging
- Environment-specific CORS

### Production (overlays/prod)
- Full replica counts
- Production resources
- Warn logging only
- Strict CORS origins
- Zone topology spread

## Troubleshooting

### Common Issues

**Pods not starting:**
```bash
kubectl describe pod <pod-name> -n quikapp
kubectl logs <pod-name> -n quikapp --previous
```

**Network connectivity:**
```bash
kubectl exec -it <pod-name> -n quikapp -- curl http://service-name/health
```

**Resource constraints:**
```bash
kubectl top pods -n quikapp
kubectl describe quota -n quikapp
```

### Useful Commands

```bash
# Check all resources
kubectl get all -n quikapp

# Watch deployments
kubectl get deployments -n quikapp -w

# Check HPA status
kubectl get hpa -n quikapp

# View network policies
kubectl get networkpolicies -n quikapp

# Check ingress status
kubectl get ingress -n quikapp
kubectl describe ingress quikapp-api-ingress -n quikapp
```

## Related Documentation

- [Infrastructure Terraform](../infrastructure/terraform/README.md)
- [Azure Pipelines](../azure-pipelines/README.md)
- [Architecture Overview](../docs/architecture.md)
