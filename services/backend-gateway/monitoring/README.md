# QuickChat Monitoring Stack

This directory contains configuration files for the QuickChat monitoring and observability stack.

## Components

### 1. Prometheus (Metrics Collection)
- **URL**: http://localhost:9090
- Collects metrics from the QuickChat backend at `/metrics` endpoint
- Custom metrics include:
  - HTTP request rate and duration
  - WebSocket connections
  - Message throughput
  - Authentication attempts
  - Background job processing
  - Database query performance
  - Cache hit/miss rates

### 2. Grafana (Visualization)
- **URL**: http://localhost:3001
- **Default credentials**: admin / quickchat_admin
- Pre-configured dashboards:
  - **QuickChat Overview**: High-level application health
  - System resource usage
  - Request rate and latency by route
  - WebSocket connection monitoring

### 3. Jaeger (Distributed Tracing)
- **URL**: http://localhost:16686
- Traces requests across the application
- Helps identify performance bottlenecks
- Correlates logs with traces

### 4. AlertManager (Alert Routing)
- **URL**: http://localhost:9093
- Routes alerts to appropriate channels
- Configurable notification receivers (Slack, Email, PagerDuty)

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- QuickChat backend running on port 3000

### Starting the Monitoring Stack

```bash
# Navigate to the monitoring directory
cd backend/monitoring

# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f

# Stop all services
docker-compose -f docker-compose.monitoring.yml down
```

### Verifying Setup

1. **Check Prometheus targets**: http://localhost:9090/targets
2. **Access Grafana**: http://localhost:3001 (admin/quickchat_admin)
3. **View traces in Jaeger**: http://localhost:16686

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Sentry Error Tracking
SENTRY_DSN=your-sentry-dsn-here
SENTRY_ENABLE_DEV=false
APP_VERSION=1.0.0

# OpenTelemetry Tracing
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=quickchat-backend
```

### Customizing Alerts

Edit `alertmanager/alertmanager.yml` to configure notification receivers:

```yaml
receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
```

### Adding Custom Metrics

Use the `MetricsService` in your code:

```typescript
import { MetricsService } from './common/monitoring/prometheus';

@Injectable()
export class YourService {
  constructor(private metrics: MetricsService) {}

  async someMethod() {
    const stopTimer = this.metrics.startTimer();
    // ... your code ...
    const duration = stopTimer();
    this.metrics.observeDatabaseQueryDuration('find', 'users', duration);
  }
}
```

### Adding Custom Tracing

Use the `TracingService` for distributed tracing:

```typescript
import { TracingService } from './common/monitoring/tracing';

@Injectable()
export class YourService {
  constructor(private tracing: TracingService) {}

  async someMethod() {
    return this.tracing.withSpan('operation-name', async (span) => {
      span?.setAttribute('custom.attribute', 'value');
      // ... your code ...
    });
  }
}
```

## Endpoints

| Service | Port | Description |
|---------|------|-------------|
| QuickChat Backend | 3000 | Main application |
| Metrics | 3000/metrics | Prometheus metrics |
| Prometheus | 9090 | Metrics storage & queries |
| Grafana | 3001 | Dashboards |
| Jaeger UI | 16686 | Trace viewer |
| Jaeger OTLP HTTP | 4318 | Trace collector |
| AlertManager | 9093 | Alert routing |

## Troubleshooting

### Prometheus can't scrape metrics
- Ensure the backend is running
- Check that `/metrics` endpoint is accessible
- Verify network connectivity (use `host.docker.internal` for Windows/Mac)

### Traces not appearing in Jaeger
- Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`
- Restart the application after setting the env var
- Check Jaeger logs: `docker logs quickchat-jaeger`

### Grafana dashboards not loading
- Wait for Grafana to fully start
- Check datasource connectivity in Grafana → Configuration → Data Sources
- Verify Prometheus is running and accessible

## Production Deployment

For production, consider:

1. **Use managed services**:
   - Grafana Cloud for visualization
   - Datadog, New Relic, or Honeycomb for APM
   - Sentry for error tracking

2. **Security**:
   - Change default passwords
   - Enable authentication on Prometheus/Grafana
   - Use HTTPS for all endpoints
   - Restrict network access

3. **Scaling**:
   - Use Prometheus federation for multiple instances
   - Configure retention policies
   - Use external storage (Cortex, Thanos, Victoria Metrics)
