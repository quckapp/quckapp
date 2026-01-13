import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
  ) {}

  async getOverview() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User metrics
    const totalUsers = await this.userModel.countDocuments({ isActive: true });
    const newUsersToday = await this.userModel.countDocuments({
      createdAt: { $gte: oneDayAgo },
      isActive: true,
    });
    const newUsersThisWeek = await this.userModel.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      isActive: true,
    });
    const activeUsersToday = await this.userModel.countDocuments({
      lastSeen: { $gte: oneDayAgo },
      isActive: true,
    });

    // Message metrics
    const totalMessages = await this.messageModel.countDocuments();
    const messagesToday = await this.messageModel.countDocuments({
      createdAt: { $gte: oneDayAgo },
    });
    const messagesThisWeek = await this.messageModel.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Conversation metrics
    const totalConversations = await this.conversationModel.countDocuments();
    const activeConversationsToday = await this.messageModel.distinct('conversationId', {
      createdAt: { $gte: oneDayAgo },
    });

    return {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        activeToday: activeUsersToday,
      },
      messages: {
        total: totalMessages,
        today: messagesToday,
        thisWeek: messagesThisWeek,
        avgPerDay: Math.round(
          totalMessages /
            Math.max(1, (now.getTime() - thirtyDaysAgo.getTime()) / (24 * 60 * 60 * 1000)),
        ),
      },
      conversations: {
        total: totalConversations,
        activeToday: activeConversationsToday.length,
      },
    };
  }

  async getUserGrowth(days: number = 30) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const growth = await this.userModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isActive: true,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return growth.map((item) => ({
      date: item._id,
      newUsers: item.count,
    }));
  }

  async getMessageActivity(days: number = 30) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const activity = await this.messageModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return activity.map((item) => ({
      date: item._id,
      messages: item.count,
    }));
  }

  async getTopActiveUsers(limit: number = 10) {
    const topUsers = await this.messageModel.aggregate([
      {
        $group: {
          _id: '$senderId',
          messageCount: { $sum: 1 },
        },
      },
      {
        $sort: { messageCount: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: '$userInfo',
      },
      {
        $project: {
          _id: 1,
          messageCount: 1,
          displayName: '$userInfo.displayName',
          username: '$userInfo.username',
          avatar: '$userInfo.avatar',
        },
      },
    ]);

    return topUsers;
  }

  async getMessageTypeDistribution() {
    const distribution = await this.messageModel.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const total = distribution.reduce((sum, item) => sum + item.count, 0);

    return distribution.map((item) => ({
      type: item._id,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));
  }

  async getConversationStats() {
    const totalConversations = await this.conversationModel.countDocuments();
    const directConversations = await this.conversationModel.countDocuments({ type: 'direct' });
    const groupConversations = await this.conversationModel.countDocuments({ type: 'group' });

    const avgParticipants = await this.conversationModel.aggregate([
      {
        $project: {
          participantCount: { $size: '$participants' },
        },
      },
      {
        $group: {
          _id: null,
          avg: { $avg: '$participantCount' },
        },
      },
    ]);

    return {
      total: totalConversations,
      direct: directConversations,
      group: groupConversations,
      averageParticipants:
        avgParticipants.length > 0 ? Math.round(avgParticipants[0].avg * 10) / 10 : 0,
    };
  }

  async getEngagementMetrics() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Users who sent at least one message in the last 7 days
    const activeUserCount = await this.messageModel.distinct('senderId', {
      createdAt: { $gte: sevenDaysAgo },
    });

    const totalUsers = await this.userModel.countDocuments({ isActive: true });

    // Average messages per active user
    const messagesLastWeek = await this.messageModel.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    return {
      activeUserCount: activeUserCount.length,
      totalUsers,
      engagementRate: totalUsers > 0 ? Math.round((activeUserCount.length / totalUsers) * 100) : 0,
      avgMessagesPerActiveUser:
        activeUserCount.length > 0 ? Math.round(messagesLastWeek / activeUserCount.length) : 0,
    };
  }
}
