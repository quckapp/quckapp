import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content (for text messages)',
    example: 'Hello! How are you?',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'Type of message',
    enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'sticker'],
    example: 'text',
  })
  @IsEnum(['text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'sticker'])
  type: string;

  @ApiPropertyOptional({
    description: 'Array of attachment objects',
    example: [{ url: 'https://example.com/image.jpg', type: 'image', size: 1024 }],
  })
  @IsArray()
  @IsOptional()
  attachments?: any[];

  @ApiPropertyOptional({
    description: 'ID of message being replied to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsOptional()
  replyTo?: string;
}

export class EditMessageDto {
  @ApiProperty({
    description: 'Updated message content',
    example: 'Updated message text',
  })
  @IsString()
  content: string;
}

export class AddReactionDto {
  @ApiProperty({
    description: 'Emoji reaction',
    example: '👍',
  })
  @IsString()
  emoji: string;
}

export class SearchMessagesDto {
  @ApiProperty({
    description: 'Search query',
    example: 'meeting',
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: 'Filter by conversation ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Number of results to return',
    example: 20,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of results to skip',
    example: 0,
  })
  @IsOptional()
  skip?: number;

  @ApiPropertyOptional({
    description: 'Filter messages from this date',
    example: '2024-01-01',
  })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter messages until this date',
    example: '2024-12-31',
  })
  @IsString()
  @IsOptional()
  endDate?: string;
}
