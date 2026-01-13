import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { GifsController } from './gifs.controller';
import { GifsService } from './gifs.service';

@Module({
  imports: [
    CacheModule.register({
      ttl: 300000, // 5 minutes
      max: 500,
    }),
  ],
  controllers: [GifsController],
  providers: [GifsService],
  exports: [GifsService],
})
export class GifsModule {}
