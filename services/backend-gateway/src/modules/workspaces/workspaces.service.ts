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
import { v4 as uuidv4 } from 'uuid';
import { Workspace, WorkspaceDocument, WorkspaceStatus } from './schemas/workspace.schema';
import {
  WorkspaceMember,
  WorkspaceMemberDocument,
  WorkspaceRole,
  MemberStatus,
} from './schemas/workspace-member.schema';
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto, UpdateMemberRoleDto } from './dto';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace.name)
    private workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(WorkspaceMember.name)
    private memberModel: Model<WorkspaceMemberDocument>,
  ) {}

  async create(createDto: CreateWorkspaceDto, ownerId: string): Promise<Workspace> {
    // Generate slug if not provided
    const slug = createDto.slug || this.generateSlug(createDto.name);

    // Check slug uniqueness
    const existingSlug = await this.workspaceModel.findOne({ slug });
    if (existingSlug) {
      throw new ConflictException('Workspace with this slug already exists');
    }

    // Generate invite code
    const inviteCode = this.generateInviteCode();

    const workspace = new this.workspaceModel({
      ...createDto,
      slug,
      ownerId: new Types.ObjectId(ownerId),
      inviteCode,
      usage: {
        memberCount: 1,
        channelCount: 0,
        messageCount: 0,
        storageUsedBytes: 0,
        fileCount: 0,
      },
    });

    const savedWorkspace = await workspace.save();

    // Add owner as first member
    await this.memberModel.create({
      workspaceId: savedWorkspace._id,
      userId: new Types.ObjectId(ownerId),
      role: WorkspaceRole.OWNER,
      status: MemberStatus.ACTIVE,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
    });

    return savedWorkspace;
  }

  async findAll(userId: string, options?: { status?: WorkspaceStatus }): Promise<Workspace[]> {
    // Find all workspaces where user is a member
    const memberships = await this.memberModel.find({
      userId: new Types.ObjectId(userId),
      status: MemberStatus.ACTIVE,
    });

    const workspaceIds = memberships.map((m) => m.workspaceId);

    const query: any = { _id: { $in: workspaceIds } };
    if (options?.status) {
      query.status = options.status;
    } else {
      query.status = { $ne: WorkspaceStatus.DELETED };
    }

    return this.workspaceModel.find(query).sort({ 'usage.lastActivityAt': -1 });
  }

  async findOne(id: string): Promise<Workspace> {
    const workspace = await this.workspaceModel.findById(id);
    if (!workspace || workspace.status === WorkspaceStatus.DELETED) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async findBySlug(slug: string): Promise<Workspace> {
    const workspace = await this.workspaceModel.findOne({
      slug,
      status: { $ne: WorkspaceStatus.DELETED },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async findByInviteCode(inviteCode: string): Promise<Workspace> {
    const workspace = await this.workspaceModel.findOne({
      inviteCode,
      status: WorkspaceStatus.ACTIVE,
    });
    if (!workspace) {
      throw new NotFoundException('Invalid invite code');
    }
    return workspace;
  }

  async update(id: string, updateDto: UpdateWorkspaceDto, userId: string): Promise<Workspace> {
    const workspace = await this.findOne(id);

    // Check permissions
    await this.validateAdminAccess(id, userId);

    // Check slug uniqueness if changing
    if (updateDto.slug && updateDto.slug !== workspace.slug) {
      const existingSlug = await this.workspaceModel.findOne({
        slug: updateDto.slug,
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (existingSlug) {
        throw new ConflictException('Workspace with this slug already exists');
      }
    }

    Object.assign(workspace, updateDto);
    return workspace.save();
  }

  async delete(id: string, userId: string): Promise<void> {
    const workspace = await this.findOne(id);

    // Only owner can delete
    if (workspace.ownerId.toString() !== userId) {
      throw new ForbiddenException('Only workspace owner can delete the workspace');
    }

    workspace.status = WorkspaceStatus.DELETED;
    workspace.deletedAt = new Date();
    await workspace.save();

    // Deactivate all members
    await this.memberModel.updateMany(
      { workspaceId: new Types.ObjectId(id) },
      {
        status: MemberStatus.DEACTIVATED,
        deactivatedAt: new Date(),
        deactivationReason: 'Workspace deleted',
      },
    );
  }

  // Member management
  async getMembers(
    workspaceId: string,
    options?: { role?: WorkspaceRole; status?: MemberStatus; limit?: number; offset?: number },
  ): Promise<{ members: WorkspaceMember[]; total: number }> {
    const query: any = { workspaceId: new Types.ObjectId(workspaceId) };
    if (options?.role) query.role = options.role;
    if (options?.status) query.status = options.status;

    const [members, total] = await Promise.all([
      this.memberModel
        .find(query)
        .populate('userId', 'email displayName avatarUrl')
        .sort({ joinedAt: -1 })
        .skip(options?.offset || 0)
        .limit(options?.limit || 50),
      this.memberModel.countDocuments(query),
    ]);

    return { members, total };
  }

  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    return this.memberModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
    });
  }

  async inviteMember(
    workspaceId: string,
    inviteDto: InviteMemberDto,
    inviterId: string,
  ): Promise<WorkspaceMember> {
    await this.validateAdminAccess(workspaceId, inviterId);

    const workspace = await this.findOne(workspaceId);

    // Check limits
    if (
      workspace.limits.maxMembers > 0 &&
      workspace.usage.memberCount >= workspace.limits.maxMembers
    ) {
      throw new BadRequestException('Workspace member limit reached');
    }

    // TODO: Look up user by email or create invitation
    // For now, assume we have a user ID
    throw new BadRequestException('User lookup by email not implemented - use addMember with userId');
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole = WorkspaceRole.MEMBER,
    inviterId?: string,
  ): Promise<WorkspaceMember> {
    // Check if already a member
    const existing = await this.memberModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
    });

    if (existing) {
      if (existing.status === MemberStatus.ACTIVE) {
        throw new ConflictException('User is already a member of this workspace');
      }
      // Reactivate deactivated member
      existing.status = MemberStatus.ACTIVE;
      existing.role = role;
      existing.joinedAt = new Date();
      existing.lastActiveAt = new Date();
      existing.deactivatedAt = undefined;
      existing.deactivationReason = undefined;
      await existing.save();

      await this.updateMemberCount(workspaceId, 1);
      return existing;
    }

    const member = await this.memberModel.create({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
      role,
      status: MemberStatus.ACTIVE,
      invitedBy: inviterId ? new Types.ObjectId(inviterId) : undefined,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
    });

    await this.updateMemberCount(workspaceId, 1);
    return member;
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    updateDto: UpdateMemberRoleDto,
    requesterId: string,
  ): Promise<WorkspaceMember> {
    await this.validateAdminAccess(workspaceId, requesterId);

    const member = await this.memberModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(memberId),
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot change owner role
    if (member.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot change owner role');
    }

    // Cannot promote to owner
    if (updateDto.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot promote to owner - use transfer ownership');
    }

    member.role = updateDto.role;
    return member.save();
  }

  async removeMember(workspaceId: string, memberId: string, requesterId: string): Promise<void> {
    const workspace = await this.findOne(workspaceId);
    const requester = await this.getMember(workspaceId, requesterId);

    if (!requester) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const member = await this.memberModel.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(memberId),
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove owner
    if (member.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot remove workspace owner');
    }

    // Only admins/owners can remove others, or user can remove themselves
    const canRemove =
      memberId === requesterId ||
      requester.role === WorkspaceRole.OWNER ||
      requester.role === WorkspaceRole.ADMIN;

    if (!canRemove) {
      throw new ForbiddenException('You do not have permission to remove this member');
    }

    member.status = MemberStatus.DEACTIVATED;
    member.deactivatedAt = new Date();
    member.deactivationReason = memberId === requesterId ? 'Left workspace' : 'Removed by admin';
    await member.save();

    await this.updateMemberCount(workspaceId, -1);
  }

  async joinByInviteCode(inviteCode: string, userId: string): Promise<WorkspaceMember> {
    const workspace = await this.findByInviteCode(inviteCode);
    return this.addMember(workspace._id.toString(), userId);
  }

  async regenerateInviteCode(workspaceId: string, userId: string): Promise<string> {
    await this.validateAdminAccess(workspaceId, userId);

    const workspace = await this.findOne(workspaceId);
    workspace.inviteCode = this.generateInviteCode();
    await workspace.save();

    return workspace.inviteCode;
  }

  async transferOwnership(
    workspaceId: string,
    newOwnerId: string,
    currentOwnerId: string,
  ): Promise<void> {
    const workspace = await this.findOne(workspaceId);

    if (workspace.ownerId.toString() !== currentOwnerId) {
      throw new ForbiddenException('Only the current owner can transfer ownership');
    }

    const newOwnerMember = await this.getMember(workspaceId, newOwnerId);
    if (!newOwnerMember || newOwnerMember.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('New owner must be an active member');
    }

    // Update workspace owner
    workspace.ownerId = new Types.ObjectId(newOwnerId);
    await workspace.save();

    // Update member roles
    await this.memberModel.updateOne(
      { workspaceId: new Types.ObjectId(workspaceId), userId: new Types.ObjectId(currentOwnerId) },
      { role: WorkspaceRole.ADMIN },
    );

    await this.memberModel.updateOne(
      { workspaceId: new Types.ObjectId(workspaceId), userId: new Types.ObjectId(newOwnerId) },
      { role: WorkspaceRole.OWNER },
    );
  }

  // Utility methods
  private generateSlug(name: string): string {
    const baseSlug = slugify(name, { lower: true, strict: true });
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }

  private generateInviteCode(): string {
    return uuidv4().replace(/-/g, '').substring(0, 12);
  }

  private async validateAdminAccess(workspaceId: string, userId: string): Promise<void> {
    const member = await this.getMember(workspaceId, userId);
    if (!member || member.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    if (member.role !== WorkspaceRole.OWNER && member.role !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private async updateMemberCount(workspaceId: string, delta: number): Promise<void> {
    await this.workspaceModel.updateOne(
      { _id: new Types.ObjectId(workspaceId) },
      { $inc: { 'usage.memberCount': delta } },
    );
  }

  async updateUsage(
    workspaceId: string,
    updates: Partial<{
      channelCount: number;
      messageCount: number;
      storageUsedBytes: number;
      fileCount: number;
    }>,
  ): Promise<void> {
    const updateOps: any = { 'usage.lastActivityAt': new Date() };

    for (const [key, value] of Object.entries(updates)) {
      updateOps[`usage.${key}`] = value;
    }

    await this.workspaceModel.updateOne({ _id: new Types.ObjectId(workspaceId) }, { $inc: updateOps });
  }
}
