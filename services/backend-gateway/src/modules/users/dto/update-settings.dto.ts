import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  // Appearance Settings
  @ApiPropertyOptional({ description: 'Enable dark mode', example: true })
  @IsBoolean()
  @IsOptional()
  darkMode?: boolean;

  // Media & Storage Settings
  @ApiPropertyOptional({ description: 'Auto-download media files', example: true })
  @IsBoolean()
  @IsOptional()
  autoDownloadMedia?: boolean;

  @ApiPropertyOptional({ description: 'Save media to device gallery', example: false })
  @IsBoolean()
  @IsOptional()
  saveToGallery?: boolean;

  // Notification Settings
  @ApiPropertyOptional({ description: 'Enable push notifications', example: true })
  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable message notifications', example: true })
  @IsBoolean()
  @IsOptional()
  messageNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable group notifications', example: true })
  @IsBoolean()
  @IsOptional()
  groupNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable call notifications', example: true })
  @IsBoolean()
  @IsOptional()
  callNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable notification sound', example: true })
  @IsBoolean()
  @IsOptional()
  soundEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable vibration for notifications', example: true })
  @IsBoolean()
  @IsOptional()
  vibrationEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Show message preview in notifications', example: true })
  @IsBoolean()
  @IsOptional()
  showPreview?: boolean;

  @ApiPropertyOptional({ description: 'Enable in-app notifications', example: true })
  @IsBoolean()
  @IsOptional()
  inAppNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable notification LED light', example: false })
  @IsBoolean()
  @IsOptional()
  notificationLight?: boolean;

  // Privacy Settings
  @ApiPropertyOptional({ description: 'Send read receipts to others', example: true })
  @IsBoolean()
  @IsOptional()
  readReceipts?: boolean;

  @ApiPropertyOptional({ description: 'Show last seen timestamp', example: true })
  @IsBoolean()
  @IsOptional()
  lastSeen?: boolean;

  @ApiPropertyOptional({
    description: 'Who can see your profile photo',
    enum: ['everyone', 'contacts', 'nobody'],
    example: 'contacts',
  })
  @IsString()
  @IsIn(['everyone', 'contacts', 'nobody'])
  @IsOptional()
  profilePhotoVisibility?: string;

  @ApiPropertyOptional({
    description: 'Who can see your status',
    enum: ['everyone', 'contacts', 'nobody'],
    example: 'contacts',
  })
  @IsString()
  @IsIn(['everyone', 'contacts', 'nobody'])
  @IsOptional()
  statusVisibility?: string;

  // Security Settings
  @ApiPropertyOptional({ description: 'Enable two-factor authentication', example: false })
  @IsBoolean()
  @IsOptional()
  twoFactorAuth?: boolean;

  @ApiPropertyOptional({ description: 'Enable fingerprint/biometric lock', example: false })
  @IsBoolean()
  @IsOptional()
  fingerprintLock?: boolean;
}

export class BlockUserDto {
  @ApiProperty({
    description: 'ID of the user to block',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  userId: string;
}

export class UnblockUserDto {
  @ApiProperty({
    description: 'ID of the user to unblock',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  userId: string;
}
