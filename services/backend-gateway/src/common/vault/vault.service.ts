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
const vault = require('node-vault');

/**
 * Vault secret engines
 */
export const VAULT_ENGINES = {
  KV_V2: 'kv-v2',
  KV_V1: 'kv',
  DATABASE: 'database',
  AWS: 'aws',
  TRANSIT: 'transit',
  PKI: 'pki',
} as const;

/**
 * Common secret paths
 */
export const VAULT_PATHS = {
  // Application secrets
  APP_SECRETS: 'secret/data/quckchat',
  DATABASE: 'secret/data/quckchat/database',
  JWT: 'secret/data/quckchat/jwt',
  ENCRYPTION: 'secret/data/quckchat/encryption',

  // Third-party API keys
  FIREBASE: 'secret/data/quckchat/firebase',
  OPENAI: 'secret/data/quckchat/openai',
  SMTP: 'secret/data/quckchat/smtp',

  // Infrastructure secrets
  REDIS: 'secret/data/quckchat/redis',
  KAFKA: 'secret/data/quckchat/kafka',
  RABBITMQ: 'secret/data/quckchat/rabbitmq',

  // Dynamic database credentials
  DB_CREDS: 'database/creds/quckchat-role',
} as const;

export type VaultPath = (typeof VAULT_PATHS)[keyof typeof VAULT_PATHS];

/**
 * Vault module options
 */
export interface VaultModuleOptions {
  /** Vault server address */
  endpoint?: string;
  /** Vault token for authentication */
  token?: string;
  /** AppRole auth method */
  appRole?: {
    roleId: string;
    secretId: string;
  };
  /** Kubernetes auth method */
  kubernetes?: {
    role: string;
    jwt?: string;
    jwtPath?: string;
  };
  /** API version */
  apiVersion?: string;
  /** Request timeout in ms */
  requestTimeout?: number;
  /** Namespace (enterprise feature) */
  namespace?: string;
  /** Enable secret caching */
  enableCaching?: boolean;
  /** Cache TTL in seconds */
  cacheTtl?: number;
}

export const VAULT_MODULE_OPTIONS = 'VAULT_MODULE_OPTIONS';

/**
 * Cached secret interface
 */
interface CachedSecret {
  data: Record<string, any>;
  expiresAt: number;
  leaseId?: string;
  leaseDuration?: number;
}

/**
 * VaultService - HashiCorp Vault integration for secrets management
 *
 * Features:
 * - Multiple auth methods (Token, AppRole, Kubernetes)
 * - KV v2 secrets engine support
 * - Dynamic database credentials
 * - Transit encryption/decryption
 * - Secret caching with TTL
 * - Lease renewal for dynamic secrets
 */
