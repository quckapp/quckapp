import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttachmentDto } from './create-scheduled-message.dto';

export class UpdateScheduledMessageDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}
