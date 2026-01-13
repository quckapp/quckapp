import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { MessagesServiceModule } from './messages-service.module';
import { TCP_CONFIG } from '../../shared/constants/services';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(MessagesServiceModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.MESSAGES_SERVICE_HOST || TCP_CONFIG.MESSAGES_SERVICE.host,
      port: parseInt(process.env.MESSAGES_SERVICE_PORT || '') || TCP_CONFIG.MESSAGES_SERVICE.port,
    },
  });

  await app.listen();
  console.log(`💬 Messages Service is running on port ${TCP_CONFIG.MESSAGES_SERVICE.port}`);
}

bootstrap();
