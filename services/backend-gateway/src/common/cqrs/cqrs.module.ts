import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands/handlers';
import { QueryHandlers } from './queries/handlers';
import { EventHandlers } from './events/handlers';
import { Sagas } from './sagas';
import { CqrsService } from './cqrs.service';
import { CacheModule } from '../cache/cache.module';

/**
 * AppCqrsModule - Configures CQRS pattern for the application
 *
 * CQRS (Command Query Responsibility Segregation) separates:
 * - Commands: Write operations that change state
 * - Queries: Read operations that don't change state
 * - Events: Notifications of state changes
 * - Sagas: Complex workflows orchestrating multiple operations
 *
 * Benefits:
 * - Scalability: Read and write operations can be scaled independently
 * - Performance: Optimized read models for queries
 * - Flexibility: Different data models for reads and writes
 * - Auditability: Full event history of state changes
 */
@Global()
@Module({
  imports: [CqrsModule, CacheModule.forRoot()],
  providers: [CqrsService, ...CommandHandlers, ...QueryHandlers, ...EventHandlers, ...Sagas],
  exports: [CqrsModule, CqrsService],
})
export class AppCqrsModule {}
