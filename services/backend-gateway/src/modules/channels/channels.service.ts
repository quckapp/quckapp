import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import slugify from 'slugify';
import { Channel, ChannelDocument, ChannelType, ChannelStatus } from './schemas/channel.schema';
import {
  ChannelMember,
  ChannelMemberDocument,
  ChannelMemberRole,
} from './schemas/channel-member.schema';
import { CreateChannelDto, UpdateChannelDto, UpdateMemberPreferencesDto } from './dto';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectModel(Channel.name)
    private channelModel: Model<ChannelDocument>,
    @InjectModel(ChannelMember.name)
    private memberModel: Model<ChannelMemberDocument>,
    private workspacesService: WorkspacesService,
  ) {}

  async create(
    workspaceId: string,
    createDto: CreateChannelDto,
    creatorId: string,
  ): Promise<Channel> {
    // Verify workspace access
    const membership = await this.workspacesService.getMember(workspaceId, creatorId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    // Generate slug if not provided
    const slug = createDto.slug || this.generateSlug(createDto.name);

    // Check slug uniqueness within workspace
    const existingSlug = await this.channelModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      slug,
    });
    if (existingSlug) {
      throw new ConflictException('Channel with this slug already exists in workspace');
    }

    // For private channels, only admins can create
    if (createDto.type === ChannelType.PRIVATE) {
      const workspaceMember = await this.workspacesService.getMember(workspaceId, creatorId);
      if (!workspaceMember || !['owner', 'admin'].includes(workspaceMember.role)) {
        // Allow any member to create private channels for flexibility
        // Uncomment below to restrict:
        // throw new ForbiddenException('Only admins can create private channels');
      }
    }

    const channel = new this.channelModel({
      workspaceId: new Types.ObjectId(workspaceId),
      name: createDto.name,
      slug,
      description: createDto.description,
      topic: createDto.topic,
      type: createDto.type || ChannelType.PUBLIC,
      createdBy: new Types.ObjectId(creatorId),
      icon: createDto.icon,
      parentId: createDto.parentId ? new Types.ObjectId(createDto.parentId) : undefined,
      settings: createDto.settings || {},
      stats: { memberCount: 1, messageCount: 0, fileCount: 0 },
    });

    const savedChannel = await channel.save();

    // Add creator as admin member
    await this.addMember(
      savedChannel._id.toString(),
      creatorId,
      ChannelMemberRole.ADMIN,
      workspaceId,
    );

    // Add initial members if provided
    if (createDto.memberIds?.length) {
      for (const memberId of createDto.memberIds) {
        if (memberId !== creatorId) {
          await this.addMember(
            savedChannel._id.toString(),
            memberId,
            ChannelMemberRole.MEMBER,
            workspaceId,
            creatorId,
          );
        }
      }
    }

    // Update workspace channel count
    await this.workspacesService.updateUsage(workspaceId, { channelCount: 1 });

    return savedChannel;
  }

  async findAll(
    workspaceId: string,
    userId: string,
    options?: { type?: ChannelType; status?: ChannelStatus },
  ): Promise<Channel[]> {
    // Verify workspace membership
    const membership = await this.workspacesService.getMember(workspaceId, userId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const query: any = {
      workspaceId: new Types.ObjectId(workspaceId),
      status: options?.status || { $ne: ChannelStatus.DELETED },
    };

    if (options?.type) {
      query.type = options.type;
    }

    // Get all channels user has access to
    const channels = await this.channelModel.find(query).sort({ sortOrder: 1, name: 1 });

    // Filter private channels user is not a member of
    const userChannelMemberships = await this.memberModel.find({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
    });

    const memberChannelIds = new Set(userChannelMemberships.map((m) => m.channelId.toString()));

    return channels.filter((channel) => {
      if (channel.type === ChannelType.PUBLIC) return true;
      return memberChannelIds.has(channel._id.toString());
    });
  }

  async findOne(channelId: string, userId?: string): Promise<Channel> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel || channel.status === ChannelStatus.DELETED) {
      throw new NotFoundException('Channel not found');
    }

    // Check access for private channels
    if (userId && channel.type === ChannelType.PRIVATE) {
      const member = await this.getMember(channelId, userId);
      if (!member) {
        throw new ForbiddenException('You do not have access to this channel');
      }
    }

    return channel;
  }

  async findBySlug(workspaceId: string, slug: string, userId: string): Promise<Channel> {
    const channel = await this.channelModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      slug,
      status: { $ne: ChannelStatus.DELETED },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Check access for private channels
    if (channel.type === ChannelType.PRIVATE) {
      const member = await this.getMember(channel._id.toString(), userId);
      if (!member) {
        throw new ForbiddenException('You do not have access to this channel');
      }
    }

    return channel;
  }

  async update(
    channelId: string,
    updateDto: UpdateChannelDto,
    userId: string,
  ): Promise<Channel> {
    const channel = await this.findOne(channelId);
    await this.validateAdminAccess(channelId, userId);

    // Update fields
    if (updateDto.name) channel.name = updateDto.name;
    if (updateDto.description !== undefined) channel.description = updateDto.description;
    if (updateDto.topic !== undefined) channel.topic = updateDto.topic;
    if (updateDto.icon !== undefined) channel.icon = updateDto.icon;
    if (updateDto.color !== undefined) channel.color = updateDto.color;
    if (updateDto.sortOrder !== undefined) channel.sortOrder = updateDto.sortOrder;
    if (updateDto.settings) {
      channel.settings = { ...channel.settings, ...updateDto.settings };
    }

    return channel.save();
  }

  async archive(channelId: string, userId: string): Promise<Channel> {
    const channel = await this.findOne(channelId);
    await this.validateAdminAccess(channelId, userId);

    if (channel.isDefault) {
      throw new BadRequestException('Cannot archive the default channel');
    }

    channel.status = ChannelStatus.ARCHIVED;
    channel.archivedAt = new Date();
    channel.archivedBy = new Types.ObjectId(userId);

    return channel.save();
  }

  async unarchive(channelId: string, userId: string): Promise<Channel> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    await this.validateAdminAccess(channelId, userId);

    channel.status = ChannelStatus.ACTIVE;
    channel.archivedAt = undefined;
    channel.archivedBy = undefined;

    return channel.save();
  }

  async delete(channelId: string, userId: string): Promise<void> {
    const channel = await this.findOne(channelId);
    await this.validateAdminAccess(channelId, userId);

    if (channel.isDefault) {
      throw new BadRequestException('Cannot delete the default channel');
    }

    channel.status = ChannelStatus.DELETED;
    await channel.save();

    // Update workspace channel count
    await this.workspacesService.updateUsage(channel.workspaceId.toString(), { channelCount: -1 });
  }

  // Member management
  async getMembers(
    channelId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ members: ChannelMember[]; total: number }> {
    const query = { channelId: new Types.ObjectId(channelId) };

    const [members, total] = await Promise.all([
      this.memberModel
        .find(query)
        .populate('userId', 'email displayName avatarUrl status')
        .sort({ joinedAt: 1 })
        .skip(options?.offset || 0)
        .limit(options?.limit || 100),
      this.memberModel.countDocuments(query),
    ]);

    return { members, total };
  }

  async getMember(channelId: string, userId: string): Promise<ChannelMember | null> {
    return this.memberModel.findOne({
      channelId: new Types.ObjectId(channelId),
      userId: new Types.ObjectId(userId),
    });
  }

  async addMember(
    channelId: string,
    userId: string,
    role: ChannelMemberRole = ChannelMemberRole.MEMBER,
    workspaceId?: string,
    addedBy?: string,
  ): Promise<ChannelMember> {
    const channel = await this.findOne(channelId);
    const wsId = workspaceId || channel.workspaceId.toString();

    // Verify user is workspace member
    const workspaceMember = await this.workspacesService.getMember(wsId, userId);
    if (!workspaceMember) {
      throw new BadRequestException('User is not a member of the workspace');
    }

    // Check if already a member
    const existing = await this.getMember(channelId, userId);
    if (existing) {
      throw new ConflictException('User is already a member of this channel');
    }

    const member = await this.memberModel.create({
      channelId: new Types.ObjectId(channelId),
      workspaceId: new Types.ObjectId(wsId),
      userId: new Types.ObjectId(userId),
      role,
      addedBy: addedBy ? new Types.ObjectId(addedBy) : undefined,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
    });

    // Update channel member count
    await this.channelModel.updateOne(
      { _id: new Types.ObjectId(channelId) },
      { $inc: { 'stats.memberCount': 1 } },
    );

    return member;
  }

  async removeMember(channelId: string, userId: string, removedBy: string): Promise<void> {
    const channel = await this.findOne(channelId);
    const member = await this.getMember(channelId, userId);

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Check permissions
    if (userId !== removedBy) {
      await this.validateAdminAccess(channelId, removedBy);
    }

    // Cannot remove last admin
    if (member.role === ChannelMemberRole.ADMIN) {
      const adminCount = await this.memberModel.countDocuments({
        channelId: new Types.ObjectId(channelId),
        role: ChannelMemberRole.ADMIN,
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove the last admin from channel');
      }
    }

    await this.memberModel.deleteOne({ _id: member._id });

    await this.channelModel.updateOne(
      { _id: new Types.ObjectId(channelId) },
      { $inc: { 'stats.memberCount': -1 } },
    );
  }

  async updateMemberPreferences(
    channelId: string,
    userId: string,
    preferences: UpdateMemberPreferencesDto,
  ): Promise<ChannelMember> {
    const member = await this.getMember(channelId, userId);
    if (!member) {
      throw new NotFoundException('You are not a member of this channel');
    }

    member.preferences = { ...member.preferences, ...preferences };
    return member.save();
  }

  async markAsRead(
    channelId: string,
    userId: string,
    messageId?: string,
  ): Promise<ChannelMember> {
    const member = await this.getMember(channelId, userId);
    if (!member) {
      throw new NotFoundException('You are not a member of this channel');
    }

    member.readState.lastReadAt = new Date();
    if (messageId) {
      member.readState.lastReadMessageId = new Types.ObjectId(messageId);
    }
    member.readState.unreadCount = 0;
    member.readState.mentionCount = 0;

    return member.save();
  }

  async getUnreadCounts(workspaceId: string, userId: string): Promise<Record<string, number>> {
    const members = await this.memberModel.find({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
      'readState.unreadCount': { $gt: 0 },
    });

    const counts: Record<string, number> = {};
    for (const member of members) {
      counts[member.channelId.toString()] = member.readState.unreadCount;
    }

    return counts;
  }

  async pinMessage(channelId: string, messageId: string, userId: string): Promise<Channel> {
    await this.validateAdminAccess(channelId, userId);

    return this.channelModel.findByIdAndUpdate(
      channelId,
      { $addToSet: { 'settings.pinnedMessageIds': new Types.ObjectId(messageId) } },
      { new: true },
    );
  }

  async unpinMessage(channelId: string, messageId: string, userId: string): Promise<Channel> {
    await this.validateAdminAccess(channelId, userId);

    return this.channelModel.findByIdAndUpdate(
      channelId,
      { $pull: { 'settings.pinnedMessageIds': new Types.ObjectId(messageId) } },
      { new: true },
    );
  }

  // Create default "general" channel for workspace
  async createDefaultChannel(workspaceId: string, creatorId: string): Promise<Channel> {
    const channel = await this.create(
      workspaceId,
      {
        name: 'general',
        slug: 'general',
        description: 'This is the general channel for the workspace',
        type: ChannelType.PUBLIC,
      },
      creatorId,
    );

    channel.isDefault = true;
    return channel.save();
  }

  // Utility methods
  private generateSlug(name: string): string {
    return slugify(name, { lower: true, strict: true });
  }

  private async validateAdminAccess(channelId: string, userId: string): Promise<void> {
    const member = await this.getMember(channelId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this channel');
    }
    if (member.role !== ChannelMemberRole.ADMIN) {
      // Also check workspace admin
      const channel = await this.channelModel.findById(channelId);
      const workspaceMember = await this.workspacesService.getMember(
        channel.workspaceId.toString(),
        userId,
      );
      if (!workspaceMember || !['owner', 'admin'].includes(workspaceMember.role)) {
        throw new ForbiddenException('Admin access required');
      }
    }
  }

  async incrementMessageCount(channelId: string, userId: string): Promise<void> {
    await this.channelModel.updateOne(
      { _id: new Types.ObjectId(channelId) },
      {
        $inc: { 'stats.messageCount': 1 },
        $set: {
          'stats.lastMessageAt': new Date(),
          'stats.lastMessageBy': new Types.ObjectId(userId),
        },
      },
    );

    // Increment unread count for other members
    await this.memberModel.updateMany(
      {
        channelId: new Types.ObjectId(channelId),
        userId: { $ne: new Types.ObjectId(userId) },
      },
      { $inc: { 'readState.unreadCount': 1 } },
    );
  }
}
