import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../logger/logger.service';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationRecord {
  name: string;
  appliedAt: Date;
  checksum: string;
}

interface MigrationFile {
  name: string;
  up: (db: any) => Promise<void>;
  down: (db: any) => Promise<void>;
}

interface MigrationStatus {
  name: string;
  status: 'pending' | 'applied';
  appliedAt?: Date;
}

/**
 * MigrationsService - Service for managing MongoDB database migrations
 * Uses migrate-mongo under the hood for migration execution
 */
@Injectable()
export class MigrationsService implements OnModuleInit {
  private migrateMongo: any;
  private migrationsDir: string;
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.migrationsDir =
      this.configService.get('MIGRATIONS_DIRECTORY') ||
      path.join(process.cwd(), 'src', 'common', 'database', 'migrations', 'scripts');
  }

  async onModuleInit() {
    // Skip migrations service in development mode
    const env = this.configService.get('NODE_ENV') || 'development';

    if (env === 'development') {
      this.logger.log('Migrations service disabled in development mode', 'MigrationsService');
      this.isInitialized = true;
      return;
    }

    try {
      this.migrateMongo = await import('migrate-mongo');
      await this.ensureMigrationsDirectory();
      await this.initializeMigrateMongo();
      this.isInitialized = true;
      this.logger.log('Migrations service initialized', 'MigrationsService');
    } catch (error) {
      this.logger.error(
        'Failed to initialize migrations service',
        error,
        'MigrationsService',
      );
    }
  }

  private async ensureMigrationsDirectory() {
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
      this.logger.log(
        `Created migrations directory: ${this.migrationsDir}`,
        'MigrationsService',
      );
    }
  }

  private async initializeMigrateMongo() {
    const env = this.configService.get('NODE_ENV') || 'development';
    let mongoUri: string;

    if (env === 'production') {
      mongoUri =
        this.configService.get('MONGODB_URI_PROD') ||
        this.configService.get('MONGODB_URI') ||
        'mongodb://localhost:27017/quickchat';
    } else {
      mongoUri =
        this.configService.get('MONGODB_URI_DEV') ||
        this.configService.get('MONGODB_URI') ||
        'mongodb://localhost:27017/quickchat-dev';
    }

    const config = {
      mongodb: {
        url: mongoUri,
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        },
      },
      migrationsDir: this.migrationsDir,
      changelogCollectionName: 'migrations_changelog',
      migrationFileExtension: '.js',
      useFileHash: false,
    };

    this.migrateMongo.config.set(config);
  }

  /**
   * Get the status of all migrations
   */
  async getMigrationStatus(): Promise<MigrationStatus[]> {
    if (!this.isInitialized) {
      throw new Error('Migrations service not initialized');
    }

    try {
      const { db, client } = await this.migrateMongo.database.connect();
      const migrationStatus = await this.migrateMongo.status(db);
      await client.close();

      return migrationStatus.map((m: any) => ({
        name: m.fileName,
        status: m.appliedAt ? 'applied' : 'pending',
        appliedAt: m.appliedAt,
      }));
    } catch (error) {
      this.logger.error(
        'Failed to get migration status',
        error,
        'MigrationsService',
      );
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Migrations service not initialized');
    }

    try {
      const { db, client } = await this.migrateMongo.database.connect();
      const migratedFiles = await this.migrateMongo.up(db, client);
      await client.close();

      if (migratedFiles.length > 0) {
        this.logger.log(
          `Applied ${migratedFiles.length} migration(s): ${migratedFiles.join(', ')}`,
          'MigrationsService',
        );
      } else {
        this.logger.log('No pending migrations', 'MigrationsService');
      }

      return migratedFiles;
    } catch (error) {
      this.logger.error(
        'Failed to run migrations',
        error,
        'MigrationsService',
      );
      throw error;
    }
  }

  /**
   * Rollback the last applied migration
   */
  async rollbackLastMigration(): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Migrations service not initialized');
    }

    try {
      const { db, client } = await this.migrateMongo.database.connect();
      const rolledBackFiles = await this.migrateMongo.down(db, client);
      await client.close();

      if (rolledBackFiles.length > 0) {
        this.logger.log(
          `Rolled back migration(s): ${rolledBackFiles.join(', ')}`,
          'MigrationsService',
        );
      } else {
        this.logger.log('No migrations to rollback', 'MigrationsService');
      }

      return rolledBackFiles;
    } catch (error) {
      this.logger.error(
        'Failed to rollback migration',
        error,
        'MigrationsService',
      );
      throw error;
    }
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Migrations service not initialized');
    }

    try {
      const fileName = await this.migrateMongo.create(name);
      this.logger.log(
        `Created migration file: ${fileName}`,
        'MigrationsService',
      );
      return fileName;
    } catch (error) {
      this.logger.error(
        'Failed to create migration',
        error,
        'MigrationsService',
      );
      throw error;
    }
  }

  /**
   * Get list of pending migrations
   */
  async getPendingMigrations(): Promise<string[]> {
    const status = await this.getMigrationStatus();
    return status.filter((m) => m.status === 'pending').map((m) => m.name);
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations(): Promise<MigrationStatus[]> {
    const status = await this.getMigrationStatus();
    return status.filter((m) => m.status === 'applied');
  }
}
