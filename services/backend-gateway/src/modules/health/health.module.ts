import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { ApplicationHealthIndicator } from './indicators/application.health';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [TerminusModule, CacheModule.forRoot()],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, ApplicationHealthIndicator],
  exports: [RedisHealthIndicator, ApplicationHealthIndicator],
})
export class HealthModule {}
