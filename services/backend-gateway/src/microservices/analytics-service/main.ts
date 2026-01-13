import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { AnalyticsServiceModule } from './analytics-service.module';
import { TCP_CONFIG } from '../../shared/constants/services';

async function bootstrap() {
  const logger = new Logger('AnalyticsService');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AnalyticsServiceModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.ANALYTICS_SERVICE_HOST || TCP_CONFIG.ANALYTICS_SERVICE.host,
      port:
        parseInt(process.env.ANALYTICS_SERVICE_TCP_PORT || '', 10) ||
        TCP_CONFIG.ANALYTICS_SERVICE.port,
    },
  });

  await app.listen();

  logger.log(
    `Analytics Microservice is running on ${TCP_CONFIG.ANALYTICS_SERVICE.host}:${TCP_CONFIG.ANALYTICS_SERVICE.port}`,
  );
}

bootstrap();
