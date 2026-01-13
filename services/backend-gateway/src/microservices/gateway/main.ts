import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { GatewayModule } from './gateway.module';
import { PORTS } from '../../shared/constants/services';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:8081',
    ],
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.GATEWAY_PORT || PORTS.API_GATEWAY;
  await app.listen(port);
  console.log(`🚀 API Gateway is running on http://localhost:${port}/api`);
}

bootstrap();
