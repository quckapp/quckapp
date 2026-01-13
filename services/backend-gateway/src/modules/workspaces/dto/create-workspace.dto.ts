import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class WorkspaceSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowGuestAccess?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowPublicChannels?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowDirectMessages?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowFileUploads?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxFileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  messageRetentionDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEmailDomains?: string[];
}

class WorkspaceBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Primary color must be a valid hex color' })
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Secondary color must be a valid hex color' })
  secondaryColor?: string;
}

export class CreateWorkspaceDto {
  @ApiProperty({ description: 'Workspace name', example: 'Acme Corporation' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug',
    example: 'acme-corp',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Workspace description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Timezone', example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Default language', example: 'en' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  defaultLanguage?: string;

  @ApiPropertyOptional({ description: 'Workspace settings' })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkspaceSettingsDto)
  settings?: WorkspaceSettingsDto;

  @ApiPropertyOptional({ description: 'Workspace branding' })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkspaceBrandingDto)
  branding?: WorkspaceBrandingDto;
}
