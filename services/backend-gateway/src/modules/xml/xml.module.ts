import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../../common/logger/logger.module';
import { XmlService } from './xml.service';
import { XmlController } from './xml.controller';

/**
 * XmlModule - Module for XML parsing and generation
 *
 * Provides services for:
 * - Parsing XML to JavaScript objects
 * - Converting JavaScript objects to XML
 * - Handling XML namespaces
 * - Legacy system integration support
 */
@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [XmlController],
  providers: [XmlService],
  exports: [XmlService],
})
export class XmlModule {}
