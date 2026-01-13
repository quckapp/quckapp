import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { join } from 'path';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  ValidationExceptionFilter,
} from './common/filters';
import { getCorsConfig, getHelmetConfig, trustedProxies } from './common/security';

async function bootstrap() {
  console.log('[Bootstrap] Starting NestFactory.create...');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  console.log('[Bootstrap] NestFactory.create completed!');

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  console.log('[Bootstrap] Got config and logger services');

  app.useLogger(logger);
  console.log('[Bootstrap] Logger configured');

  // Environment detection
  const isDevelopment = configService.get('NODE_ENV') === 'development';
  console.log('[Bootstrap] isDevelopment:', isDevelopment);

  // Trust proxy settings for correct IP extraction behind load balancers
  app.set('trust proxy', trustedProxies);
  console.log('[Bootstrap] Trust proxy set');

  // Serve static files from uploads directory
  const uploadDir = configService.get('UPLOAD_DIRECTORY') || './uploads';
  app.useStaticAssets(join(process.cwd(), uploadDir), {
    prefix: '/uploads',
  });
  console.log('[Bootstrap] Static assets configured');

  // Enhanced Security Headers with Helmet
  const helmetConfig = getHelmetConfig(isDevelopment);
  app.use(helmet(helmetConfig));
  console.log('[Bootstrap] Helmet configured');

  // Compression
  app.use(compression());
  console.log('[Bootstrap] Compression enabled');

  // Enhanced CORS Configuration
  const allowedOrigins = configService.get('CORS_ORIGIN') || '*';
  const corsConfig = getCorsConfig(allowedOrigins, isDevelopment);
  app.use(cors(corsConfig));
  console.log('[Bootstrap] CORS configured');

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);
  console.log('[Bootstrap] API prefix set:', apiPrefix);

  // Swagger API Documentation
  console.log('[Bootstrap] Setting up Swagger...');
  const swaggerConfig = new DocumentBuilder()
    .setTitle('QuickChat API')
    .setDescription(
      `
## QuickChat Backend API Documentation

A comprehensive real-time messaging platform API built with NestJS.

### Features
- **Authentication**: JWT-based auth with 2FA support
- **Messaging**: Real-time messaging with WebSocket support
- **Calls**: Voice and video calling with WebRTC
- **Media**: File uploads and media processing
- **Notifications**: Push notifications via Firebase
- **Groups**: Group conversations and communities

### Authentication
Most endpoints require a valid JWT token. Include it in the Authorization header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

### WebSocket Events
Real-time features use Socket.IO. Connect to the server and listen for events like:
- \`message:new\` - New message received
- \`message:read\` - Message read receipt
- \`user:typing\` - User typing indicator
- \`call:incoming\` - Incoming call notification
    `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication and authorization endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Conversations', 'Conversation management endpoints')
    .addTag('Messages', 'Messaging endpoints')
    .addTag('Calls', 'Voice and video call endpoints')
    .addTag('Notifications', 'Push notification endpoints')
    .addTag('Media', 'File upload and media endpoints')
    .addTag('Status', 'User status/stories endpoints')
    .addTag('Communities', 'Community management endpoints')
    .addTag('Admin', 'Administrative endpoints')
    .addTag('Health', 'Health check endpoints')
    .build();

  console.log('[Bootstrap] Creating Swagger document...');
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  console.log('[Bootstrap] Swagger document created, setting up UI...');
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
    customSiteTitle: 'QuickChat API Docs',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { font-size: 2.5em; }
    `,
  });
  console.log('[Bootstrap] Swagger setup complete');

  // Global exception filters (order matters - most specific first)
  console.log('[Bootstrap] Setting up global filters...');
  app.useGlobalFilters(
    new AllExceptionsFilter(), // Catches all unhandled exceptions
    new HttpExceptionFilter(), // Catches HTTP exceptions
    new ValidationExceptionFilter(), // Catches validation errors
  );

  // Global validation pipe
  console.log('[Bootstrap] Setting up validation pipe...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  console.log('[Bootstrap] Validation pipe configured');

  const port = configService.get('PORT') || 3000;
  console.log('[Bootstrap] About to call app.listen on port:', port);

  // Add timeout debugging to identify what's blocking
  const listenPromise = app.listen(port, '0.0.0.0');
  setTimeout(() => {
    console.log('[Bootstrap] TIMEOUT: app.listen() took more than 30 seconds!');
  }, 30000);

  try {
    await listenPromise;
    console.log('[Bootstrap] app.listen completed successfully!');
  } catch (error) {
    console.error('[Bootstrap] app.listen error:', error);
    throw error;
  }

  logger.log(`Application is running on: http://0.0.0.0:${port}`);
  logger.log(`Environment: ${configService.get('NODE_ENV')}`);
  logger.log(`API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`CORS Origins: ${allowedOrigins}`);
  logger.log(`Security: Helmet ${isDevelopment ? '(dev mode)' : '(production mode)'}`);
}

bootstrap();
