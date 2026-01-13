/**
 * Huddle Creation Service
 * SOLID: Single Responsibility - only handles huddle creation
 * Dependency Inversion: Depends on abstractions (Repository, Factory)
 */

import { ConflictException, Injectable } from '@nestjs/common';
import { HuddleRepository } from '../repositories/huddle.repository';
import { HuddleFactory } from '../factories/huddle.factory';
import { CreateHuddleDto } from '../dto/create-huddle.dto';
import { Huddle } from '../schemas/huddle.schema';

@Injectable()
export class HuddleCreationService {
  constructor(
    private readonly repository: HuddleRepository,
    private readonly factory: HuddleFactory,
  ) {}

  /**
   * Create a new huddle
   * Algorithm: Check for existing active huddle, then create
   * Time Complexity: O(log n) - indexed lookup + O(1) insertion
   */
  async createHuddle(userId: string, dto: CreateHuddleDto): Promise<Huddle> {
    // Check if user already in an active huddle
    const existingHuddle = await this.repository.findActiveByUserId(userId);

    if (existingHuddle) {
      throw new ConflictException(
        'User is already in an active huddle. Please leave the current huddle first.',
      );
    }

    // Create huddle data using factory
    const huddleData = this.factory.createHuddleData(userId, dto);

    // Save to database
    const huddle = await this.repository.create(huddleData as any);

    // Populate and return
    const populatedHuddle = await this.repository.findById((huddle as any)._id.toString());

    if (!populatedHuddle) {
      throw new Error('Failed to create huddle');
    }

    return populatedHuddle;
  }
}
