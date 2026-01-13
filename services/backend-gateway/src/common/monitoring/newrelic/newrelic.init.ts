/**
 * New Relic Agent Initialization
 *
 * IMPORTANT: This file must be imported FIRST in your main.ts,
 * before any other imports, for automatic instrumentation to work.
 *
 * Usage in main.ts:
 * ```typescript
 * import './common/monitoring/newrelic/newrelic.init';
 * // ... rest of imports
 * ```
 *
 * Also requires a newrelic.js configuration file in the project root.
 */

const isEnabled = process.env.NEW_RELIC_ENABLED === 'true';

if (isEnabled) {
  try {
    // New Relic must be required, not imported
    require('newrelic');
    console.log('[New Relic] APM agent initialized');
  } catch (error: any) {
    console.warn(`[New Relic] Agent initialization failed: ${error.message}`);
  }
}

export {};
