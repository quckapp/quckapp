import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateStatusDto {
  @IsEnum(['text', 'image', 'video'])
  type: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;

  @IsOptional()
  @IsString()
  font?: string;
}
