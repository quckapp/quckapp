import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Community, CommunityDocument } from './schemas/community.schema';

@Injectable()
export class CommunitiesService {
  constructor(@InjectModel(Community.name) private communityModel: Model<CommunityDocument>) {}

  async createCommunity(
    userId: string,
    name: string,
    description?: string,
    avatar?: string,
  ): Promise<Community> {
    const community = new this.communityModel({
      name,
      description,
      avatar,
      createdBy: userId,
      members: [{ userId, role: 'admin', joinedAt: new Date() }],
      isActive: true,
    });

    return community.save();
  }

  async getUserCommunities(userId: string): Promise<Community[]> {
    return this.communityModel
      .find({ 'members.userId': userId, isActive: true })
      .populate('members.userId', 'displayName phoneNumber avatar')
      .populate('groups')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getCommunity(id: string, userId: string): Promise<Community> {
    const community = await this.communityModel
      .findById(id)
      .populate('members.userId', 'displayName phoneNumber avatar')
      .populate('groups')
      .exec();

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    const isMember = community.members.some((m) => m.userId.toString() === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this community');
    }

    return community;
  }

  async updateCommunity(id: string, userId: string, updates: any): Promise<Community> {
    const community = await this.communityModel.findById(id);

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    const isAdmin = community.members.some(
      (m) => m.userId.toString() === userId && m.role === 'admin',
    );

    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update the community');
    }

    Object.assign(community, updates);
    return community.save();
  }

  async deleteCommunity(id: string, userId: string): Promise<void> {
    const community = await this.communityModel.findById(id);

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    if (community.createdBy.toString() !== userId) {
      throw new ForbiddenException('Only the creator can delete the community');
    }

    community.isActive = false;
    await community.save();
  }

  async addMembers(id: string, userId: string, memberIds: string[]): Promise<Community> {
    const community = await this.communityModel.findById(id);

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    const isAdmin = community.members.some(
      (m) => m.userId.toString() === userId && m.role === 'admin',
    );

    if (!isAdmin) {
      throw new ForbiddenException('Only admins can add members');
    }

    const newMembers = memberIds
      .filter((memberId) => !community.members.some((m) => m.userId.toString() === memberId))
      .map((memberId) => ({ userId: memberId, role: 'member', joinedAt: new Date() }));

    community.members.push(...newMembers);
    return community.save();
  }

  async removeMember(id: string, userId: string, memberId: string): Promise<void> {
    const community = await this.communityModel.findById(id);

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    const isAdmin = community.members.some(
      (m) => m.userId.toString() === userId && m.role === 'admin',
    );

    if (!isAdmin) {
      throw new ForbiddenException('Only admins can remove members');
    }

    community.members = community.members.filter((m) => m.userId.toString() !== memberId);
    await community.save();
  }

  async addGroup(id: string, userId: string, groupId: string): Promise<Community> {
    const community = await this.communityModel.findById(id);

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    const isAdmin = community.members.some(
      (m) => m.userId.toString() === userId && m.role === 'admin',
    );

    if (!isAdmin) {
      throw new ForbiddenException('Only admins can add groups');
    }

    if (!community.groups.includes(groupId)) {
      community.groups.push(groupId);
      await community.save();
    }

    return community;
  }

  async removeGroup(id: string, userId: string, groupId: string): Promise<void> {
    const community = await this.communityModel.findById(id);

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    const isAdmin = community.members.some(
      (m) => m.userId.toString() === userId && m.role === 'admin',
    );

    if (!isAdmin) {
      throw new ForbiddenException('Only admins can remove groups');
    }

    community.groups = community.groups.filter((g) => g.toString() !== groupId);
    await community.save();
  }
}
