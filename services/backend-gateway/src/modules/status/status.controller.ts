import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { StatusService } from './status.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { _id: string; userId?: string };
}

@Controller('status')
@UseGuards(JwtAuthGuard)
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('media', 10)) // Allow up to 10 files
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const userId = req.user?._id || req.user?.userId;

    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const caption = body.caption;

    // Validate that either file(s) or text content is provided
    if ((!files || files.length === 0) && !caption) {
      throw new BadRequestException('Either media file(s) or caption is required');
    }

    const createStatusDto: CreateStatusDto = {
      type: files && files.length > 0 ? 'image' : 'text', // Will be adjusted based on actual file types
      content: caption,
    };

    return this.statusService.create(userId, createStatusDto, files);
  }

  @Get()
  findAll() {
    return this.statusService.findAllActive();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.statusService.findByUserId(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.statusService.findOne(id);
  }

  @Put(':id/view')
  markAsViewed(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.statusService.markAsViewed(id, req.user._id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.statusService.delete(id, req.user._id);
  }
}
