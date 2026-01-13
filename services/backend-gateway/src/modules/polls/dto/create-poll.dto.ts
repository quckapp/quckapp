import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePollDto {
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  question: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Poll must have at least 2 options' })
  @ArrayMaxSize(10, { message: 'Poll can have maximum 10 options' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  options: string[];

  @IsBoolean()
  @IsOptional()
  allowMultipleAnswers?: boolean;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(720) // Max 30 days
  expiresInHours?: number;
}
