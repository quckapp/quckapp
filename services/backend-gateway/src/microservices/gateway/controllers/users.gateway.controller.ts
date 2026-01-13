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
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { SERVICES } from '../../../shared/constants/services';
import { USERS_PATTERNS } from '../../../shared/contracts/message-patterns';
import {
  PaginatedResponseDto,
  SearchUsersDto,
  ServiceResponseDto,
  UpdateUserDto,
  UserDto,
  UserProfileDto,
} from '../../../shared/dto';

/**
 * Users Gateway Controller
 * Routes user requests to Users Microservice
 */
@Controller('users')
export class UsersGatewayController {
  constructor(@Inject(SERVICES.USERS_SERVICE) private usersClient: ClientProxy) {}

  /**
   * Get current user profile
   */
  @Get('me')
  async getMe(@Req() req: any): Promise<ServiceResponseDto<UserProfileDto>> {
    return this.sendToService(USERS_PATTERNS.GET_PROFILE, {
      userId: req.user?.userId,
      requesterId: req.user?.userId,
    });
  }

  /**
   * Update current user profile
   */
  @Put('me')
  async updateMe(
    @Req() req: any,
    @Body() dto: UpdateUserDto,
  ): Promise<ServiceResponseDto<UserDto>> {
    return this.sendToService(USERS_PATTERNS.UPDATE_USER, {
      userId: req.user?.userId,
      ...dto,
    });
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  async getUser(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ServiceResponseDto<UserProfileDto>> {
    return this.sendToService(USERS_PATTERNS.GET_PROFILE, {
      userId: id,
      requesterId: req.user?.userId,
    });
  }

  /**
   * Search users
   */
  @Get()
  async searchUsers(
    @Query() query: SearchUsersDto,
    @Req() req: any,
  ): Promise<ServiceResponseDto<PaginatedResponseDto<UserDto>>> {
    return this.sendToService(USERS_PATTERNS.SEARCH_USERS, {
      ...query,
      requesterId: req.user?.userId,
    });
  }

  /**
   * Get user contacts
   */
  @Get('contacts/list')
  async getContacts(
    @Req() req: any,
    @Query() query: { limit?: number; offset?: number },
  ): Promise<ServiceResponseDto<PaginatedResponseDto<UserDto>>> {
    return this.sendToService(USERS_PATTERNS.GET_CONTACTS, {
      userId: req.user?.userId,
      ...query,
    });
  }

  /**
   * Sync contacts from phone
   */
  @Post('contacts/sync')
  async syncContacts(
    @Req() req: any,
    @Body() dto: { phoneNumbers: string[] },
  ): Promise<ServiceResponseDto> {
    return this.sendToService(USERS_PATTERNS.SYNC_CONTACTS, {
      userId: req.user?.userId,
      ...dto,
    });
  }

  /**
   * Block a user
   */
  @Post(':id/block')
  async blockUser(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(USERS_PATTERNS.BLOCK_USER, {
      userId: req.user?.userId,
      blockedUserId: id,
    });
  }

  /**
   * Unblock a user
   */
  @Delete(':id/block')
  async unblockUser(@Param('id') id: string, @Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(USERS_PATTERNS.UNBLOCK_USER, {
      userId: req.user?.userId,
      unblockedUserId: id,
    });
  }

  /**
   * Get blocked users
   */
  @Get('blocked/list')
  async getBlockedUsers(@Req() req: any): Promise<ServiceResponseDto<UserDto[]>> {
    return this.sendToService(USERS_PATTERNS.GET_BLOCKED, {
      userId: req.user?.userId,
    });
  }

  /**
   * Get user presence (online status)
   */
  @Post('presence')
  async getPresence(@Body() dto: { userIds: string[] }): Promise<ServiceResponseDto> {
    return this.sendToService(USERS_PATTERNS.GET_PRESENCE_BULK, dto);
  }

  /**
   * Get user settings
   */
  @Get('settings/me')
  async getSettings(@Req() req: any): Promise<ServiceResponseDto> {
    return this.sendToService(USERS_PATTERNS.GET_SETTINGS, {
      userId: req.user?.userId,
    });
  }

  /**
   * Update user settings
   */
  @Put('settings/me')
  async updateSettings(@Req() req: any, @Body() dto: any): Promise<ServiceResponseDto> {
    return this.sendToService(USERS_PATTERNS.UPDATE_SETTINGS, {
      userId: req.user?.userId,
      settings: dto,
    });
  }

  /**
   * Helper method to send requests to Users service
   */
  private async sendToService<T>(pattern: string, data: any): Promise<ServiceResponseDto<T>> {
    try {
      const result = await firstValueFrom(
        this.usersClient.send<ServiceResponseDto<T>>(pattern, data).pipe(
          timeout(5000),
          catchError((err) => {
            throw new HttpException(
              {
                success: false,
                error: {
                  code: 'SERVICE_ERROR',
                  message: err.message || 'Users service error',
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
            message: 'Failed to communicate with users service',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
