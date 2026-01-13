import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

interface ApplicationStatus {
  version: string;
  environment: string;
  uptime: number;
  startTime: Date;
  processId: number;
}

@Injectable()
export class ApplicationHealthIndicator extends HealthIndicator {
  private readonly startTime: Date;

  constructor(private configService: ConfigService) {
    super();
    this.startTime = new Date();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const status = this.getApplicationStatus();

      // Check if the application has been running for at least a few seconds
      // This helps catch startup issues
      if (status.uptime < 1) {
        const result = this.getStatus(key, false, {
          status: 'starting',
          message: 'Application is still initializing',
          uptime: status.uptime,
        });
        throw new HealthCheckError('Application not ready', result);
      }

      // Check memory usage threshold
      const memoryUsage = process.memoryUsage();
      const heapUsedPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;

      // Relaxed threshold for small instances (98% instead of 95%)
      if (heapUsedPercent > 0.98) {
        const result = this.getStatus(key, false, {
          status: 'memory_pressure',
          message: 'Application is under memory pressure',
          heapUsedPercent: `${(heapUsedPercent * 100).toFixed(2)}%`,
        });
        throw new HealthCheckError('Memory pressure detected', result);
      }

      return this.getStatus(key, true, {
        status: 'healthy',
        version: status.version,
        environment: status.environment,
        uptime: this.formatUptime(status.uptime),
        startTime: status.startTime.toISOString(),
        processId: status.processId,
        memory: {
          heapUsed: this.formatBytes(memoryUsage.heapUsed),
          heapTotal: this.formatBytes(memoryUsage.heapTotal),
          heapUsedPercent: `${(heapUsedPercent * 100).toFixed(2)}%`,
        },
      });
    } catch (error) {
      if (error instanceof HealthCheckError) {
        throw error;
      }

      const result = this.getStatus(key, false, {
        status: 'error',
        error: (error as Error).message,
      });
      throw new HealthCheckError('Application health check failed', result);
    }
  }

  private getApplicationStatus(): ApplicationStatus {
    return {
      version: this.configService.get('APP_VERSION') || '1.0.0',
      environment: this.configService.get('NODE_ENV') || 'development',
      uptime: process.uptime(),
      startTime: this.startTime,
      processId: process.pid,
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
