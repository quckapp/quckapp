import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum PromotionStatus {
  PROMOTED = 'promoted',
  EMERGENCY = 'emergency',
  ROLLED_BACK = 'rolled_back',
}

@Entity('promotion_records')
@Index(['serviceKey', 'apiVersion'])
@Index(['toEnvironment', 'status'])
export class PromotionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 128 })
  serviceKey: string;

  @Column({ length: 32 })
  apiVersion: string;

  @Column({ length: 64 })
  fromEnvironment: string;

  @Column({ length: 64 })
  toEnvironment: string;

  @Column({
    type: 'enum',
    enum: PromotionStatus,
    default: PromotionStatus.PROMOTED,
  })
  status: PromotionStatus;

  @Column({ length: 255 })
  promotedBy: string;

  @Column({ length: 255, nullable: true })
  approvedBy?: string;

  @Column('text', { nullable: true })
  reason?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
