import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationsServiceModule } from './notifications-service.module';
import { TCP_CONFIG } from '../../shared/constants/services';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationsServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.NOTIFICATIONS_SERVICE_HOST || TCP_CONFIG.NOTIFICATIONS_SERVICE.host,
        port:
          parseInt(process.env.NOTIFICATIONS_SERVICE_PORT || '') ||
          TCP_CONFIG.NOTIFICATIONS_SERVICE.port,
      },
    },
  );

  await app.listen();
  console.log(
    `🔔 Notifications Service is running on port ${TCP_CONFIG.NOTIFICATIONS_SERVICE.port}`,
  );
}

bootstrap();
