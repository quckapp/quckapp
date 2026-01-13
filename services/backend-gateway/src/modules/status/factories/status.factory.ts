import { Injectable } from '@nestjs/common';
import { CreateStatusDto } from '../dto/create-status.dto';

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

/**
 * Factory Pattern - Encapsulates object creation logic
 * Single Responsibility Principle - Only responsible for creating Status objects
 */
@Injectable()
export class StatusFactory {
  /**
   * Creates a status data object with proper structure
   * Uses Builder pattern internally for flexible construction
   */
  createStatusData(userId: string, dto: CreateStatusDto, mediaItems: MediaItem[]): any {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry

    // Extract primary media for backward compatibility
    const primaryMedia = mediaItems.length > 0 ? mediaItems[0] : null;

    return {
      userId,
      type: dto.type || (primaryMedia ? primaryMedia.type : 'text'),
      content: dto.content,
      mediaUrl: primaryMedia?.url,
      thumbnailUrl: primaryMedia?.thumbnailUrl,
      media: mediaItems,
      expiresAt,
      viewers: [],
      isDeleted: false,
    };
  }

  /**
   * Creates media item objects from uploaded files
   */
  createMediaItems(files: Array<{ url: string; type: string }>): MediaItem[] {
    return files.map((file) => ({
      type: file.type as 'image' | 'video',
      url: file.url,
      thumbnailUrl: file.type === 'video' ? file.url : undefined,
    }));
  }

  /**
   * Creates viewer data object
   */
  createViewerData(userId: string): any {
    return {
      userId,
      viewedAt: new Date(),
    };
  }
}
