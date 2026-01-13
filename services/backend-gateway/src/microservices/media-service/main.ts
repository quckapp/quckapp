import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { MediaServiceModule } from './media-service.module';
import { TCP_CONFIG } from '../../shared/constants/services';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(MediaServiceModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.MEDIA_SERVICE_HOST || TCP_CONFIG.MEDIA_SERVICE.host,
      port: parseInt(process.env.MEDIA_SERVICE_PORT || '') || TCP_CONFIG.MEDIA_SERVICE.port,
    },
  });

  await app.listen();
  console.log(`📁 Media Service is running on port ${TCP_CONFIG.MEDIA_SERVICE.port}`);
}

bootstrap();
