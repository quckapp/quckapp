import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { UsersServiceModule } from './users-service.module';
import { TCP_CONFIG } from '../../shared/constants/services';

async function bootstrap() {
  const logger = new Logger('UsersService');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(UsersServiceModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.USERS_SERVICE_HOST || TCP_CONFIG.USERS_SERVICE.host,
      port: parseInt(process.env.USERS_SERVICE_TCP_PORT || '', 10) || TCP_CONFIG.USERS_SERVICE.port,
    },
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.log('Received SIGINT. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('Received SIGTERM. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  await app.listen();

  logger.log(`Users Service is running on TCP port ${TCP_CONFIG.USERS_SERVICE.port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start Users Service:', err);
  process.exit(1);
});
