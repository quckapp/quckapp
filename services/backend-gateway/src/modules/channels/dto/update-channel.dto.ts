import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsBoolean, ValidateNested, IsNumber, IsArray, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateChannelSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowThreads?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowReactions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowFileUploads?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowLinks?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showJoinLeaveMessages?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isReadOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAnnouncement?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  messageRetentionDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedMentions?: string[];
}

export class UpdateChannelDto {
  @ApiPropertyOptional({ description: 'Channel name' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ description: 'Channel description' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  description?: string;

  @ApiPropertyOptional({ description: 'Channel topic' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  topic?: string;

  @ApiPropertyOptional({ description: 'Icon emoji' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: 'Custom color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Channel settings' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateChannelSettingsDto)
  settings?: UpdateChannelSettingsDto;
}

export class UpdateMemberPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notificationLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  muted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  starred?: boolean;
}

export class PinMessageDto {
  @ApiPropertyOptional({ description: 'Message ID to pin' })
  @IsMongoId()
  messageId: string;
}
