import { Controller, Get, Param, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { userId: string; phoneNumber: string };
}

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('data')
  async exportAllData(@Request() req: AuthRequest) {
    return this.exportService.exportUserData(req.user.userId);
  }

  @Get('conversation/:conversationId')
  async exportConversation(
    @Request() req: AuthRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.exportService.exportConversationData(req.user.userId, conversationId);
  }

  @Post('download')
  async generateDownload(
    @Request() req: AuthRequest,
    @Query('format') format: 'json' | 'txt' = 'json',
  ) {
    const filepath = await this.exportService.generateExportFile(req.user.userId, format);
    return {
      message: 'Export file generated successfully',
      downloadUrl: filepath,
    };
  }

  @Get('download/:filename')
  async downloadFile(
    @Request() req: AuthRequest,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Security check: ensure user can only download their own exports
    if (!filename.includes(req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filepath = path.join(process.cwd(), 'uploads', 'exports', filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: 'Export file not found' });
    }

    const ext = path.extname(filename);
    const contentType = ext === '.json' ? 'application/json' : 'text/plain';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  }
}
