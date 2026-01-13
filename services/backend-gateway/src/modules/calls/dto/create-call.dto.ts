import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCallDto {
  @ApiPropertyOptional({
    description: 'Conversation ID for existing conversations',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({
    description: 'Type of call',
    enum: ['audio', 'video'],
    example: 'video',
  })
  @IsEnum(['audio', 'video'])
  type: string;

  @ApiPropertyOptional({
    description: 'Array of participant user IDs',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];

  @ApiPropertyOptional({
    description: 'Whether this is a group call',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isGroupCall?: boolean;
}
