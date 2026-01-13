/**
 * Barrel export pattern - Single entry point for all status hooks
 * Makes imports cleaner: import { useStatusGrouping } from '@/hooks/status'
 */

export { useStatusGrouping } from './useStatusGrouping';
export type { GroupedStatus } from './useStatusGrouping';

export { useStatusMediaNavigation } from './useStatusMediaNavigation';
export type { MediaItem } from './useStatusMediaNavigation';

export { useStatusProgress } from './useStatusProgress';

export { useStatusViewers } from './useStatusViewers';
