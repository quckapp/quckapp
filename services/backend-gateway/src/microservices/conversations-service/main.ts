import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConversationsServiceModule } from './conversations-service.module';
import { TCP_CONFIG } from '../../shared/constants/services';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ConversationsServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.CONVERSATIONS_SERVICE_HOST || TCP_CONFIG.CONVERSATIONS_SERVICE.host,
        port:
          parseInt(process.env.CONVERSATIONS_SERVICE_PORT || '') ||
          TCP_CONFIG.CONVERSATIONS_SERVICE.port,
      },
    },
  );

  await app.listen();
  console.log(
    `📝 Conversations Service is running on port ${TCP_CONFIG.CONVERSATIONS_SERVICE.port}`,
  );
}

bootstrap();
