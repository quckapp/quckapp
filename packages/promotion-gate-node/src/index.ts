export { PromotionGateModule } from './promotion.module';
export { PromotionRecord, PromotionStatus } from './promotion.entity';
export {
  PromotionService,
  PromotionOptions,
  CanPromoteResult,
  PromoteResult,
  EmergencyActivateBody,
  StatusResult,
} from './promotion.service';
export {
  CHAIN,
  UAT_VARIANTS,
  normalize,
  previousOf,
  isUnrestricted,
  uatVariants,
} from './chain';
