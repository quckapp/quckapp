import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromotionRecord, PromotionStatus } from './promotion.entity';
import {
  normalize,
  previousOf,
  isUnrestricted,
  uatVariants,
  CHAIN,
} from './chain';

export interface PromotionOptions {
  serviceName: string;
  environment: string;
}

export interface CanPromoteResult {
  allowed: boolean;
  blockedReason?: string;
  currentStage: string;
  targetStage: string;
  requiredPreviousStage?: string;
}

export interface PromoteResult {
  id: string;
  serviceKey: string;
  apiVersion: string;
  fromEnvironment: string;
  toEnvironment: string;
  promotedBy: string;
  status: PromotionStatus;
  createdAt: Date;
}

export interface EmergencyActivateBody {
  serviceKey: string;
  apiVersion: string;
  toEnvironment: string;
  promotedBy: string;
  approvedBy: string;
  reason: string;
}

export interface StatusResult {
  serviceKey: string;
  apiVersion: string;
  currentEnvironment: string | null;
  promotions: { environment: string; promotedAt: Date; status: PromotionStatus }[];
}

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(
    @InjectRepository(PromotionRecord)
    private readonly promotionRepo: Repository<PromotionRecord>,
    @Inject('PROMOTION_OPTIONS')
    private readonly options: PromotionOptions,
  ) {}

  /**
   * Check whether a service+version can be promoted to the target environment.
   * Requires that the version was previously promoted to the preceding stage.
   */
  async canPromote(
    serviceKey: string,
    apiVersion: string,
    toEnvironment: string,
  ): Promise<CanPromoteResult> {
    const targetStage = normalize(toEnvironment);
    const currentStage = normalize(this.options.environment);

    if (isUnrestricted(toEnvironment)) {
      return {
        allowed: true,
        currentStage,
        targetStage,
      };
    }

    const requiredPreviousStage = previousOf(toEnvironment);
    if (!requiredPreviousStage) {
      return {
        allowed: true,
        currentStage,
        targetStage,
      };
    }

    // Expand the required previous stage to concrete variants (handles uat -> uat1/2/3)
    const previousVariants = uatVariants(requiredPreviousStage);

    // Look for a successful promotion record to any variant of the previous stage
    const existingPromotion = await this.promotionRepo
      .createQueryBuilder('pr')
      .where('pr.serviceKey = :serviceKey', { serviceKey })
      .andWhere('pr.apiVersion = :apiVersion', { apiVersion })
      .andWhere('pr.toEnvironment IN (:...envs)', { envs: previousVariants })
      .andWhere('pr.status IN (:...statuses)', {
        statuses: [PromotionStatus.PROMOTED, PromotionStatus.EMERGENCY],
      })
      .orderBy('pr.createdAt', 'DESC')
      .getOne();

    if (!existingPromotion) {
      return {
        allowed: false,
        blockedReason: `Version ${apiVersion} of ${serviceKey} has not been promoted to ${requiredPreviousStage} yet. ` +
          `Promotion chain: ${CHAIN.join(' -> ')}`,
        currentStage,
        targetStage,
        requiredPreviousStage,
      };
    }

    return {
      allowed: true,
      currentStage,
      targetStage,
      requiredPreviousStage,
    };
  }

  /**
   * Record a successful promotion to the next environment in the chain.
   */
  async promote(
    serviceKey: string,
    apiVersion: string,
    promotedBy: string,
  ): Promise<PromoteResult> {
    const currentEnv = this.options.environment;
    const targetStage = normalize(currentEnv);

    // Determine the "from" environment (the previous stage in the chain)
    const fromEnvironment = previousOf(currentEnv) || 'unknown';

    const record = this.promotionRepo.create({
      serviceKey,
      apiVersion,
      fromEnvironment,
      toEnvironment: currentEnv,
      status: PromotionStatus.PROMOTED,
      promotedBy,
    });

    const saved = await this.promotionRepo.save(record);

    this.logger.log(
      `Promotion recorded: ${serviceKey}@${apiVersion} -> ${currentEnv} by ${promotedBy}`,
    );

    return {
      id: saved.id,
      serviceKey: saved.serviceKey,
      apiVersion: saved.apiVersion,
      fromEnvironment: saved.fromEnvironment,
      toEnvironment: saved.toEnvironment,
      promotedBy: saved.promotedBy,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }

  /**
   * Emergency activation: bypasses the promotion chain but requires dual approval
   * (promotedBy !== approvedBy) and a reason.
   */
  async emergencyActivate(body: EmergencyActivateBody): Promise<PromoteResult> {
    if (!body.promotedBy || !body.approvedBy) {
      throw new BadRequestException(
        'Emergency activation requires both promotedBy and approvedBy',
      );
    }

    if (body.promotedBy === body.approvedBy) {
      throw new BadRequestException(
        'Emergency activation requires dual approval: promotedBy and approvedBy must be different people',
      );
    }

    if (!body.reason || body.reason.trim().length === 0) {
      throw new BadRequestException(
        'Emergency activation requires a reason',
      );
    }

    const fromEnvironment = previousOf(body.toEnvironment) || 'emergency-bypass';

    const record = this.promotionRepo.create({
      serviceKey: body.serviceKey,
      apiVersion: body.apiVersion,
      fromEnvironment,
      toEnvironment: body.toEnvironment,
      status: PromotionStatus.EMERGENCY,
      promotedBy: body.promotedBy,
      approvedBy: body.approvedBy,
      reason: body.reason,
      metadata: { emergency: true, timestamp: new Date().toISOString() },
    });

    const saved = await this.promotionRepo.save(record);

    this.logger.warn(
      `EMERGENCY promotion: ${body.serviceKey}@${body.apiVersion} -> ${body.toEnvironment} ` +
      `by ${body.promotedBy}, approved by ${body.approvedBy}. Reason: ${body.reason}`,
    );

    return {
      id: saved.id,
      serviceKey: saved.serviceKey,
      apiVersion: saved.apiVersion,
      fromEnvironment: saved.fromEnvironment,
      toEnvironment: saved.toEnvironment,
      promotedBy: saved.promotedBy,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }

  /**
   * Return the promotion history for a service+version, ordered newest first.
   */
  async history(
    serviceKey: string,
    apiVersion: string,
  ): Promise<PromotionRecord[]> {
    return this.promotionRepo.find({
      where: { serviceKey, apiVersion },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Return the current promotion status for a service+version across all environments.
   */
  async status(
    serviceKey: string,
    apiVersion: string,
  ): Promise<StatusResult> {
    const records = await this.promotionRepo.find({
      where: { serviceKey, apiVersion },
      order: { createdAt: 'DESC' },
    });

    // Determine the highest environment reached
    let currentEnvironment: string | null = null;
    if (records.length > 0) {
      const activeRecords = records.filter(
        (r) => r.status !== PromotionStatus.ROLLED_BACK,
      );
      if (activeRecords.length > 0) {
        // Find the highest stage in the chain
        let highestIdx = -1;
        for (const r of activeRecords) {
          const idx = CHAIN.indexOf(normalize(r.toEnvironment));
          if (idx > highestIdx) {
            highestIdx = idx;
            currentEnvironment = r.toEnvironment;
          }
        }
      }
    }

    const promotions = records.map((r) => ({
      environment: r.toEnvironment,
      promotedAt: r.createdAt,
      status: r.status,
    }));

    return {
      serviceKey,
      apiVersion,
      currentEnvironment,
      promotions,
    };
  }
}
