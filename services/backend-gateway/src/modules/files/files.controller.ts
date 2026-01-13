import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesService } from './files.service';
import {
  UploadUrlRequestDto,
  CompleteUploadDto,
  UpdateFileDto,
  FileQueryDto,
} from './dto';
import { File, FileType } from './schemas/file.schema';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Request presigned upload URL' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Upload URL generated' })
  async requestUploadUrl(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UploadUrlRequestDto,
    @Request() req: any,
  ): Promise<{ uploadUrl: string; fileId: string; file: File }> {
    return this.filesService.requestUploadUrl(workspaceId, dto, req.user.id);
  }

  @Post('complete-upload')
  @ApiOperation({ summary: 'Mark upload as complete' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Upload completed', type: File })
  async completeUpload(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CompleteUploadDto,
    @Request() req: any,
  ): Promise<File> {
    return this.filesService.completeUpload(workspaceId, dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all files in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'type', enum: FileType, required: false })
  @ApiQuery({ name: 'channelId', required: false })
  @ApiQuery({ name: 'uploadedBy', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'List of files' })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() query: FileQueryDto,
    @Request() req: any,
  ): Promise<{ files: File[]; total: number; page: number; limit: number }> {
    return this.filesService.findAll(workspaceId, req.user.id, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get storage statistics' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Storage stats' })
  async getStats(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<FileType, { count: number; size: number }>;
  }> {
    return this.filesService.getStorageStats(workspaceId, req.user.id);
  }

  @Get('channel/:channelId')
  @ApiOperation({ summary: 'Get files in channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiQuery({ name: 'type', enum: FileType, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'List of files in channel' })
  async getFilesByChannel(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Query('type') type: FileType,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Request() req: any,
  ): Promise<{ files: File[]; total: number }> {
    return this.filesService.getFilesByChannel(workspaceId, channelId, req.user.id, {
      type,
      limit,
      offset,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File details', type: File })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<File> {
    return this.filesService.findOne(id, req.user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for file' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Download URL' })
  async getDownloadUrl(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ downloadUrl: string }> {
    const downloadUrl = await this.filesService.getDownloadUrl(id, req.user.id);
    return { downloadUrl };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File updated', type: File })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFileDto,
    @Request() req: any,
  ): Promise<File> {
    return this.filesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete file' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 204, description: 'File deleted' })
  async delete(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.filesService.delete(id, req.user.id);
  }
}

// Direct access controller
@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesDirectController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID (direct access)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File details', type: File })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<File> {
    return this.filesService.findOne(id, req.user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL (direct access)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Download URL' })
  async getDownloadUrl(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ downloadUrl: string }> {
    const downloadUrl = await this.filesService.getDownloadUrl(id, req.user.id);
    return { downloadUrl };
  }

  @Get('health')
  @ApiOperation({ summary: 'Files health check' })
  @ApiResponse({ status: 200, description: 'Service healthy' })
  async health(): Promise<{ status: string }> {
    return { status: 'healthy' };
  }
}
