# QuikApp Helm Charts

Kubernetes Helm charts for deploying QuikApp - an enterprise communication platform with 32 microservices.

## Prerequisites

- Kubernetes 1.25+
- Helm 3.10+
- PV provisioner support (for persistent volumes)
- Ingress controller (nginx-ingress recommended)

## Quick Start

### Add Helm Repository (for dependencies)

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add elastic https://helm.elastic.co
helm repo add minio https://charts.min.io/
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update
```

### Update Dependencies

```bash
cd helm/quikapp
helm dependency build
cd charts/infrastructure && helm dependency build && cd ../..
cd charts/monitoring && helm dependency build && cd ../..
```

### Install QuikApp

#### Development Environment

```bash
helm install quikapp ./quikapp \
  -f quikapp/values-development.yaml \
  --namespace quikapp-dev \
  --create-namespace
```

#### Staging Environment

```bash
helm install quikapp ./quikapp \
  -f quikapp/values-staging.yaml \
  --namespace quikapp-staging \
  --create-namespace
```

#### Production Environment

```bash
helm install quikapp ./quikapp \
  -f quikapp/values-production.yaml \
  --namespace quikapp \
  --create-namespace
```

## Configuration

### Global Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.environment` | Environment name | `development` |
| `global.namespace` | Kubernetes namespace | `quikapp` |
| `global.domain` | Domain for ingress | `quikapp.local` |
| `global.tlsEnabled` | Enable TLS | `false` |
| `global.imagePullPolicy` | Image pull policy | `IfNotPresent` |

### Service Configuration

Each microservice supports the following configuration:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `<service>.enabled` | Enable the service | `true` |
| `<service>.replicaCount` | Number of replicas | `2` |
| `<service>.image.repository` | Docker image repository | varies |
| `<service>.image.tag` | Docker image tag | `latest` |
| `<service>.resources` | CPU/Memory resources | varies |
| `<service>.autoscaling.enabled` | Enable HPA | `true` |
| `<service>.autoscaling.minReplicas` | Minimum replicas | `2` |
| `<service>.autoscaling.maxReplicas` | Maximum replicas | varies |

### Infrastructure Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `infrastructure.enabled` | Deploy infrastructure | `true` |
| `infrastructure.redis.enabled` | Deploy Redis | `true` |
| `infrastructure.mysql.enabled` | Deploy MySQL | `true` |
| `infrastructure.postgresql.enabled` | Deploy PostgreSQL | `true` |
| `infrastructure.mongodb.enabled` | Deploy MongoDB | `true` |
| `infrastructure.kafka.enabled` | Deploy Kafka | `true` |
| `infrastructure.elasticsearch.enabled` | Deploy Elasticsearch | `true` |
| `infrastructure.minio.enabled` | Deploy MinIO | `true` |

### Monitoring Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `monitoring.enabled` | Deploy monitoring stack | `true` |
| `monitoring.prometheusStack.enabled` | Deploy Prometheus/Grafana | `true` |
| `monitoring.lokiStack.enabled` | Deploy Loki/Promtail | `true` |
| `monitoring.jaeger.enabled` | Deploy Jaeger | `true` |
| `monitoring.otelCollector.enabled` | Deploy OTel Collector | `true` |

## Architecture

```
quikapp/
├── Chart.yaml           # Main chart definition
├── values.yaml          # Default values
├── values-development.yaml
├── values-staging.yaml
├── values-production.yaml
├── templates/
│   ├── _helpers.tpl     # Template helpers
│   ├── deployment.yaml  # Deployment templates for all services
│   ├── service.yaml     # Service templates
│   ├── ingress.yaml     # Ingress configuration
│   ├── configmap.yaml   # ConfigMaps
│   ├── secret.yaml      # Secrets
│   ├── hpa.yaml         # Horizontal Pod Autoscalers
│   ├── pdb.yaml         # Pod Disruption Budgets
│   ├── networkpolicy.yaml
│   ├── serviceaccount.yaml
│   └── NOTES.txt
└── charts/
    ├── infrastructure/  # Databases, Redis, Kafka, etc.
    └── monitoring/      # Prometheus, Grafana, Loki, Jaeger
```

## Services Deployed

### NestJS Services (Port 3000-3002)
- backend-gateway
- notification-service
- realtime-service

### Spring Boot Services (Port 8080-8084)
- auth-service
- user-service
- permission-service
- audit-service
- admin-service

### Elixir Services (Port 4000-4005)
- presence-service
- message-service
- call-service
- notification-orchestrator
- huddle-service
- event-broadcast-service

### Go Services (Port 8090-8099)
- workspace-service
- channel-service
- thread-service
- search-service
- file-service
- media-service
- bookmark-service
- reminder-service
- attachment-service
- cdn-service

### Python Services (Port 5000-5007)
- analytics-service
- ml-service
- moderation-service
- export-service
- integration-service
- sentiment-service
- insights-service
- smart-reply-service

## Secrets Management

For production, replace the placeholder values in `quikapp-secrets`:

```bash
kubectl create secret generic quikapp-secrets \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  --from-literal=MYSQL_PASSWORD='your-mysql-password' \
  --from-literal=POSTGRES_PASSWORD='your-postgres-password' \
  --from-literal=MONGODB_PASSWORD='your-mongodb-password' \
  --from-literal=REDIS_PASSWORD='your-redis-password' \
  -n quikapp
```

Or use external secret management:
- HashiCorp Vault with External Secrets Operator
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

## Upgrade

```bash
helm upgrade quikapp ./quikapp \
  -f quikapp/values-production.yaml \
  --namespace quikapp
```

## Uninstall

```bash
helm uninstall quikapp --namespace quikapp
```

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n quikapp
```

### View logs
```bash
kubectl logs -f deployment/backend-gateway -n quikapp
```

### Check events
```bash
kubectl get events -n quikapp --sort-by=.metadata.creationTimestamp
```

### Validate templates
```bash
helm template quikapp ./quikapp -f quikapp/values-development.yaml
```

### Debug installation
```bash
helm install quikapp ./quikapp --dry-run --debug
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Test your changes locally
4. Submit a pull request

## License

Apache 2.0
