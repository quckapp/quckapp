import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StickersController } from './stickers.controller';
import { StickersService } from './stickers.service';
import { Sticker, StickerSchema } from './schemas/sticker.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Sticker.name, schema: StickerSchema }])],
  controllers: [StickersController],
  providers: [StickersService],
  exports: [StickersService],
})
export class StickersModule {}
