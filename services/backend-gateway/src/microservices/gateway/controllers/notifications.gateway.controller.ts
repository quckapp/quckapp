import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { SERVICES } from '../../../shared/constants/services';
import { NOTIFICATIONS_PATTERNS } from '../../../shared/contracts/message-patterns';
import {
  NotificationDto,
  PaginatedResponseDto,
  RegisterPushTokenDto,
  ServiceResponseDto,
} from '../../../shared/dto';

/**
 * Notifications Gateway Controller
 * Routes notification requests to Notifications Microservice
 */
@Controller('notifications')
export class NotificationsGatewayController {
  constructor(@Inject(SERVICES.NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy) {}

  /**
   * Get user notifications
   */
  @Get()
  async getNotifications(
    @Req() req: any,
    @Query() query: { limit?: number; offset?: number; unreadOnly?: boolean },
  ): Promise<ServiceResponseDto<PaginatedResponseDto<NotificationDto>>> {
    return this.sendToService(NOTIFICATIONS_PATTERNS.GET_NOTIFICATIONS, {
      userId: req.user?.userId,
      ...query,
    });
  }

  /**
   * Get unread count
   */
  @Get('unread/count')
  async getUnreadCount(@Req() req: any): Promise<ServiceResponseDto<number>> {
    return this.sendToService(NOTIFICATIONS_PATTERNS.GET_UNREAD_COUNT, {
      userId: req.user?.userId,
    });
  }

  /**
   * Mark notification as read
   */
  @Post(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(NOTIFICATIONS_PATTERNS.MARK_READ, {
      notificationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Mark all notifications as read
   */
  @Post('read-all')
  async markAllRead(@Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(NOTIFICATIONS_PATTERNS.MARK_ALL_READ, {
      userId: req.user?.userId,
    });
  }

  /**
   * Delete notification
   */
  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(NOTIFICATIONS_PATTERNS.DELETE_NOTIFICATION, {
      notificationId: id,
      userId: req.user?.userId,
    });
  }

  /**
   * Register push token
   */
  @Post('tokens')
  async registerToken(
    @Req() req: any,
    @Body() dto: Omit<RegisterPushTokenDto, 'userId'>,
  ): Promise<ServiceResponseDto> {
    return this.sendToService(NOTIFICATIONS_PATTERNS.REGISTER_TOKEN, {
      userId: req.user?.userId,
      ...dto,
    });
  }

  /**
   * Unregister push token
   */
  @Delete('tokens/:token')
  async unregisterToken(
    @Param('token') token: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto> {
    return this.sendToService(NOTIFICATIONS_PATTERNS.UNREGISTER_TOKEN, {
      userId: req.user?.userId,
      token,
    });
  }

  /**
   * Get notification preferences
   */
  @Get('preferences')
  async getPreferences(@Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(NOTIFICATIONS_PATTERNS.GET_PREFERENCES, {
      userId: req.user?.userId,
    });
  }

  /**
   * Update notification preferences
   */
  @Post('preferences')
  async updatePreferences(@Req() req: any, @Body() dto: any): Promise<ServiceResponseDto> {
    return this.sendToService(NOTIFICATIONS_PATTERNS.UPDATE_PREFERENCES, {
      userId: req.user?.userId,
      preferences: dto,
    });
  }

  private async sendToService<T>(pattern: string, data: any): Promise<ServiceResponseDto<T>> {
    try {
      const result = await firstValueFrom(
        this.notificationsClient.send<ServiceResponseDto<T>>(pattern, data).pipe(
          timeout(5000),
          catchError((err) => {
            throw new HttpException(
              {
                success: false,
                error: {
                  code: 'SERVICE_ERROR',
                  message: err.message || 'Notifications service error',
                },
              },
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }),
        ),
      );
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'GATEWAY_ERROR',
            message: 'Failed to communicate with notifications service',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
