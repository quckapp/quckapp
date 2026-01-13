import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class PaginationDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  get skip(): number {
    return ((this.page || 1) - 1) * (this.limit || 20);
  }
}

export class DateRangeDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class SearchPaginationDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  query?: string;
}

export class MessagePaginationDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @IsString()
  @IsOptional()
  before?: string; // Message ID to paginate before

  @IsString()
  @IsOptional()
  after?: string; // Message ID to paginate after
}
