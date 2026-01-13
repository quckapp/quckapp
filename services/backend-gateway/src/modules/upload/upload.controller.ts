import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images are allowed');
    }

    const fileUrl = await this.uploadService.uploadFile(file, 'image');
    return {
      url: this.uploadService.getFileUrl(fileUrl),
      type: 'image',
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedMimes = ['video/mp4', 'video/qucktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only videos are allowed');
    }

    const fileUrl = await this.uploadService.uploadFile(file, 'video');
    return {
      url: this.uploadService.getFileUrl(fileUrl),
      type: 'video',
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  @Post('audio')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedMimes = [
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/aac',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only audio files are allowed');
    }

    const fileUrl = await this.uploadService.uploadFile(file, 'audio');
    return {
      url: this.uploadService.getFileUrl(fileUrl),
      type: 'audio',
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileUrl = await this.uploadService.uploadFile(file, 'file');
    return {
      url: this.uploadService.getFileUrl(fileUrl),
      type: 'file',
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map(async (file) => {
      const type = file.mimetype.startsWith('image/')
        ? 'image'
        : file.mimetype.startsWith('video/')
          ? 'video'
          : file.mimetype.startsWith('audio/')
            ? 'audio'
            : 'file';

      const fileUrl = await this.uploadService.uploadFile(file, type);
      return {
        url: this.uploadService.getFileUrl(fileUrl),
        type,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    });

    return Promise.all(uploadPromises);
  }
}
