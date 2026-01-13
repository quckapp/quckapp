import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sticker, StickerDocument } from './schemas/sticker.schema';

interface SaveStickerDto {
  url: string;
  thumbnailUrl?: string;
  giphyId: string;
  title?: string;
  type?: 'gif' | 'sticker';
}

@Injectable()
export class StickersService {
  private readonly logger = new Logger(StickersService.name);

  constructor(@InjectModel(Sticker.name) private stickerModel: Model<StickerDocument>) {}

  /**
   * Save a sticker/GIF to user's favorites
   */
  async saveSticker(userId: string, dto: SaveStickerDto): Promise<StickerDocument> {
    const existing = await this.stickerModel.findOne({
      userId: new Types.ObjectId(userId),
      giphyId: dto.giphyId,
    });

    if (existing) {
      // Update use count
      existing.useCount += 1;
      existing.lastUsedAt = new Date();
      return existing.save();
    }

    const sticker = new this.stickerModel({
      userId: new Types.ObjectId(userId),
      url: dto.url,
      thumbnailUrl: dto.thumbnailUrl,
      giphyId: dto.giphyId,
      title: dto.title,
      type: dto.type || 'gif',
      useCount: 1,
      lastUsedAt: new Date(),
    });

    return sticker.save();
  }

  /**
   * Get user's saved stickers/GIFs
   */
  async getUserStickers(
    userId: string,
    type?: 'gif' | 'sticker',
    limit: number = 50,
    skip: number = 0,
  ): Promise<{ stickers: StickerDocument[]; total: number }> {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (type) {
      query.type = type;
    }

    const [stickers, total] = await Promise.all([
      this.stickerModel
        .find(query)
        .sort({ useCount: -1, lastUsedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.stickerModel.countDocuments(query),
    ]);

    return { stickers, total };
  }

  /**
   * Get recently used stickers/GIFs
   */
  async getRecentStickers(userId: string, limit: number = 20): Promise<StickerDocument[]> {
    return this.stickerModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ lastUsedAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Record sticker usage (increment count)
   */
  async recordUsage(userId: string, giphyId: string): Promise<void> {
    await this.stickerModel.updateOne(
      { userId: new Types.ObjectId(userId), giphyId },
      {
        $inc: { useCount: 1 },
        $set: { lastUsedAt: new Date() },
      },
    );
  }

  /**
   * Remove a saved sticker
   */
  async removeSticker(userId: string, giphyId: string): Promise<boolean> {
    const result = await this.stickerModel.deleteOne({
      userId: new Types.ObjectId(userId),
      giphyId,
    });
    return result.deletedCount > 0;
  }

  /**
   * Check if sticker is saved
   */
  async isSaved(userId: string, giphyId: string): Promise<boolean> {
    const count = await this.stickerModel.countDocuments({
      userId: new Types.ObjectId(userId),
      giphyId,
    });
    return count > 0;
  }

  /**
   * Get sticker stats for user
   */
  async getStats(userId: string): Promise<{
    totalSaved: number;
    totalGifs: number;
    totalStickers: number;
  }> {
    const [totalSaved, totalGifs, totalStickers] = await Promise.all([
      this.stickerModel.countDocuments({ userId: new Types.ObjectId(userId) }),
      this.stickerModel.countDocuments({ userId: new Types.ObjectId(userId), type: 'gif' }),
      this.stickerModel.countDocuments({ userId: new Types.ObjectId(userId), type: 'sticker' }),
    ]);

    return { totalSaved, totalGifs, totalStickers };
  }
}
