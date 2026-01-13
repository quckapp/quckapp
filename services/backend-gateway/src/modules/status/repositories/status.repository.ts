import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Status, StatusDocument } from '../schemas/status.schema';

/**
 * Repository Pattern - Separates data access logic from business logic
 * Single Responsibility Principle - Only handles database operations
 */
@Injectable()
export class StatusRepository {
  constructor(@InjectModel(Status.name) private statusModel: Model<StatusDocument>) {}

  async create(statusData: Partial<Status>): Promise<Status> {
    const status = new this.statusModel(statusData);
    return status.save();
  }

  async findById(id: string): Promise<Status | null> {
    return this.statusModel
      .findById(id)
      .populate('userId', 'displayName phoneNumber avatar')
      .populate('viewers.userId', 'displayName phoneNumber avatar')
      .exec();
  }

  async findAllActive(): Promise<Status[]> {
    const now = new Date();
    return this.statusModel
      .find({
        expiresAt: { $gt: now },
        isDeleted: false,
      })
      .populate('userId', 'displayName phoneNumber avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUserId(userId: string): Promise<Status[]> {
    const now = new Date();
    return this.statusModel
      .find({
        userId,
        expiresAt: { $gt: now },
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async addViewer(statusId: string, viewerData: any): Promise<Status> {
    const status = await this.statusModel.findByIdAndUpdate(
      statusId,
      { $push: { viewers: viewerData } },
      { new: true },
    );

    if (!status) {
      throw new NotFoundException('Status not found');
    }

    return status;
  }

  async hasViewed(statusId: string, userId: string): Promise<boolean> {
    const status = await this.statusModel.findById(statusId);
    if (!status) {
      return false;
    }

    return status.viewers.some((viewer) => viewer.userId.toString() === userId);
  }

  async softDelete(id: string): Promise<void> {
    await this.statusModel.findByIdAndUpdate(id, { isDeleted: true });
  }

  async deleteExpired(): Promise<void> {
    const now = new Date();
    await this.statusModel.updateMany(
      { expiresAt: { $lte: now }, isDeleted: false },
      { isDeleted: true },
    );
  }
}
