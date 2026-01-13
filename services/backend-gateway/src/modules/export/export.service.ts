import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UserSettings, UserSettingsDocument } from '../users/schemas/user-settings.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';

export interface ExportData {
  exportedAt: Date;
  user: {
    profile: any;
    settings: any;
  };
  conversations: any[];
  messages: any[];
  statistics: {
    totalConversations: number;
    totalMessages: number;
    totalMediaFiles: number;
  };
}

@Injectable()
export class ExportService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserSettings.name) private userSettingsModel: Model<UserSettingsDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
  ) {}

  async exportUserData(userId: string): Promise<ExportData> {
    // Get user profile
    const user = await this.userModel.findById(userId).select('-password').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user settings
    const settings = await this.userSettingsModel.findOne({ userId }).exec();

    // Get all conversations the user is part of
    const conversations = await this.conversationModel
      .find({ 'participants.userId': userId })
      .populate('participants.userId', 'username displayName avatar')
      .exec();

    const conversationIds = conversations.map((c) => c._id.toString());

    // Get all messages from user's conversations
    const messages = await this.messageModel
      .find({
        conversationId: { $in: conversationIds },
        isDeleted: false,
      })
      .populate('senderId', 'username displayName avatar')
      .sort({ createdAt: 1 })
      .exec();

    // Calculate statistics
    const totalMediaFiles = messages.reduce((count, msg) => {
      return count + (msg.attachments?.length || 0);
    }, 0);

    // Clean sensitive data from settings
    const cleanSettings = settings
      ? {
          darkMode: settings.darkMode,
          autoDownloadMedia: settings.autoDownloadMedia,
          pushNotifications: settings.pushNotifications,
          readReceipts: settings.readReceipts,
          lastSeen: settings.lastSeen,
          profilePhotoVisibility: settings.profilePhotoVisibility,
          statusVisibility: settings.statusVisibility,
        }
      : null;

    return {
      exportedAt: new Date(),
      user: {
        profile: {
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          bio: user.bio,
          avatar: user.avatar,
          createdAt: (user as any).createdAt,
        },
        settings: cleanSettings,
      },
      conversations: conversations.map((conv) => ({
        id: conv._id,
        type: conv.type,
        name: conv.name,
        participantCount: conv.participants.length,
        createdAt: (conv as any).createdAt,
      })),
      messages: messages.map((msg) => ({
        id: msg._id,
        conversationId: msg.conversationId,
        type: msg.type,
        content: msg.content,
        attachments: msg.attachments,
        createdAt: msg.createdAt,
        isEdited: msg.isEdited,
      })),
      statistics: {
        totalConversations: conversations.length,
        totalMessages: messages.length,
        totalMediaFiles,
      },
    };
  }

  async exportConversationData(
    userId: string,
    conversationId: string,
  ): Promise<{ conversation: any; messages: any[] }> {
    // Verify user is part of the conversation
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        'participants.userId': userId,
      })
      .populate('participants.userId', 'username displayName avatar')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied');
    }

    // Get all messages from this conversation
    const messages = await this.messageModel
      .find({
        conversationId,
        isDeleted: false,
      })
      .populate('senderId', 'username displayName avatar')
      .sort({ createdAt: 1 })
      .exec();

    return {
      conversation: {
        id: conversation._id,
        type: conversation.type,
        name: conversation.name,
        participants: conversation.participants,
        createdAt: (conversation as any).createdAt,
      },
      messages: messages.map((msg) => ({
        id: msg._id,
        sender: msg.senderId,
        type: msg.type,
        content: msg.content,
        attachments: msg.attachments,
        reactions: msg.reactions,
        createdAt: msg.createdAt,
        isEdited: msg.isEdited,
      })),
    };
  }

  async generateExportFile(userId: string, format: 'json' | 'txt' = 'json'): Promise<string> {
    const exportData = await this.exportUserData(userId);

    const exportDir = path.join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `export_${userId}_${timestamp}.${format}`;
    const filepath = path.join(exportDir, filename);

    if (format === 'json') {
      fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    } else {
      // Generate human-readable text format
      let textContent = `QuckChat Data Export\n`;
      textContent += `=====================\n`;
      textContent += `Exported at: ${exportData.exportedAt.toISOString()}\n\n`;

      textContent += `USER PROFILE\n`;
      textContent += `------------\n`;
      textContent += `Username: ${exportData.user.profile.username}\n`;
      textContent += `Display Name: ${exportData.user.profile.displayName}\n`;
      textContent += `Email: ${exportData.user.profile.email || 'N/A'}\n`;
      textContent += `Phone: ${exportData.user.profile.phoneNumber}\n`;
      textContent += `Bio: ${exportData.user.profile.bio || 'N/A'}\n\n`;

      textContent += `STATISTICS\n`;
      textContent += `----------\n`;
      textContent += `Total Conversations: ${exportData.statistics.totalConversations}\n`;
      textContent += `Total Messages: ${exportData.statistics.totalMessages}\n`;
      textContent += `Total Media Files: ${exportData.statistics.totalMediaFiles}\n\n`;

      textContent += `CONVERSATIONS\n`;
      textContent += `-------------\n`;
      for (const conv of exportData.conversations) {
        textContent += `- ${conv.name || 'Direct Chat'} (${conv.type}, ${conv.participantCount} participants)\n`;
      }
      textContent += `\n`;

      textContent += `MESSAGES\n`;
      textContent += `--------\n`;
      for (const msg of exportData.messages) {
        const date = new Date(msg.createdAt).toLocaleString();
        textContent += `[${date}] ${msg.type}: ${msg.content || '[media]'}\n`;
      }

      fs.writeFileSync(filepath, textContent);
    }

    return `/exports/${filename}`;
  }

  async deleteExportFile(filepath: string): Promise<void> {
    const fullPath = path.join(process.cwd(), 'uploads', filepath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
