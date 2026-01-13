import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StickersService } from './stickers.service';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    [key: string]: any;
  };
}

class SaveStickerDto {
  url: string;
  thumbnailUrl?: string;
  giphyId: string;
  title?: string;
  type?: 'gif' | 'sticker';
}

@ApiTags('Stickers')
@Controller('stickers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StickersController {
  constructor(private readonly stickersService: StickersService) {}

  @Post()
  @ApiOperation({ summary: 'Save a sticker/GIF to favorites' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Sticker saved successfully' })
  async saveSticker(@Request() req: AuthenticatedRequest, @Body() dto: SaveStickerDto) {
    const sticker = await this.stickersService.saveSticker(req.user.userId, dto);
    return {
      success: true,
      message: 'Sticker saved successfully',
      data: sticker,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user saved stickers/GIFs' })
  @ApiQuery({ name: 'type', required: false, enum: ['gif', 'sticker'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stickers fetched successfully' })
  async getUserStickers(
    @Request() req: AuthenticatedRequest,
    @Query('type') type?: 'gif' | 'sticker',
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const result = await this.stickersService.getUserStickers(
      req.user.userId,
      type,
      limit ? parseInt(limit, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
    );
    return {
      success: true,
      data: result.stickers,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 50,
        skip: skip ? parseInt(skip, 10) : 0,
      },
    };
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recently used stickers/GIFs' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Recent stickers fetched successfully' })
  async getRecentStickers(@Request() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    const stickers = await this.stickersService.getRecentStickers(
      req.user.userId,
      limit ? parseInt(limit, 10) : 20,
    );
    return {
      success: true,
      data: stickers,
    };
  }

  @Post(':giphyId/use')
  @ApiOperation({ summary: 'Record sticker usage' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Usage recorded' })
  async recordUsage(@Request() req: AuthenticatedRequest, @Param('giphyId') giphyId: string) {
    await this.stickersService.recordUsage(req.user.userId, giphyId);
    return {
      success: true,
      message: 'Usage recorded',
    };
  }

  @Delete(':giphyId')
  @ApiOperation({ summary: 'Remove a saved sticker' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sticker removed' })
  async removeSticker(@Request() req: AuthenticatedRequest, @Param('giphyId') giphyId: string) {
    const removed = await this.stickersService.removeSticker(req.user.userId, giphyId);
    return {
      success: removed,
      message: removed ? 'Sticker removed' : 'Sticker not found',
    };
  }

  @Get(':giphyId/saved')
  @ApiOperation({ summary: 'Check if sticker is saved' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Saved status returned' })
  async isSaved(@Request() req: AuthenticatedRequest, @Param('giphyId') giphyId: string) {
    const saved = await this.stickersService.isSaved(req.user.userId, giphyId);
    return {
      success: true,
      saved,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get sticker stats' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stats returned' })
  async getStats(@Request() req: AuthenticatedRequest) {
    const stats = await this.stickersService.getStats(req.user.userId);
    return {
      success: true,
      data: stats,
    };
  }
}
