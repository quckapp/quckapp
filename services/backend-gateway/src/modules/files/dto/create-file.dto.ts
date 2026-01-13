import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsMongoId,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';
import { FileType } from '../schemas/file.schema';

export class CreateFileDto {
  @ApiProperty({ description: 'Original filename' })
  @IsString()
  @MaxLength(255)
  filename: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  size: number;

  @ApiPropertyOptional({ description: 'Channel ID if sharing in channel' })
  @IsOptional()
  @IsMongoId()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Message ID if attaching to message' })
  @IsOptional()
  @IsMongoId()
  messageId?: string;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Tags for organization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Make file public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UploadUrlRequestDto {
  @ApiProperty({ description: 'Original filename' })
  @IsString()
  @MaxLength(255)
  filename: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  size: number;

  @ApiPropertyOptional({ description: 'Channel ID' })
  @IsOptional()
  @IsMongoId()
  channelId?: string;
}

export class CompleteUploadDto {
  @ApiProperty({ description: 'File ID from presigned URL request' })
  @IsMongoId()
  fileId: string;

  @ApiPropertyOptional({ description: 'Content hash (SHA256)' })
  @IsOptional()
  @IsString()
  hash?: string;
}

export class UpdateFileDto {
  @ApiPropertyOptional({ description: 'File name (without extension)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Make file public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class FileQueryDto {
  @ApiPropertyOptional({ enum: FileType })
  @IsOptional()
  @IsEnum(FileType)
  type?: FileType;

  @ApiPropertyOptional({ description: 'Channel ID' })
  @IsOptional()
  @IsMongoId()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Uploader ID' })
  @IsOptional()
  @IsMongoId()
  uploadedBy?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}
