import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health';
import { ApplicationHealthIndicator } from './indicators/application.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private redis: RedisHealthIndicator,
    private application: ApplicationHealthIndicator,
  ) {}

  /**
   * Main health check endpoint
   * Returns comprehensive health status of all services
   */
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health Check',
    description: 'Comprehensive health status of all services',
  })
  @ApiResponse({ status: 200, description: 'All services healthy' })
  @ApiResponse({ status: 503, description: 'One or more services unhealthy' })
  async check() {
    return this.health.check([
      // Database health
      () => this.mongoose.pingCheck('mongodb'),

      // Redis health (optional - won't fail if not configured)
      () => this.redis.isHealthy('redis'),

      // Memory health - Check heap usage (max 500MB)
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),

      // Memory health - Check RSS (max 1GB)
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),

      // Disk health - Check disk space (fail only if more than 90% used)
      () =>
        this.disk.checkStorage('disk', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9,
        }),

      // Application-specific checks
      () => this.application.isHealthy('application'),
    ]);
  }

  /**
   * Liveness probe for Kubernetes
   * Indicates if the application is running
   */
  @Get('live')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness Probe',
    description: 'Kubernetes liveness probe - indicates if app is running',
  })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  async liveness() {
    return this.health.check([
      // Basic check - just ensure the app is responding
      () => this.application.isHealthy('liveness'),
    ]);
  }

  /**
   * Readiness probe for Kubernetes
   * Indicates if the application is ready to receive traffic
   */
  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness Probe',
    description: 'Kubernetes readiness probe - indicates if app is ready for traffic',
  })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application not ready' })
  async readiness() {
    return this.health.check([
      // Check database connectivity
      () => this.mongoose.pingCheck('mongodb'),

      // Check Redis if configured
      () => this.redis.isHealthy('redis'),

      // Memory check for readiness
      () => this.memory.checkHeap('memory', 400 * 1024 * 1024),
    ]);
  }

  /**
   * Database health check endpoint
   */
  @Get('db')
  @HealthCheck()
  async database() {
    return this.health.check([() => this.mongoose.pingCheck('mongodb')]);
  }

  /**
   * Memory health check endpoint
   */
  @Get('memory')
  @HealthCheck()
  async memoryCheck() {
    return this.health.check([
      () => this.memory.checkHeap('heap', 500 * 1024 * 1024),
      () => this.memory.checkRSS('rss', 1024 * 1024 * 1024),
    ]);
  }

  /**
   * Detailed metrics endpoint
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Application Metrics',
    description: 'Detailed system metrics including memory, CPU, and uptime',
  })
  @ApiResponse({ status: 200, description: 'Metrics returned' })
  async metrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const cpuUsage = process.cpuUsage();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptime,
        formatted: this.formatUptime(uptime),
      },
      memory: {
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        rss: this.formatBytes(memoryUsage.rss),
        external: this.formatBytes(memoryUsage.external),
        arrayBuffers: this.formatBytes(memoryUsage.arrayBuffers),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) {
      parts.push(`${days}d`);
    }
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    parts.push(`${secs}s`);

    return parts.join(' ');
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}
