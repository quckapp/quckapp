import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VaultService, VAULT_MODULE_OPTIONS, VaultModuleOptions } from './vault.service';

/**
 * Async options for Vault module
 */
export interface VaultModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<VaultModuleOptions> | VaultModuleOptions;
  inject?: any[];
}

/**
 * VaultModule - HashiCorp Vault integration for secrets management
 *
 * Features:
 * - Token, AppRole, and Kubernetes authentication
 * - KV v2 secrets engine for static secrets
 * - Dynamic database credentials with automatic lease renewal
 * - Transit engine for encryption/decryption
 * - Secret caching with configurable TTL
 * - Namespace support (enterprise)
 *
 * Usage:
 * ```typescript
 * // Static configuration
 * VaultModule.forRoot({
 *   endpoint: 'http://vault:8200',
 *   token: 'your-token',
 * })
 *
 * // AppRole authentication
 * VaultModule.forRoot({
 *   endpoint: 'http://vault:8200',
 *   appRole: {
 *     roleId: 'role-id',
 *     secretId: 'secret-id',
 *   },
 * })
 *
 * // Async configuration
 * VaultModule.forRootAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (config: ConfigService) => ({
 *     endpoint: config.get('VAULT_ADDR'),
 *     token: config.get('VAULT_TOKEN'),
 *   }),
 * })
 * ```
 *
 * Environment Variables:
 * - VAULT_ADDR: Vault server address
 * - VAULT_TOKEN: Authentication token
 * - VAULT_ROLE_ID: AppRole role ID
 * - VAULT_SECRET_ID: AppRole secret ID
 * - VAULT_K8S_ROLE: Kubernetes auth role
 * - VAULT_NAMESPACE: Vault namespace (enterprise)
 */
@Global()
@Module({})
export class VaultModule {
  /**
   * Register Vault module with static configuration
   */
  static forRoot(options?: VaultModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: VAULT_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: VaultModule,
      imports: [ConfigModule],
      providers: [optionsProvider, VaultService],
      exports: [VaultService],
    };
  }

  /**
   * Register Vault module with async configuration
   */
  static forRootAsync(options: VaultModuleAsyncOptions): DynamicModule {
    const asyncOptionsProvider: Provider = {
      provide: VAULT_MODULE_OPTIONS,
      useFactory: options.useFactory || (() => ({})),
      inject: options.inject || [],
    };

    return {
      module: VaultModule,
      imports: [...(options.imports || []), ConfigModule],
      providers: [asyncOptionsProvider, VaultService],
      exports: [VaultService],
    };
  }
}
