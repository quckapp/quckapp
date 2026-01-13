import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

export interface TimerResult {
  operation: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  operation: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
}

@Injectable()
export class PerformanceService {
  private timers: Map<string, { start: number; metadata?: Record<string, any> }> = new Map();
  private metrics: Map<string, number[]> = new Map();
  private readonly maxMetricEntries = 1000;

  constructor(private logger: LoggerService) {
    // Clean up old metrics every hour
    setInterval(() => this.cleanupMetrics(), 60 * 60 * 1000);
  }

  /**
   * Start a performance timer
   */
  startTimer(operation: string, metadata?: Record<string, any>): string {
    const timerId = `${operation}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.timers.set(timerId, { start: Date.now(), metadata });
    return timerId;
  }

  /**
   * End a performance timer and log the result
   */
  endTimer(timerId: string): TimerResult | null {
    const timer = this.timers.get(timerId);
    if (!timer) {
      this.logger.warn(`Timer not found: ${timerId}`);
      return null;
    }

    this.timers.delete(timerId);
    const endTime = Date.now();
    const duration = endTime - timer.start;
    const operation = timerId.split('_')[0];

    // Store metric for aggregation
    this.storeMetric(operation, duration);

    // Log the performance
    this.logger.logPerformance(operation, duration, timer.metadata);

    return {
      operation,
      duration,
      startTime: new Date(timer.start),
      endTime: new Date(endTime),
      metadata: timer.metadata,
    };
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const timerId = this.startTimer(operation, metadata);
    try {
      const result = await fn();
      this.endTimer(timerId);
      return result;
    } catch (error) {
      const timer = this.timers.get(timerId);
      if (timer) {
        const duration = Date.now() - timer.start;
        this.logger.error(`Performance: ${operation} failed after ${duration}ms`, {
          context: 'Performance',
          operation,
          duration,
          error: error.message,
          ...metadata,
        });
        this.timers.delete(timerId);
      }
      throw error;
    }
  }

  /**
   * Measure a sync operation
   */
  measureSync<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
    const start = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - start;
      this.storeMetric(operation, duration);
      this.logger.logPerformance(operation, duration, metadata);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error(`Performance: ${operation} failed after ${duration}ms`, {
        context: 'Performance',
        operation,
        duration,
        error: error.message,
        ...metadata,
      });
      throw error;
    }
  }

  /**
   * Get performance metrics for an operation
   */
  getMetrics(operation: string): PerformanceMetrics | null {
    const durations = this.metrics.get(operation);
    if (!durations || durations.length === 0) {
      return null;
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const count = sorted.length;
    const totalDuration = sorted.reduce((sum, d) => sum + d, 0);

    return {
      operation,
      count,
      totalDuration,
      avgDuration: Math.round(totalDuration / count),
      minDuration: sorted[0],
      maxDuration: sorted[count - 1],
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    const allMetrics: PerformanceMetrics[] = [];
    for (const operation of this.metrics.keys()) {
      const metrics = this.getMetrics(operation);
      if (metrics) {
        allMetrics.push(metrics);
      }
    }
    return allMetrics.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Log a summary of all metrics
   */
  logMetricsSummary(): void {
    const allMetrics = this.getAllMetrics();
    if (allMetrics.length === 0) {
      this.logger.log('No performance metrics collected yet');
      return;
    }

    this.logger.log('Performance Metrics Summary', {
      context: 'Performance',
      type: 'summary',
      metrics: allMetrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Clear metrics for an operation
   */
  clearMetrics(operation?: string): void {
    if (operation) {
      this.metrics.delete(operation);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Create a decorator-like function for measuring method performance
   */
  createMeasureDecorator(
    operationPrefix: string,
  ): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
    const self = this;
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor {
      const originalMethod = descriptor.value;
      const operation = `${operationPrefix}.${propertyKey}`;

      descriptor.value = async function (...args: any[]) {
        return self.measure(operation, () => originalMethod.apply(this, args));
      };

      return descriptor;
    };
  }

  private storeMetric(operation: string, duration: number): void {
    let durations = this.metrics.get(operation);
    if (!durations) {
      durations = [];
      this.metrics.set(operation, durations);
    }

    durations.push(duration);

    // Keep only the last N entries
    if (durations.length > this.maxMetricEntries) {
      durations.shift();
    }
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) {
      return 0;
    }
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private cleanupMetrics(): void {
    // Keep only recent metrics by trimming each operation's data
    for (const [operation, durations] of this.metrics) {
      if (durations.length > this.maxMetricEntries / 2) {
        this.metrics.set(operation, durations.slice(-this.maxMetricEntries / 2));
      }
    }
  }
}

/**
 * Decorator for measuring method performance
 * Usage: @MeasurePerformance('ServiceName')
 */
export function MeasurePerformance(operationPrefix: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const operation = `${operationPrefix}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;

        // Log to console in development
        if (process.env.NODE_ENV === 'development' && duration > 100) {
          console.log(`[Performance] ${operation}: ${duration}ms`);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - start;
        console.error(`[Performance] ${operation} failed: ${duration}ms - ${error.message}`);
        throw error;
      }
    };

    return descriptor;
  };
}
