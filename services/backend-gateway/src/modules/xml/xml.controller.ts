import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { Response } from 'express';
import { XmlService, XmlParseOptions, XmlBuildOptions } from './xml.service';
import { LoggerService } from '../../common/logger/logger.service';

/**
 * XmlController - REST API for XML parsing and generation
 */
@ApiTags('XML')
@ApiBearerAuth('JWT-auth')
@Controller('xml')
// @UseGuards(JwtAuthGuard) // Uncomment when guards are set up
export class XmlController {
  constructor(
    private readonly xmlService: XmlService,
    private readonly logger: LoggerService,
  ) {}

  @Post('parse')
  @ApiOperation({ summary: 'Parse XML string to JSON' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        xml: { type: 'string', description: 'XML content' },
        options: {
          type: 'object',
          properties: {
            mergeAttrs: { type: 'boolean', default: true },
            explicitArray: { type: 'boolean', default: false },
            trim: { type: 'boolean', default: true },
          },
        },
      },
      required: ['xml'],
    },
  })
  @ApiResponse({ status: 200, description: 'XML parsed successfully' })
  async parseXml(
    @Body() body: { xml: string; options?: XmlParseOptions },
    @Res() res: Response,
  ) {
    try {
      const result = await this.xmlService.parse(body.xml, body.options);

      res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.logger.error('Failed to parse XML', error, 'XmlController');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to parse XML',
        error: error.message,
      });
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and parse XML file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'XML file to upload',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'XML file parsed successfully' })
  async uploadXml(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = await this.xmlService.parseBuffer(file.buffer);

      res.status(HttpStatus.OK).json({
        success: true,
        data: result,
        meta: {
          filename: file.originalname,
          size: file.size,
        },
      });
    } catch (error) {
      this.logger.error('Failed to parse uploaded XML', error, 'XmlController');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to parse XML file',
        error: error.message,
      });
    }
  }

  @Post('build')
  @ApiOperation({ summary: 'Build XML from JSON object' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'object', description: 'JSON object to convert' },
        options: {
          type: 'object',
          properties: {
            rootName: { type: 'string', default: 'root' },
            pretty: { type: 'boolean', default: true },
            indent: { type: 'string', default: '  ' },
          },
        },
      },
      required: ['data'],
    },
  })
  @ApiResponse({ status: 200, description: 'XML built successfully' })
  async buildXml(
    @Body() body: { data: any; options?: XmlBuildOptions },
    @Res() res: Response,
  ) {
    try {
      const xml = this.xmlService.build(body.data, body.options);

      res.status(HttpStatus.OK).json({
        success: true,
        xml,
      });
    } catch (error) {
      this.logger.error('Failed to build XML', error, 'XmlController');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to build XML',
        error: error.message,
      });
    }
  }

  @Post('download')
  @ApiOperation({ summary: 'Build XML and download as file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'object' },
        filename: { type: 'string', default: 'export.xml' },
        options: { type: 'object' },
      },
      required: ['data'],
    },
  })
  @ApiResponse({ status: 200, description: 'XML file download' })
  async downloadXml(
    @Body()
    body: {
      data: any;
      filename?: string;
      options?: XmlBuildOptions;
    },
    @Res() res: Response,
  ) {
    try {
      const xml = this.xmlService.build(body.data, body.options);
      const filename = body.filename || `export-${Date.now()}.xml`;

      res.set({
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(xml, 'utf-8'),
      });

      res.status(HttpStatus.OK).send(xml);
    } catch (error) {
      this.logger.error('Failed to generate XML download', error, 'XmlController');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate XML',
        error: error.message,
      });
    }
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate XML structure' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        xml: { type: 'string', description: 'XML content to validate' },
      },
      required: ['xml'],
    },
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateXml(
    @Body() body: { xml: string },
    @Res() res: Response,
  ) {
    try {
      const validation = await this.xmlService.validate(body.xml);

      res.status(HttpStatus.OK).json({
        success: true,
        ...validation,
      });
    } catch (error) {
      this.logger.error('Failed to validate XML', error, 'XmlController');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        error: error.message,
      });
    }
  }

  @Post('format')
  @ApiOperation({ summary: 'Format/prettify XML' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        xml: { type: 'string', description: 'XML content to format' },
      },
      required: ['xml'],
    },
  })
  @ApiResponse({ status: 200, description: 'Formatted XML' })
  async formatXml(
    @Body() body: { xml: string },
    @Res() res: Response,
  ) {
    try {
      const formatted = await this.xmlService.formatXml(body.xml);

      res.status(HttpStatus.OK).json({
        success: true,
        xml: formatted,
      });
    } catch (error) {
      this.logger.error('Failed to format XML', error, 'XmlController');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to format XML',
        error: error.message,
      });
    }
  }

  @Post('minify')
  @ApiOperation({ summary: 'Minify XML (remove whitespace)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        xml: { type: 'string', description: 'XML content to minify' },
      },
      required: ['xml'],
    },
  })
  @ApiResponse({ status: 200, description: 'Minified XML' })
  async minifyXml(
    @Body() body: { xml: string },
    @Res() res: Response,
  ) {
    try {
      const minified = await this.xmlService.minifyXml(body.xml);

      res.status(HttpStatus.OK).json({
        success: true,
        xml: minified,
      });
    } catch (error) {
      this.logger.error('Failed to minify XML', error, 'XmlController');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to minify XML',
        error: error.message,
      });
    }
  }

  @Post('json-to-xml')
  @ApiOperation({ summary: 'Convert JSON to XML' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        json: {
          oneOf: [{ type: 'string' }, { type: 'object' }],
          description: 'JSON string or object',
        },
        rootName: { type: 'string', default: 'root' },
      },
      required: ['json'],
    },
  })
  @ApiResponse({ status: 200, description: 'XML output' })
  async jsonToXml(
    @Body() body: { json: string | object; rootName?: string },
    @Res() res: Response,
  ) {
    try {
      const xml = this.xmlService.jsonToXml(body.json, body.rootName);

      res.status(HttpStatus.OK).json({
        success: true,
        xml,
      });
    } catch (error) {
      this.logger.error('Failed to convert JSON to XML', error, 'XmlController');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to convert JSON to XML',
        error: error.message,
      });
    }
  }

  @Post('xml-to-json')
  @ApiOperation({ summary: 'Convert XML to JSON' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        xml: { type: 'string', description: 'XML content' },
      },
      required: ['xml'],
    },
  })
  @ApiResponse({ status: 200, description: 'JSON output' })
  async xmlToJson(
    @Body() body: { xml: string },
    @Res() res: Response,
  ) {
    try {
      const json = await this.xmlService.xmlToJson(body.xml);

      res.status(HttpStatus.OK).json({
        success: true,
        json: JSON.parse(json),
      });
    } catch (error) {
      this.logger.error('Failed to convert XML to JSON', error, 'XmlController');
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to convert XML to JSON',
        error: error.message,
      });
    }
  }
}
