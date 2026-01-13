import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../../common/logger/logger.module';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';

/**
 * PdfModule - Module for generating PDF documents
 * Supports generating invoices, reports, chat exports, and custom documents
 */
@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
