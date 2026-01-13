import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { MediaServiceController } from './media-service.controller';
import { MediaServiceHandler } from './media-service.handler';
import { Media, MediaSchema, StorageUsage, StorageUsageSchema } from './schemas/media.schema';

/**
 * Media Microservice Module
 *
 * Responsibilities:
 * - Media upload and storage
 * - Media processing (resize, compress, transcode)
 * - Thumbnail generation
 * - Storage usage tracking
 * - Presigned URL generation
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get('MONGODB_URI_PROD') || config.get('MONGODB_URI_DEV') || config.get('MONGODB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: Media.name, schema: MediaSchema },
      { name: StorageUsage.name, schema: StorageUsageSchema },
    ]),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: 300000,
        max: 500,
      }),
    }),
  ],
  controllers: [MediaServiceController],
  providers: [MediaServiceHandler],
})
export class MediaServiceModule {}