@Injectable()
export class VaultService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VaultService.name);
  private client: any;
  private isAuthenticated = false;
  private readonly secretCache: Map<string, CachedSecret> = new Map();
  private leaseRenewalIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly cacheTtl: number;
  private readonly enableCaching: boolean;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(VAULT_MODULE_OPTIONS)
    private readonly options?: VaultModuleOptions,
  ) {
    this.enableCaching = this.options?.enableCaching ?? true;
    this.cacheTtl = (this.options?.cacheTtl ?? 300) * 1000; // Convert to ms

    const endpoint =
      this.options?.endpoint ||
      this.configService.get<string>('VAULT_ADDR') ||
      'http://127.0.0.1:8200';

    this.client = vault({
      apiVersion: this.options?.apiVersion || 'v1',
      endpoint,
      requestOptions: {
        timeout: this.options?.requestTimeout || 10000,
      },
      namespace: this.options?.namespace || this.configService.get<string>('VAULT_NAMESPACE'),
    });
  }

  async onModuleInit() {
    try {
      await this.authenticate();
    } catch (error: any) {
      this.logger.warn(`Vault authentication failed on init: ${error.message}. Will retry on usage.`);
    }
  }

  async onModuleDestroy() {
    // Clear all lease renewal intervals
    for (const [leaseId, interval] of this.leaseRenewalIntervals) {
      clearInterval(interval);
      this.logger.debug(`Stopped lease renewal for ${leaseId}`);
    }
    this.leaseRenewalIntervals.clear();
    this.secretCache.clear();
  }

  /**
   * Authenticate with Vault
   */
  async authenticate(): Promise<void> {
    if (this.isAuthenticated) return;

    try {
      // Try token auth first
      const token =
        this.options?.token || this.configService.get<string>('VAULT_TOKEN');

      if (token) {
        this.client.token = token;
        await this.client.health();
        this.isAuthenticated = true;
        this.logger.log('Authenticated with Vault using token');
        return;
      }

      // Try AppRole auth
      const roleId =
        this.options?.appRole?.roleId ||
        this.configService.get<string>('VAULT_ROLE_ID');
      const secretId =
        this.options?.appRole?.secretId ||
        this.configService.get<string>('VAULT_SECRET_ID');

      if (roleId && secretId) {
        const result = await this.client.approleLogin({
          role_id: roleId,
          secret_id: secretId,
        });
        this.client.token = result.auth.client_token;
        this.isAuthenticated = true;
        this.logger.log('Authenticated with Vault using AppRole');

        // Schedule token renewal
        this.scheduleTokenRenewal(result.auth.lease_duration);
        return;
      }

      // Try Kubernetes auth
      const k8sRole =
        this.options?.kubernetes?.role ||
        this.configService.get<string>('VAULT_K8S_ROLE');

      if (k8sRole) {
        let jwt = this.options?.kubernetes?.jwt;

        if (!jwt) {
          const jwtPath =
            this.options?.kubernetes?.jwtPath ||
            '/var/run/secrets/kubernetes.io/serviceaccount/token';

          try {
            const fs = await import('fs');
            jwt = fs.readFileSync(jwtPath, 'utf8');
          } catch {
            throw new Error('Failed to read Kubernetes service account token');
          }
        }

        const result = await this.client.kubernetesLogin({
          role: k8sRole,
          jwt,
        });
        this.client.token = result.auth.client_token;
        this.isAuthenticated = true;
        this.logger.log('Authenticated with Vault using Kubernetes');

        this.scheduleTokenRenewal(result.auth.lease_duration);
        return;
      }

      throw new Error('No valid Vault authentication method configured');
    } catch (error: any) {
      this.logger.error(`Vault authentication failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule token renewal before expiration
   */
  private scheduleTokenRenewal(leaseDuration: number): void {
    // Renew at 75% of lease duration
    const renewInterval = (leaseDuration * 0.75) * 1000;

    const interval = setInterval(async () => {
      try {
        const result = await this.client.tokenRenewSelf();
        this.logger.debug(`Renewed Vault token, new TTL: ${result.auth.lease_duration}s`);
      } catch (error: any) {
        this.logger.error(`Failed to renew Vault token: ${error.message}`);
        // Try to re-authenticate
        this.isAuthenticated = false;
        await this.authenticate();
      }
    }, renewInterval);

    this.leaseRenewalIntervals.set('token', interval);
  }

  /**
   * Read a secret from KV v2 engine
   */
  async readSecret<T = Record<string, any>>(
    path: VaultPath | string,
    options?: { version?: number },
  ): Promise<T> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    // Check cache first
    if (this.enableCaching) {
      const cached = this.secretCache.get(path);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.debug(`Cache hit for secret: ${path}`);
        return cached.data as T;
      }
    }

    try {
      const result = await this.client.read(path, options);
      const data = result.data?.data || result.data;

      // Cache the secret
      if (this.enableCaching) {
        this.secretCache.set(path, {
          data,
          expiresAt: Date.now() + this.cacheTtl,
          leaseId: result.lease_id,
          leaseDuration: result.lease_duration,
        });
      }

      this.logger.debug(`Read secret from path: ${path}`);
      return data as T;
    } catch (error: any) {
      this.logger.error(`Failed to read secret from ${path}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Write a secret to KV v2 engine
   */
  async writeSecret(
    path: VaultPath | string,
    data: Record<string, any>,
    options?: { cas?: number },
  ): Promise<void> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    try {
      await this.client.write(path, {
        data,
        options: options?.cas !== undefined ? { cas: options.cas } : undefined,
      });

      // Invalidate cache
      this.secretCache.delete(path);

      this.logger.debug(`Wrote secret to path: ${path}`);
    } catch (error: any) {
      this.logger.error(`Failed to write secret to ${path}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a secret from KV v2 engine
   */
  async deleteSecret(path: VaultPath | string): Promise<void> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    try {
      await this.client.delete(path);
      this.secretCache.delete(path);
      this.logger.debug(`Deleted secret at path: ${path}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete secret at ${path}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get dynamic database credentials
   */
  async getDatabaseCredentials(role: string = 'quckchat-role'): Promise<{
    username: string;
    password: string;
    leaseId: string;
    leaseDuration: number;
  }> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    const path = `database/creds/${role}`;

    try {
      const result = await this.client.read(path);

      // Schedule lease renewal
      this.scheduleLeaseRenewal(result.lease_id, result.lease_duration);

      this.logger.log(`Generated dynamic database credentials for role: ${role}`);
      return {
        username: result.data.username,
        password: result.data.password,
        leaseId: result.lease_id,
        leaseDuration: result.lease_duration,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get database credentials: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule lease renewal for dynamic secrets
   */
  private scheduleLeaseRenewal(leaseId: string, leaseDuration: number): void {
    // Renew at 75% of lease duration
    const renewInterval = (leaseDuration * 0.75) * 1000;

    const interval = setInterval(async () => {
      try {
        const result = await this.client.leaseRenew(leaseId);
        this.logger.debug(`Renewed lease ${leaseId}, new TTL: ${result.lease_duration}s`);
      } catch (error: any) {
        this.logger.error(`Failed to renew lease ${leaseId}: ${error.message}`);
        clearInterval(interval);
        this.leaseRenewalIntervals.delete(leaseId);
      }
    }, renewInterval);

    this.leaseRenewalIntervals.set(leaseId, interval);
  }

  /**
   * Revoke a lease
   */
  async revokeLease(leaseId: string): Promise<void> {
    try {
      await this.client.leaseRevoke(leaseId);

      // Clear renewal interval
      const interval = this.leaseRenewalIntervals.get(leaseId);
      if (interval) {
        clearInterval(interval);
        this.leaseRenewalIntervals.delete(leaseId);
      }

      this.logger.debug(`Revoked lease: ${leaseId}`);
    } catch (error: any) {
      this.logger.error(`Failed to revoke lease ${leaseId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Encrypt data using Transit engine
   */
  async encrypt(
    keyName: string,
    plaintext: string,
    options?: { context?: string },
  ): Promise<string> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    try {
      const result = await this.client.write(`transit/encrypt/${keyName}`, {
        plaintext: Buffer.from(plaintext).toString('base64'),
        context: options?.context
          ? Buffer.from(options.context).toString('base64')
          : undefined,
      });

      return result.data.ciphertext;
    } catch (error: any) {
      this.logger.error(`Failed to encrypt data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Decrypt data using Transit engine
   */
  async decrypt(
    keyName: string,
    ciphertext: string,
    options?: { context?: string },
  ): Promise<string> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    try {
      const result = await this.client.write(`transit/decrypt/${keyName}`, {
        ciphertext,
        context: options?.context
          ? Buffer.from(options.context).toString('base64')
          : undefined,
      });

      return Buffer.from(result.data.plaintext, 'base64').toString('utf8');
    } catch (error: any) {
      this.logger.error(`Failed to decrypt data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a data key for envelope encryption
   */
  async generateDataKey(
    keyName: string,
    options?: { bits?: number; context?: string },
  ): Promise<{ plaintext: string; ciphertext: string }> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    try {
      const result = await this.client.write(`transit/datakey/plaintext/${keyName}`, {
        bits: options?.bits || 256,
        context: options?.context
          ? Buffer.from(options.context).toString('base64')
          : undefined,
      });

      return {
        plaintext: Buffer.from(result.data.plaintext, 'base64').toString('hex'),
        ciphertext: result.data.ciphertext,
      };
    } catch (error: any) {
      this.logger.error(`Failed to generate data key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Vault health status
   */
  async getHealth(): Promise<{
    initialized: boolean;
    sealed: boolean;
    standby: boolean;
    version: string;
  }> {
    try {
      const result = await this.client.health();
      return {
        initialized: result.initialized,
        sealed: result.sealed,
        standby: result.standby,
        version: result.version,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get Vault health: ${error.message}`);
      throw error;
    }
  }

  /**
   * List secrets at a path
   */
  async listSecrets(path: string): Promise<string[]> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    try {
      const result = await this.client.list(path);
      return result.data?.keys || [];
    } catch (error: any) {
      this.logger.error(`Failed to list secrets at ${path}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if authenticated
   */
  isVaultAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Clear secret cache
   */
  clearCache(): void {
    this.secretCache.clear();
    this.logger.debug('Cleared secret cache');
  }

  /**
   * Get a specific secret value
   */
  async getSecretValue<T = string>(
    path: VaultPath | string,
    key: string,
  ): Promise<T | undefined> {
    const secrets = await this.readSecret(path);
    return secrets[key] as T | undefined;
  }
}
