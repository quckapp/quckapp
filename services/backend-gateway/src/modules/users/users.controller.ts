import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BlockUserDto, UnblockUserDto, UpdateSettingsDto } from './dto/update-settings.dto';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get Profile', description: 'Get the current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: AuthRequest) {
    const user = await this.usersService.findById(req.user.userId);
    const { password, ...result } = user.toObject();
    return result;
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search Users',
    description: 'Search for users by name or phone number',
  })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiResponse({ status: 200, description: 'List of matching users' })
  async searchUsers(@Query('q') query: string, @Request() req: AuthRequest) {
    return this.usersService.searchUsers(query, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get User by ID', description: 'Get a user profile by their ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    const { password, ...result } = user.toObject();
    return result;
  }

  @Put('me')
  @ApiOperation({ summary: 'Update Profile', description: 'Update the current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid profile data' })
  async updateProfile(@Request() req: AuthRequest, @Body() updates: any) {
    const user = await this.usersService.updateProfile(req.user.userId, updates);
    const { password, ...result } = user.toObject();
    return result;
  }

  @Put('me/status')
  @ApiOperation({ summary: 'Update Status', description: 'Update the current user online status' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['online', 'offline', 'away', 'busy'] } },
    },
  })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(@Request() req: AuthRequest, @Body('status') status: string) {
    return this.usersService.updateStatus(req.user.userId, status);
  }

  @Put('me/fcm-token')
  @ApiOperation({
    summary: 'Update FCM Token',
    description: 'Add or remove FCM token for push notifications',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        action: { type: 'string', enum: ['add', 'remove'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Token updated' })
  async updateFcmToken(
    @Request() req: AuthRequest,
    @Body('token') token: string,
    @Body('action') action: 'add' | 'remove',
  ) {
    if (action === 'add') {
      await this.usersService.addFcmToken(req.user.userId, token);
    } else {
      await this.usersService.removeFcmToken(req.user.userId, token);
    }
    return { success: true };
  }

  // Settings endpoints
  @Get('me/settings')
  @ApiOperation({ summary: 'Get Settings', description: 'Get user settings and preferences' })
  @ApiResponse({ status: 200, description: 'Settings returned' })
  async getSettings(@Request() req: AuthRequest) {
    return this.usersService.getSettings(req.user.userId);
  }

  @Put('me/settings')
  @ApiOperation({ summary: 'Update Settings', description: 'Update user settings and preferences' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(@Request() req: AuthRequest, @Body() updates: UpdateSettingsDto) {
    return this.usersService.updateSettings(req.user.userId, updates);
  }

  @Post('me/blocked-users')
  @ApiOperation({ summary: 'Block User', description: 'Block a user from contacting you' })
  @ApiResponse({ status: 201, description: 'User blocked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async blockUser(@Request() req: AuthRequest, @Body() blockUserDto: BlockUserDto) {
    return this.usersService.blockUser(req.user.userId, blockUserDto.userId);
  }

  @Delete('me/blocked-users/:userId')
  @ApiOperation({ summary: 'Unblock User', description: 'Unblock a previously blocked user' })
  @ApiParam({ name: 'userId', description: 'User ID to unblock' })
  @ApiResponse({ status: 200, description: 'User unblocked' })
  async unblockUser(@Request() req: AuthRequest, @Param('userId') userId: string) {
    return this.usersService.unblockUser(req.user.userId, userId);
  }

  @Get('me/blocked-users')
  @ApiOperation({ summary: 'Get Blocked Users', description: 'Get list of blocked users' })
  @ApiResponse({ status: 200, description: 'List of blocked users' })
  async getBlockedUsers(@Request() req: AuthRequest) {
    return this.usersService.getBlockedUsers(req.user.userId);
  }

  // Linked Devices endpoints
  @Post('me/linked-devices')
  @ApiOperation({ summary: 'Link Device', description: 'Link a new device to your account' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string' },
        deviceName: { type: 'string' },
        deviceType: { type: 'string' },
        fcmToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Device linked' })
  async linkDevice(
    @Request() req: AuthRequest,
    @Body('deviceId') deviceId: string,
    @Body('deviceName') deviceName: string,
    @Body('deviceType') deviceType: string,
    @Body('fcmToken') fcmToken?: string,
  ) {
    return this.usersService.linkDevice(req.user.userId, {
      deviceId,
      deviceName,
      deviceType,
      fcmToken,
    });
  }

  @Get('me/linked-devices')
  @ApiOperation({
    summary: 'Get Linked Devices',
    description: 'Get list of devices linked to your account',
  })
  @ApiResponse({ status: 200, description: 'List of linked devices' })
  async getLinkedDevices(@Request() req: AuthRequest) {
    return this.usersService.getLinkedDevices(req.user.userId);
  }

  @Delete('me/linked-devices/:deviceId')
  @ApiOperation({ summary: 'Unlink Device', description: 'Remove a device from your account' })
  @ApiParam({ name: 'deviceId', description: 'Device ID to unlink' })
  @ApiResponse({ status: 200, description: 'Device unlinked' })
  async unlinkDevice(@Request() req: AuthRequest, @Param('deviceId') deviceId: string) {
    await this.usersService.unlinkDevice(req.user.userId, deviceId);
    return { success: true };
  }

  @Put('me/linked-devices/:deviceId/active')
  @ApiOperation({
    summary: 'Update Device Activity',
    description: 'Update the last active timestamp for a device',
  })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Activity updated' })
  async updateDeviceActivity(@Request() req: AuthRequest, @Param('deviceId') deviceId: string) {
    await this.usersService.updateDeviceActivity(req.user.userId, deviceId);
    return { success: true };
  }
}
