import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ExportFormat {
  JSON = 'json',
  TXT = 'txt',
}

export class ExportDataDto {
  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat;
}

export class ExportConversationDto {
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;

  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat;
}

export class DownloadExportDto {
  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat;
}

export class ExportStatisticsDto {
  totalConversations: number;
  totalMessages: number;
  totalMediaFiles: number;
}

export class UserExportDataDto {
  exportedAt: Date;
  user: {
    profile: any;
    settings: any;
  };
  conversations: any[];
  messages: any[];
  statistics: ExportStatisticsDto;
}
