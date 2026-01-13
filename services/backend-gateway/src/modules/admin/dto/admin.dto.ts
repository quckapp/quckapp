import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// User Management DTOs
export class GetUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['user', 'moderator', 'admin', 'super_admin'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  isBanned?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class BanUserDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  duration?: number; // Duration in hours, null for permanent
}

export class UpdateUserRoleDto {
  @IsEnum(['user', 'moderator', 'admin', 'super_admin'])
  role: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

// Report DTOs
export class GetReportsDto {
  @IsOptional()
  @IsEnum(['pending', 'reviewing', 'resolved', 'dismissed'])
  status?: string;

  @IsOptional()
  @IsEnum(['user', 'message', 'conversation', 'community'])
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class UpdateReportDto {
  @IsOptional()
  @IsEnum(['pending', 'reviewing', 'resolved', 'dismissed'])
  status?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsString()
  actionTaken?: string;
}

export class CreateReportDto {
  @IsEnum(['user', 'message', 'conversation', 'community'])
  type: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  targetMessageId?: string;

  @IsOptional()
  @IsString()
  targetConversationId?: string;

  @IsOptional()
  @IsString()
  targetCommunityId?: string;

  @IsEnum([
    'spam',
    'harassment',
    'hate_speech',
    'inappropriate_content',
    'violence',
    'fake_account',
    'impersonation',
    'scam',
    'other',
  ])
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// Analytics DTOs
export class GetAnalyticsDto {
  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  period?: string = 'week';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// Audit Log DTOs
export class GetAuditLogsDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  adminId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// Conversations DTOs
export class GetConversationsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['single', 'group'])
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class DeleteConversationDto {
  @IsString()
  reason: string;
}

export class LockConversationDto {
  @IsBoolean()
  lock: boolean;
}

// System Settings DTOs
export class UpdateSystemSettingsDto {
  @IsOptional()
  @IsNumber()
  maxUploadSize?: number;

  @IsOptional()
  @IsNumber()
  sessionTimeout?: number;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsString()
  maintenanceMessage?: string;
}

// Admin Broadcast DTOs
export class GetAdminBroadcastsDto {
  @IsOptional()
  @IsEnum(['draft', 'scheduled', 'sent', 'failed'])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class CreateAdminBroadcastDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(['all', 'active', 'new', 'custom'])
  targetAudience: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customUserIds?: string[];
}

export class UpdateAdminBroadcastDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEnum(['all', 'active', 'new', 'custom'])
  targetAudience?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

// Flagged Content/Moderation DTOs
export class GetFlaggedContentDto {
  @IsOptional()
  @IsEnum(['message', 'conversation', 'community'])
  type?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class DeleteContentDto {
  @IsString()
  reason: string;
}
