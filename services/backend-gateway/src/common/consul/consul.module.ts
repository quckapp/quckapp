import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ConsulService,
  ConsulModuleOptions,
  CONSUL_MODULE_OPTIONS,
} from './consul.service';

@Global()
@Module({})
export class ConsulModule {
  /**
   * Register Consul module with static options
   */
  static forRoot(options?: ConsulModuleOptions): DynamicModule {
    return {
      module: ConsulModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: CONSUL_MODULE_OPTIONS,
          useValue: options || {},
        },
        ConsulService,
      ],
      exports: [ConsulService],
    };
  }

  /**
   * Register Consul module with async options
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<ConsulModuleOptions> | ConsulModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: ConsulModule,
      imports: [...(options.imports || []), ConfigModule],
      providers: [
        {
          provide: CONSUL_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        ConsulService,
      ],
      exports: [ConsulService],
    };
  }
}
