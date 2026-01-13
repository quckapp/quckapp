import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSingleConversationDto {
  @ApiProperty({
    description: 'ID of the recipient user',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  recipientId: string;
}

export class CreateGroupConversationDto {
  @ApiProperty({
    description: 'Name of the group',
    example: 'Project Team',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Array of participant user IDs',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  participantIds: string[];

  @ApiPropertyOptional({
    description: 'Group description',
    example: 'Discussion group for project updates',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'Group name (for group conversations)',
    example: 'Updated Group Name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Group description',
    example: 'Updated description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Group avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsString()
  @IsOptional()
  avatar?: string;
}

export class AddParticipantsDto {
  @ApiProperty({
    description: 'Array of user IDs to add',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  participantIds: string[];
}

export class MarkAsReadDto {
  @ApiProperty({
    description: 'ID of the last read message',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  messageId: string;
}

export class ToggleMuteDto {
  @ApiProperty({
    description: 'Whether to mute the conversation',
    example: true,
  })
  @IsBoolean()
  isMuted: boolean;
}

export class SetDisappearingMessagesDto {
  @ApiProperty({
    description: 'Timer in seconds (0 to disable, 86400 for 24h, 604800 for 7 days)',
    example: 86400,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  timer: number;
}
