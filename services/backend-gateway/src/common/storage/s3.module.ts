import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service, S3ModuleOptions, S3_MODULE_OPTIONS } from './s3.service';

@Global()
@Module({})
export class S3Module {
  /**
   * Register S3 module with static options
   */
  static forRoot(options?: S3ModuleOptions): DynamicModule {
    return {
      module: S3Module,
      imports: [ConfigModule],
      providers: [
        {
          provide: S3_MODULE_OPTIONS,
          useValue: options || {},
        },
        S3Service,
      ],
      exports: [S3Service],
    };
  }

  /**
   * Register S3 module with async options
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<S3ModuleOptions> | S3ModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: S3Module,
      imports: [...(options.imports || []), ConfigModule],
      providers: [
        {
          provide: S3_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        S3Service,
      ],
      exports: [S3Service],
    };
  }
}
