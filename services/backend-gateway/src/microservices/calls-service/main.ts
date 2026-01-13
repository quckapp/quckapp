import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { CallsServiceModule } from './calls-service.module';
import { TCP_CONFIG } from '../../shared/constants/services';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(CallsServiceModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.CALLS_SERVICE_HOST || TCP_CONFIG.CALLS_SERVICE.host,
      port: parseInt(process.env.CALLS_SERVICE_PORT || '') || TCP_CONFIG.CALLS_SERVICE.port,
    },
  });

  await app.listen();
  console.log(`📞 Calls Service is running on port ${TCP_CONFIG.CALLS_SERVICE.port}`);
}

bootstrap();
