import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CsvService, CsvParseOptions, CsvStringifyOptions } from './csv.service';
import { LoggerService } from '../../common/logger/logger.service';

/**
 * CsvController - REST API for CSV import/export operations
 */
@ApiTags('CSV')
@ApiBearerAuth('JWT-auth')
@Controller('csv')
// @UseGuards(JwtAuthGuard) // Uncomment when guards are set up
export class CsvController {
  constructor(
    private readonly csvService: CsvService,
    private readonly logger: LoggerService,
  ) {}

  @Post('parse')
  @ApiOperation({ summary: 'Parse CSV string to JSON' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        csv: { type: 'string', description: 'CSV content as string' },
        options: {
          type: 'object',
          properties: {
            delimiter: { type: 'string', default: ',' },
            headers: { type: 'boolean', default: true },
            trim: { type: 'boolean', default: true },
            cast: { type: 'boolean', default: false },
          },
        },
      },
      required: ['csv'],
    },
  })
  @ApiResponse({ status: 200, description: 'CSV parsed successfully' })
  async parseCsv(
    @Body() body: { csv: string; options?: CsvParseOptions },
    @Res() res: Response,
  ) {
    try {
      const result = await this.csvService.parseString(body.csv, {
        headers: true,
        ...body.options,
      });

      res.status(HttpStatus.OK).json({
        success: true,
        data: result.data,
        meta: {
          rowCount: result.rowCount,
          headers: result.headers,
          errors: result.errors,
        },
      });
    } catch (error) {
      this.logger.error('Failed to parse CSV', error, 'CsvController');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to parse CSV',
        error: error.message,
      });
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and parse CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file to upload',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'CSV file parsed successfully' })
  async uploadCsv(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = await this.csvService.parseBuffer(file.buffer, {
        headers: true,
      });

      res.status(HttpStatus.OK).json({
        success: true,
        data: result.data,
        meta: {
          filename: file.originalname,
          rowCount: result.rowCount,
          headers: result.headers,
          errors: result.errors,
        },
      });
    } catch (error) {
      this.logger.error('Failed to parse uploaded CSV', error, 'CsvController');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to parse CSV file',
        error: error.message,
      });
    }
  }

  @Post('stringify')
  @ApiOperation({ summary: 'Convert JSON array to CSV' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of objects to convert',
        },
        options: {
          type: 'object',
          properties: {
            delimiter: { type: 'string', default: ',' },
            headers: { type: 'boolean', default: true },
            quoted: { type: 'boolean', default: false },
            bom: { type: 'boolean', default: false },
          },
        },
      },
      required: ['data'],
    },
  })
  @ApiResponse({ status: 200, description: 'JSON converted to CSV' })
  async stringifyCsv(
    @Body() body: { data: Record<string, any>[]; options?: CsvStringifyOptions },
    @Res() res: Response,
  ) {
    try {
      const csv = await this.csvService.stringify(body.data, body.options);

      res.status(HttpStatus.OK).json({
        success: true,
        csv,
        meta: {
          rowCount: body.data.length,
        },
      });
    } catch (error) {
      this.logger.error('Failed to stringify to CSV', error, 'CsvController');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to convert to CSV',
        error: error.message,
      });
    }
  }

  @Post('download')
  @ApiOperation({ summary: 'Convert JSON to CSV and download' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        filename: { type: 'string', default: 'export.csv' },
        options: { type: 'object' },
      },
      required: ['data'],
    },
  })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async downloadCsv(
    @Body()
    body: {
      data: Record<string, any>[];
      filename?: string;
      options?: CsvStringifyOptions;
    },
    @Res() res: Response,
  ) {
    try {
      const csv = await this.csvService.stringify(body.data, {
        bom: true, // Add BOM for Excel compatibility
        ...body.options,
      });

      const filename = body.filename || `export-${Date.now()}.csv`;

      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(csv, 'utf-8'),
      });

      res.status(HttpStatus.OK).send(csv);
    } catch (error) {
      this.logger.error('Failed to generate CSV download', error, 'CsvController');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate CSV',
        error: error.message,
      });
    }
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate CSV structure against expected columns' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        csv: { type: 'string', description: 'CSV content' },
        expectedColumns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Expected column names',
        },
      },
      required: ['csv', 'expectedColumns'],
    },
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateCsv(
    @Body() body: { csv: string; expectedColumns: string[] },
    @Res() res: Response,
  ) {
    try {
      const validation = await this.csvService.validateStructure(
        body.csv,
        body.expectedColumns,
      );

      res.status(HttpStatus.OK).json({
        success: true,
        ...validation,
      });
    } catch (error) {
      this.logger.error('Failed to validate CSV', error, 'CsvController');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to validate CSV',
        error: error.message,
      });
    }
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Preview first N rows of CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'rows', required: false, type: Number, description: 'Number of rows to preview' })
  @ApiResponse({ status: 200, description: 'CSV preview' })
  async previewCsv(
    @UploadedFile() file: Express.Multer.File,
    @Query('rows') rows: string = '10',
    @Res() res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const maxRows = parseInt(rows, 10) || 10;
      const result = await this.csvService.parseBuffer(file.buffer, {
        headers: true,
        maxRecords: maxRows,
      });

      res.status(HttpStatus.OK).json({
        success: true,
        preview: result.data,
        meta: {
          filename: file.originalname,
          previewRows: result.rowCount,
          headers: result.headers,
        },
      });
    } catch (error) {
      this.logger.error('Failed to preview CSV', error, 'CsvController');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to preview CSV file',
        error: error.message,
      });
    }
  }
}
