import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionRecord } from './promotion.entity';
import { PromotionService, PromotionOptions } from './promotion.service';
import { PromotionController } from './promotion.controller';

@Module({})
export class PromotionGateModule {
  static forRoot(options: PromotionOptions): DynamicModule {
    return {
      module: PromotionGateModule,
      imports: [TypeOrmModule.forFeature([PromotionRecord])],
      controllers: [PromotionController],
      providers: [
        {
          provide: 'PROMOTION_OPTIONS',
          useValue: options,
        },
        PromotionService,
      ],
      exports: [PromotionService],
    };
  }
}
