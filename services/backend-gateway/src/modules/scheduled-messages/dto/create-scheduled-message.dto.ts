import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AttachmentDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  mimeType?: string;
}

export class CreateScheduledMessageDto {
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;

  @IsEnum(['text', 'image', 'video', 'audio', 'file'])
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];

  @IsMongoId()
  @IsOptional()
  replyTo?: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
