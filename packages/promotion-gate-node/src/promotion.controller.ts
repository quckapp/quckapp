import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { PromotionService, EmergencyActivateBody } from './promotion.service';

@Controller('promotion')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get('can-promote')
  async canPromote(
    @Query('serviceKey') serviceKey: string,
    @Query('apiVersion') apiVersion: string,
    @Query('toEnvironment') toEnvironment: string,
  ) {
    const result = await this.promotionService.canPromote(
      serviceKey,
      apiVersion,
      toEnvironment,
    );
    return { data: result };
  }

  @Post('promote')
  async promote(
    @Body('serviceKey') serviceKey: string,
    @Body('apiVersion') apiVersion: string,
    @Body('promotedBy') promotedBy: string,
  ) {
    const result = await this.promotionService.promote(
      serviceKey,
      apiVersion,
      promotedBy,
    );
    return { data: result };
  }

  @Post('emergency-activate')
  async emergencyActivate(@Body() body: EmergencyActivateBody) {
    const result = await this.promotionService.emergencyActivate(body);
    return { data: result };
  }

  @Get('history')
  async history(
    @Query('serviceKey') serviceKey: string,
    @Query('apiVersion') apiVersion: string,
  ) {
    const result = await this.promotionService.history(serviceKey, apiVersion);
    return { data: result };
  }

  @Get('status')
  async status(
    @Query('serviceKey') serviceKey: string,
    @Query('apiVersion') apiVersion: string,
  ) {
    const result = await this.promotionService.status(serviceKey, apiVersion);
    return { data: result };
  }
}
