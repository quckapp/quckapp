import { Controller, Get, Query, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GifsService } from './gifs.service';

@ApiTags('GIFs')
@Controller('gifs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GifsController {
  constructor(private readonly gifsService: GifsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for GIFs' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 25)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'GIFs found successfully' })
  async searchGifs(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.gifsService.searchGifs(
      query,
      limit ? parseInt(limit, 10) : 25,
      offset ? parseInt(offset, 10) : 0,
    );
    return {
      success: true,
      data: result.gifs,
      pagination: {
        total: result.total,
        offset: result.offset,
        limit: limit ? parseInt(limit, 10) : 25,
      },
    };
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending GIFs' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 25)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trending GIFs fetched successfully' })
  async getTrendingGifs(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const result = await this.gifsService.getTrendingGifs(
      limit ? parseInt(limit, 10) : 25,
      offset ? parseInt(offset, 10) : 0,
    );
    return {
      success: true,
      data: result.gifs,
      pagination: {
        total: result.total,
        offset: result.offset,
        limit: limit ? parseInt(limit, 10) : 25,
      },
    };
  }

  @Get('stickers/search')
  @ApiOperation({ summary: 'Search for stickers' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 25)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stickers found successfully' })
  async searchStickers(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.gifsService.searchStickers(
      query,
      limit ? parseInt(limit, 10) : 25,
      offset ? parseInt(offset, 10) : 0,
    );
    return {
      success: true,
      data: result.stickers,
      pagination: {
        total: result.total,
        offset: result.offset,
        limit: limit ? parseInt(limit, 10) : 25,
      },
    };
  }

  @Get('stickers/trending')
  @ApiOperation({ summary: 'Get trending stickers' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 25)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trending stickers fetched successfully' })
  async getTrendingStickers(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const result = await this.gifsService.getTrendingStickers(
      limit ? parseInt(limit, 10) : 25,
      offset ? parseInt(offset, 10) : 0,
    );
    return {
      success: true,
      data: result.stickers,
      pagination: {
        total: result.total,
        offset: result.offset,
        limit: limit ? parseInt(limit, 10) : 25,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get GIF by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'GIF found successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'GIF not found' })
  async getGifById(@Param('id') id: string) {
    const gif = await this.gifsService.getGifById(id);
    if (!gif) {
      return {
        success: false,
        message: 'GIF not found',
      };
    }
    return {
      success: true,
      data: gif,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Check if GIPHY API is configured' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status returned' })
  async getStatus() {
    return {
      success: true,
      configured: this.gifsService.isConfigured(),
    };
  }
}
