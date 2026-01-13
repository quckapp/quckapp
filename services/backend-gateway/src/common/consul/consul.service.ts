import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Consul = require('consul');

/**
 * Consul module options
 */
export interface ConsulModuleOptions {
  /** Consul agent host */
  host?: string;
  /** Consul agent port */
  port?: number;
  /** Use HTTPS */
  secure?: boolean;
  /** ACL token for authentication */
  token?: string;
  /** Datacenter name */
  datacenter?: string;
  /** Service registration options */
  service?: {
    /** Service name */
    name: string;
    /** Service ID (unique per instance) */
    id?: string;
    /** Service port */
    port: number;
    /** Service tags */
    tags?: string[];
    /** Service address */
    address?: string;
    /** Health check configuration */
    check?: ConsulHealthCheck;
  };
  /** Enable service registration on startup */
  registerOnInit?: boolean;
  /** Enable KV store watching */
  enableKVWatch?: boolean;
}

export interface ConsulHealthCheck {
  /** HTTP health check URL */
  http?: string;
  /** TCP health check address */
  tcp?: string;
  /** Health check interval */
  interval?: string;
  /** Health check timeout */
  timeout?: string;
  /** Deregister after critical */
  deregisterCriticalServiceAfter?: string;
}

export const CONSUL_MODULE_OPTIONS = 'CONSUL_MODULE_OPTIONS';

/**
 * Service health status
 */
export interface ServiceHealth {
  service: string;
  id: string;
  address: string;
  port: number;
  status: 'passing' | 'warning' | 'critical';
  tags: string[];
}

/**
 * ConsulService - HashiCorp Consul integration for service discovery and configuration
 *
 * Features:
 * - Service registration and deregistration
 * - Service discovery with health filtering
 * - Key-Value store for dynamic configuration
 * - Health check management
 * - Watch for configuration changes
 * - Leader election support
 */
