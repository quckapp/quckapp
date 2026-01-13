import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from '../../logger/logger.module';
import { MigrationsService } from './migrations.service';
import { MigrationsController } from './migrations.controller';

/**
 * MigrationsModule - Module for managing MongoDB database migrations
 * Provides both automatic and manual migration execution
 */
@Module({})
export class MigrationsModule implements OnModuleInit {
  constructor(
    private readonly migrationsService: MigrationsService,
    private readonly configService: ConfigService,
  ) {}

  static forRoot(): DynamicModule {
    return {
      module: MigrationsModule,
      imports: [ConfigModule, LoggerModule],
      controllers: [MigrationsController],
      providers: [MigrationsService],
      exports: [MigrationsService],
    };
  }

  async onModuleInit() {
    const runOnStartup =
      this.configService.get('MIGRATIONS_RUN_ON_STARTUP') === 'true';

    if (runOnStartup) {
      console.log('[Migrations] Running migrations on startup...');
      await this.migrationsService.runPendingMigrations();
    }
  }
}
