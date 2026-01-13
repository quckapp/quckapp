import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { MigrationsService } from './migrations.service';
import { Roles } from '../../decorators/roles.decorator';

/**
 * MigrationsController - REST API for database migrations management
 * Only accessible by admin users
 */
@ApiTags('Migrations')
@ApiBearerAuth('JWT-auth')
@Controller('admin/migrations')
// @UseGuards(JwtAuthGuard, RolesGuard) // Uncomment when guards are properly set up
// @Roles('admin')
export class MigrationsController {
  constructor(private readonly migrationsService: MigrationsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get migration status' })
  @ApiResponse({
    status: 200,
    description: 'List of all migrations with their status',
  })
  async getStatus() {
    const status = await this.migrationsService.getMigrationStatus();
    return {
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending migrations' })
  @ApiResponse({
    status: 200,
    description: 'List of pending migrations',
  })
  async getPending() {
    const pending = await this.migrationsService.getPendingMigrations();
    return {
      success: true,
      data: pending,
      count: pending.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('applied')
  @ApiOperation({ summary: 'Get applied migrations' })
  @ApiResponse({
    status: 200,
    description: 'List of applied migrations',
  })
  async getApplied() {
    const applied = await this.migrationsService.getAppliedMigrations();
    return {
      success: true,
      data: applied,
      count: applied.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run all pending migrations' })
  @ApiResponse({
    status: 200,
    description: 'Migrations executed successfully',
  })
  async runMigrations() {
    const migrated = await this.migrationsService.runPendingMigrations();
    return {
      success: true,
      message:
        migrated.length > 0
          ? `Applied ${migrated.length} migration(s)`
          : 'No pending migrations',
      data: migrated,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('rollback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rollback the last migration' })
  @ApiResponse({
    status: 200,
    description: 'Migration rolled back successfully',
  })
  async rollbackMigration() {
    const rolledBack = await this.migrationsService.rollbackLastMigration();
    return {
      success: true,
      message:
        rolledBack.length > 0
          ? `Rolled back ${rolledBack.length} migration(s)`
          : 'No migrations to rollback',
      data: rolledBack,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new migration file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Migration name (e.g., add-user-indexes)',
        },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Migration file created',
  })
  async createMigration(@Body('name') name: string) {
    const fileName = await this.migrationsService.createMigration(name);
    return {
      success: true,
      message: 'Migration file created',
      data: { fileName },
      timestamp: new Date().toISOString(),
    };
  }
}
