import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { PdfService, ChatExportData, InvoiceData, ReportData } from './pdf.service';
import { LoggerService } from '../../common/logger/logger.service';

/**
 * PdfController - REST API for PDF generation
 */
@ApiTags('PDF')
@ApiBearerAuth('JWT-auth')
@Controller('pdf')
// @UseGuards(JwtAuthGuard) // Uncomment when guards are set up
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly logger: LoggerService,
  ) {}

  @Post('chat-export')
  @ApiOperation({ summary: 'Generate a chat export PDF' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        conversationName: { type: 'string' },
        participants: { type: 'array', items: { type: 'string' } },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sender: { type: 'string' },
              content: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              type: { type: 'string', enum: ['text', 'image', 'file', 'audio', 'video'] },
            },
          },
        },
        exportedAt: { type: 'string', format: 'date-time' },
        exportedBy: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'PDF generated successfully' })
  async generateChatExport(
    @Body() data: ChatExportData,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.pdfService.generateChatExport({
        ...data,
        exportedAt: new Date(data.exportedAt),
        messages: data.messages.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      });

      const filename = `chat-export-${Date.now()}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });

      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      this.logger.error('Failed to generate chat export PDF', error, 'PdfController');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate PDF',
      });
    }
  }

  @Post('invoice')
  @ApiOperation({ summary: 'Generate an invoice PDF' })
  @ApiResponse({ status: 200, description: 'Invoice PDF generated successfully' })
  async generateInvoice(
    @Body() data: InvoiceData,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.pdfService.generateInvoice({
        ...data,
        date: new Date(data.date),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });

      const filename = `invoice-${data.invoiceNumber}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });

      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      this.logger.error('Failed to generate invoice PDF', error, 'PdfController');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate PDF',
      });
    }
  }

  @Post('report')
  @ApiOperation({ summary: 'Generate a report PDF' })
  @ApiResponse({ status: 200, description: 'Report PDF generated successfully' })
  async generateReport(
    @Body() data: ReportData,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.pdfService.generateReport({
        ...data,
        generatedAt: new Date(data.generatedAt),
      });

      const filename = `report-${Date.now()}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });

      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      this.logger.error('Failed to generate report PDF', error, 'PdfController');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate PDF',
      });
    }
  }

  @Post('text')
  @ApiOperation({ summary: 'Generate a simple text PDF' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 200, description: 'Text PDF generated successfully' })
  async generateTextPdf(
    @Body() body: { title?: string; content: string },
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.pdfService.generateTextPdf(
        body.content,
        body.title,
      );

      const filename = `document-${Date.now()}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });

      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      this.logger.error('Failed to generate text PDF', error, 'PdfController');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate PDF',
      });
    }
  }
}
