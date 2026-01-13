import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export class UpdateCallDto {
  @IsOptional()
  @IsEnum(['ongoing', 'completed', 'missed', 'rejected', 'failed'])
  status?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;
}
