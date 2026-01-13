import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class TranscribeMessageDto {
  @IsMongoId()
  @IsNotEmpty()
  messageId: string;
}

export class BatchTranscribeDto {
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty({ each: true })
  messageIds: string[];
}

export class SearchTranscriptionsDto {
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  query: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class TranscriptionResponseDto {
  messageId: string;
  transcription: string;
  language?: string;
  duration?: number;
  confidence?: number;
}
