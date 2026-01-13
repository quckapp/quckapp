import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('user-growth')
  async getUserGrowth(@Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getUserGrowth(numDays);
  }

  @Get('message-activity')
  async getMessageActivity(@Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getMessageActivity(numDays);
  }

  @Get('top-active-users')
  async getTopActiveUsers(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getTopActiveUsers(numLimit);
  }

  @Get('message-types')
  async getMessageTypeDistribution() {
    return this.analyticsService.getMessageTypeDistribution();
  }

  @Get('conversation-stats')
  async getConversationStats() {
    return this.analyticsService.getConversationStats();
  }

  @Get('engagement')
  async getEngagementMetrics() {
    return this.analyticsService.getEngagementMetrics();
  }
}
