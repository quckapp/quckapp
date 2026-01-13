/**
 * DTOs for Huddle Operations
 * Implements: Data Transfer Object Pattern, Validation
 * SOLID: Single Responsibility - only data validation
 */

import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { HuddleType } from '../schemas/huddle.schema';

export class CreateHuddleDto {
  @IsEnum(HuddleType)
  type: HuddleType;

  @IsOptional()
  @IsString()
  chatId?: string;

  @IsOptional()
  @IsBoolean()
  isVideoEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isAudioEnabled?: boolean;
}

export class JoinHuddleDto {
  @IsString()
  roomId: string;

  @IsOptional()
  @IsBoolean()
  isVideoEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isAudioEnabled?: boolean;
}

export class UpdateParticipantDto {
  @IsOptional()
  @IsBoolean()
  isAudioEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isVideoEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;
}

export class LeaveHuddleDto {
  @IsString()
  roomId: string;
}

export class InviteToHuddleDto {
  @IsString({ each: true })
  userIds: string[];
}
