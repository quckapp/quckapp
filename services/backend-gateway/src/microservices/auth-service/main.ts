import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { AuthServiceModule } from './auth-service.module';
import { SERVICE_PORTS, TCP_CONFIG } from '../../shared/constants/services';

async function bootstrap() {
  const logger = new Logger('AuthService');

  // Create TCP microservice
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AuthServiceModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.AUTH_SERVICE_HOST || TCP_CONFIG.AUTH_SERVICE.host,
      port: parseInt(process.env.AUTH_SERVICE_TCP_PORT || '', 10) || TCP_CONFIG.AUTH_SERVICE.port,
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

  logger.log(`Auth Service is running on TCP port ${TCP_CONFIG.AUTH_SERVICE.port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start Auth Service:', err);
  process.exit(1);
});
