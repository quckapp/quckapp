import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BroadcastService } from './broadcast.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('broadcast')
@UseGuards(JwtAuthGuard)
export class BroadcastController {
  constructor(private broadcastService: BroadcastService) {}

  @Post()
  async createBroadcastList(
    @Request() req: AuthRequest,
    @Body('name') name: string,
    @Body('recipients') recipients: string[],
    @Body('description') description?: string,
  ) {
    return this.broadcastService.createBroadcastList(
      req.user.userId,
      name,
      recipients,
      description,
    );
  }

  @Get()
  async getBroadcastLists(@Request() req: AuthRequest) {
    return this.broadcastService.getBroadcastLists(req.user.userId);
  }

  @Get(':id')
  async getBroadcastList(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.broadcastService.getBroadcastList(id, req.user.userId);
  }

  @Put(':id')
  async updateBroadcastList(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() updates: any,
  ) {
    return this.broadcastService.updateBroadcastList(id, req.user.userId, updates);
  }

  @Delete(':id')
  async deleteBroadcastList(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.broadcastService.deleteBroadcastList(id, req.user.userId);
    return { success: true };
  }

  @Post(':id/send')
  async sendBroadcastMessage(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body('type') type: string,
    @Body('content') content?: string,
    @Body('attachments') attachments?: any[],
  ) {
    return this.broadcastService.sendBroadcastMessage(id, req.user.userId, {
      type,
      content,
      attachments,
    });
  }
}
