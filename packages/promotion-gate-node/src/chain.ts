/**
 * Environment promotion chain and helpers.
 *
 * The canonical order a version must traverse before reaching production:
 *   dev -> qa -> uat -> staging -> production
 *
 * UAT is a single logical stage with multiple parallel variants
 * (uat1, uat2, uat3). Any one of them satisfies the "uat" gate.
 */

/** Ordered list of logical environment stages. */
export const CHAIN: readonly string[] = [
  'dev',
  'qa',
  'uat',
  'staging',
  'production',
] as const;

/** Concrete UAT variant names that map to the logical "uat" stage. */
export const UAT_VARIANTS: readonly string[] = [
  'uat1',
  'uat2',
  'uat3',
] as const;

/**
 * Normalize an environment name to its logical chain stage.
 * e.g. "uat2" -> "uat", "production" -> "production"
 */
export function normalize(env: string): string {
  const lower = env.toLowerCase().trim();
  if (UAT_VARIANTS.includes(lower)) {
    return 'uat';
  }
  return lower;
}

/**
 * Return the stage that must have been promoted *before* `env` is reachable.
 * Returns `undefined` for "dev" (nothing precedes it).
 */
export function previousOf(env: string): string | undefined {
  const stage = normalize(env);
  const idx = CHAIN.indexOf(stage);
  if (idx <= 0) {
    return undefined;
  }
  return CHAIN[idx - 1];
}

/**
 * Returns `true` when no promotion gate applies (i.e. the first stage).
 */
export function isUnrestricted(env: string): boolean {
  return normalize(env) === CHAIN[0];
}

/**
 * Expand a logical stage to its concrete variants.
 * "uat" -> ["uat1","uat2","uat3"], anything else -> [env]
 */
export function uatVariants(env: string): string[] {
  if (normalize(env) === 'uat') {
    return [...UAT_VARIANTS];
  }
  return [env.toLowerCase().trim()];
}
