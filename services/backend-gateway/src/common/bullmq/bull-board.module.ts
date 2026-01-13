import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './bullmq.module';

/**
 * BullBoardModule - Dashboard for monitoring BullMQ queues
 * Provides a web UI to view job status, retry failed jobs, etc.
 * Access at: /admin/queues
 */
@Module({
  imports: [ConfigModule],
})
export class BullBoardModule implements NestModule {
  private serverAdapter: ExpressAdapter;

  constructor(private configService: ConfigService) {
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/admin/queues');
  }

  configure(consumer: MiddlewareConsumer) {
    const redisHost = this.configService.get('REDIS_HOST', 'localhost');
    const redisPort = parseInt(this.configService.get('REDIS_PORT', '6379'), 10);
    const redisPassword = this.configService.get('REDIS_PASSWORD');
    const redisDb = parseInt(this.configService.get('REDIS_QUEUE_DB', '1'), 10);

    const redisConnection = {
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      db: redisDb,
    };

    // Create queue instances for Bull Board
    const queues = Object.values(QUEUE_NAMES).map((name) => {
      const queue = new Queue(name, { connection: redisConnection });
      return new BullMQAdapter(queue);
    });

    // Create Bull Board with all queues
    createBullBoard({
      queues,
      serverAdapter: this.serverAdapter,
      options: {
        uiConfig: {
          boardTitle: 'QuickChat Queue Dashboard',
          boardLogo: {
            path: '/logo.png',
            width: '50px',
            height: '50px',
          },
        },
      },
    });

    // Apply middleware for the dashboard route
    consumer.apply(this.serverAdapter.getRouter()).forRoutes('/admin/queues');
  }
}