@Injectable()
export class ConsulService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConsulService.name);
  private client: any;
  private isRegistered = false;
  private watchers: Map<string, any> = new Map();
  private serviceId: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(CONSUL_MODULE_OPTIONS)
    private readonly options?: ConsulModuleOptions,
  ) {
    const host =
      this.options?.host ||
      this.configService.get<string>('CONSUL_HOST') ||
      'localhost';
    const port =
      this.options?.port ||
      parseInt(this.configService.get<string>('CONSUL_PORT') || '8500', 10);
    const secure =
      this.options?.secure ||
      this.configService.get<string>('CONSUL_SECURE') === 'true';
    const token =
      this.options?.token ||
      this.configService.get<string>('CONSUL_TOKEN');
    const datacenter =
      this.options?.datacenter ||
      this.configService.get<string>('CONSUL_DATACENTER');

    this.client = new Consul({
      host,
      port,
      secure,
      defaults: {
        token,
        dc: datacenter,
      },
      promisify: true,
    });
  }

  async onModuleInit() {
    if (this.options?.registerOnInit !== false && this.options?.service) {
      try {
        await this.registerService();
      } catch (error: any) {
        this.logger.warn(
          `Failed to register service with Consul: ${error.message}. Will retry on next health check.`,
        );
      }
    }
  }

  async onModuleDestroy() {
    // Stop all watchers
    for (const [key, watcher] of this.watchers) {
      watcher.end();
      this.logger.debug(`Stopped watcher for key: ${key}`);
    }
    this.watchers.clear();

    // Deregister service
    if (this.isRegistered && this.serviceId) {
      try {
        await this.deregisterService();
      } catch (error: any) {
        this.logger.warn(`Failed to deregister service: ${error.message}`);
      }
    }
  }

  /**
   * Register the current service with Consul
   */
  async registerService(serviceConfig?: ConsulModuleOptions['service']): Promise<void> {
    const config = serviceConfig || this.options?.service;
    if (!config) {
      throw new Error('Service configuration is required for registration');
    }

    const serviceId = config.id || `${config.name}-${process.pid}`;
    this.serviceId = serviceId;

    const registration: any = {
      id: serviceId,
      name: config.name,
      port: config.port,
      tags: config.tags || [],
      address: config.address || this.getLocalAddress(),
    };

    if (config.check) {
      registration.check = {
        http: config.check.http,
        tcp: config.check.tcp,
        interval: config.check.interval || '10s',
        timeout: config.check.timeout || '5s',
        deregistercriticalserviceafter:
          config.check.deregisterCriticalServiceAfter || '1m',
      };
    }

    try {
      await this.client.agent.service.register(registration);
      this.isRegistered = true;
      this.logger.log(`Registered service: ${config.name} (${serviceId})`);
    } catch (error: any) {
      this.logger.error(`Failed to register service: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deregister the current service from Consul
   */
  async deregisterService(): Promise<void> {
    if (!this.serviceId) {
      return;
    }

    try {
      await this.client.agent.service.deregister(this.serviceId);
      this.isRegistered = false;
      this.logger.log(`Deregistered service: ${this.serviceId}`);
    } catch (error: any) {
      this.logger.error(`Failed to deregister service: ${error.message}`);
      throw error;
    }
  }

  /**
   * Discover healthy instances of a service
   */
  async discoverService(
    serviceName: string,
    options?: { passing?: boolean; tag?: string },
  ): Promise<ServiceHealth[]> {
    try {
      const result = await this.client.health.service({
        service: serviceName,
        passing: options?.passing !== false,
        tag: options?.tag,
      });

      return result.map((entry: any) => ({
        service: entry.Service.Service,
        id: entry.Service.ID,
        address: entry.Service.Address || entry.Node.Address,
        port: entry.Service.Port,
        status: this.getOverallStatus(entry.Checks),
        tags: entry.Service.Tags || [],
      }));
    } catch (error: any) {
      this.logger.error(`Failed to discover service ${serviceName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a random healthy instance of a service (simple load balancing)
   */
  async getServiceInstance(
    serviceName: string,
    options?: { tag?: string },
  ): Promise<ServiceHealth | null> {
    const instances = await this.discoverService(serviceName, {
      passing: true,
      tag: options?.tag,
    });

    if (instances.length === 0) {
      return null;
    }

    // Random selection for simple load balancing
    const randomIndex = Math.floor(Math.random() * instances.length);
    return instances[randomIndex];
  }

  /**
   * Get service URL (address:port)
   */
  async getServiceUrl(
    serviceName: string,
    options?: { tag?: string; protocol?: string },
  ): Promise<string | null> {
    const instance = await this.getServiceInstance(serviceName, options);
    if (!instance) {
      return null;
    }

    const protocol = options?.protocol || 'http';
    return `${protocol}://${instance.address}:${instance.port}`;
  }

  /**
   * Get a value from the KV store
   */
  async getKV<T = string>(key: string): Promise<T | null> {
    try {
      const result = await this.client.kv.get(key);
      if (!result) {
        return null;
      }

      const value = Buffer.from(result.Value, 'base64').toString('utf8');

      // Try to parse as JSON
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error: any) {
      this.logger.error(`Failed to get KV key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set a value in the KV store
   */
  async setKV(
    key: string,
    value: string | object,
    options?: { cas?: number; flags?: number },
  ): Promise<boolean> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      const result = await this.client.kv.set({
        key,
        value: stringValue,
        cas: options?.cas,
        flags: options?.flags,
      });

      this.logger.debug(`Set KV key: ${key}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to set KV key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a key from the KV store
   */
  async deleteKV(key: string, options?: { recurse?: boolean }): Promise<boolean> {
    try {
      await this.client.kv.del({
        key,
        recurse: options?.recurse,
      });

      this.logger.debug(`Deleted KV key: ${key}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to delete KV key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * List keys with a prefix
   */
  async listKV(prefix: string): Promise<string[]> {
    try {
      const result = await this.client.kv.keys(prefix);
      return result || [];
    } catch (error: any) {
      if (error.message.includes('404')) {
        return [];
      }
      this.logger.error(`Failed to list KV keys with prefix ${prefix}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Watch a KV key for changes
   */
  watchKV(
    key: string,
    callback: (value: any, error?: Error) => void,
    options?: { initialFetch?: boolean },
  ): void {
    if (this.watchers.has(key)) {
      this.logger.warn(`Already watching key: ${key}`);
      return;
    }

    const watcher = this.client.watch({
      method: this.client.kv.get,
      options: { key },
    });

    watcher.on('change', (data: any) => {
      if (data) {
        const value = Buffer.from(data.Value, 'base64').toString('utf8');
        try {
          callback(JSON.parse(value));
        } catch {
          callback(value);
        }
      } else {
        callback(null);
      }
    });

    watcher.on('error', (error: Error) => {
      this.logger.error(`Watch error for key ${key}: ${error.message}`);
      callback(null, error);
    });

    this.watchers.set(key, watcher);
    this.logger.debug(`Started watching key: ${key}`);

    // Initial fetch if requested
    if (options?.initialFetch !== false) {
      this.getKV(key)
        .then((value) => callback(value))
        .catch((error) => callback(null, error));
    }
  }

  /**
   * Stop watching a KV key
   */
  unwatchKV(key: string): void {
    const watcher = this.watchers.get(key);
    if (watcher) {
      watcher.end();
      this.watchers.delete(key);
      this.logger.debug(`Stopped watching key: ${key}`);
    }
  }

  /**
   * Acquire a lock (for leader election or distributed locking)
   */
  async acquireLock(
    key: string,
    sessionId: string,
    value?: string,
  ): Promise<boolean> {
    try {
      const result = await this.client.kv.set({
        key,
        value: value || sessionId,
        acquire: sessionId,
      });

      if (result) {
        this.logger.debug(`Acquired lock: ${key}`);
      }
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to acquire lock ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Release a lock
   */
  async releaseLock(key: string, sessionId: string): Promise<boolean> {
    try {
      const result = await this.client.kv.set({
        key,
        release: sessionId,
      });

      if (result) {
        this.logger.debug(`Released lock: ${key}`);
      }
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to release lock ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a session for locking
   */
  async createSession(options?: {
    name?: string;
    ttl?: string;
    behavior?: 'release' | 'delete';
    lockDelay?: string;
  }): Promise<string> {
    try {
      const result = await this.client.session.create({
        name: options?.name || `quckchat-${process.pid}`,
        ttl: options?.ttl || '30s',
        behavior: options?.behavior || 'release',
        lockdelay: options?.lockDelay || '15s',
      });

      this.logger.debug(`Created session: ${result.ID}`);
      return result.ID;
    } catch (error: any) {
      this.logger.error(`Failed to create session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    try {
      await this.client.session.destroy(sessionId);
      this.logger.debug(`Destroyed session: ${sessionId}`);
    } catch (error: any) {
      this.logger.error(`Failed to destroy session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Renew a session
   */
  async renewSession(sessionId: string): Promise<void> {
    try {
      await this.client.session.renew(sessionId);
      this.logger.debug(`Renewed session: ${sessionId}`);
    } catch (error: any) {
      this.logger.error(`Failed to renew session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Consul agent health
   */
  async getAgentHealth(): Promise<{
    agent: string;
    datacenter: string;
    leader: string;
    members: number;
  }> {
    try {
      const [self, members] = await Promise.all([
        this.client.agent.self(),
        this.client.agent.members(),
      ]);

      return {
        agent: self.Config.NodeName,
        datacenter: self.Config.Datacenter,
        leader: self.Stats.consul.leader,
        members: members.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get agent health: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if service is registered
   */
  isServiceRegistered(): boolean {
    return this.isRegistered;
  }

  /**
   * Get the underlying Consul client for advanced operations
   */
  getClient(): any {
    return this.client;
  }

  /**
   * Get local IP address
   */
  private getLocalAddress(): string {
    const os = require('os');
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }

    return '127.0.0.1';
  }

  /**
   * Get overall health status from checks
   */
  private getOverallStatus(
    checks: any[],
  ): 'passing' | 'warning' | 'critical' {
    if (checks.some((c: any) => c.Status === 'critical')) {
      return 'critical';
    }
    if (checks.some((c: any) => c.Status === 'warning')) {
      return 'warning';
    }
    return 'passing';
  }
}
