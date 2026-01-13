import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StarredController } from './starred.controller';
import { StarredService } from './starred.service';
import { StarredMessage, StarredMessageSchema } from './schemas/starred-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StarredMessage.name, schema: StarredMessageSchema }]),
  ],
  controllers: [StarredController],
  providers: [StarredService],
  exports: [StarredService],
})
export class StarredModule {}
