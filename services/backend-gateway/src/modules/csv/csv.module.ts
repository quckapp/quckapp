import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../../common/logger/logger.module';
import { CsvService } from './csv.service';
import { CsvController } from './csv.controller';

/**
 * CsvModule - Module for CSV import/export functionality
 *
 * Provides services for:
 * - Parsing CSV data into JSON objects
 * - Converting JSON data to CSV format
 * - Streaming large CSV files
 * - Handling various CSV dialects and encodings
 */
@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [CsvController],
  providers: [CsvService],
  exports: [CsvService],
})
export class CsvModule {}
