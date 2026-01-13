import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  IsEnum,
  IsBoolean,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChannelType } from '../schemas/channel.schema';

class ChannelSettingsDto {
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
  isReadOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAnnouncement?: boolean;
}

export class CreateChannelDto {
  @ApiProperty({ description: 'Channel name', example: 'general' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug',
    example: 'general',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens',
  })
  slug?: string;

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

  @ApiPropertyOptional({ enum: ChannelType, default: ChannelType.PUBLIC })
  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;

  @ApiPropertyOptional({ description: 'Icon emoji' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: 'Parent channel ID for nesting' })
  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Channel settings' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelSettingsDto)
  settings?: ChannelSettingsDto;

  @ApiPropertyOptional({ description: 'Initial member IDs to add' })
  @IsOptional()
  @IsMongoId({ each: true })
  memberIds?: string[];
}
