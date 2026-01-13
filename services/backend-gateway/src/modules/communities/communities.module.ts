import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';
import { Community, CommunitySchema } from './schemas/community.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Community.name, schema: CommunitySchema }])],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
