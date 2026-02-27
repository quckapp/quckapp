package com.quckapp.promotion;

import java.util.List;

/**
 * Static utility class that defines the ordered environment promotion chain
 * and provides helpers for environment navigation, normalisation, and UAT
 * variant handling.
 *
 * <p>Chain order: local -> dev -> qa -> uat -> staging -> production -> live</p>
 */
public final class EnvironmentChain {

    private EnvironmentChain() {
        // utility class — no instantiation
    }

    /**
     * Canonical ordered promotion chain. Each service must traverse this
     * chain sequentially; skipping an environment is forbidden.
     */
    private static final List<String> CHAIN = List.of(
            "local", "dev", "qa", "uat", "staging", "production", "live"
    );

    /**
     * Recognised UAT lane variants. All normalise to the canonical "uat"
     * entry in the chain for ordering purposes.
     */
    private static final List<String> UAT_VARIANTS = List.of(
            "uat", "uat1", "uat2", "uat3"
    );

    /**
     * Environments that are considered unrestricted — promotions into these
     * environments do not require approval workflows.
     */
    private static final List<String> UNRESTRICTED = List.of(
            "local", "dev", "qa"
    );

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Returns the full ordered promotion chain.
     */
    public static List<String> chain() {
        return CHAIN;
    }

    /**
     * Normalises an environment name to its canonical chain entry.
     * UAT variants (uat1, uat2, uat3) are collapsed to "uat".
     * All values are lower-cased and trimmed.
     *
     * @param env the raw environment name
     * @return the normalised canonical name
     */
    public static String normalize(String env) {
        if (env == null) {
            return "local";
        }
        String lower = env.trim().toLowerCase();
        if (UAT_VARIANTS.contains(lower) && !lower.equals("uat")) {
            return "uat";
        }
        return lower;
    }

    /**
     * Returns the environment immediately before {@code env} in the chain,
     * or {@code null} if {@code env} is the first entry ("local") or is
     * not found in the chain.
     *
     * @param env the target environment (will be normalised)
     * @return the previous environment, or {@code null}
     */
    public static String previousOf(String env) {
        String normalised = normalize(env);
        int index = CHAIN.indexOf(normalised);
        if (index <= 0) {
            return null;
        }
        return CHAIN.get(index - 1);
    }

    /**
     * Returns {@code true} if the given environment is unrestricted —
     * i.e. promotions into it do not require approval.
     *
     * @param env the environment name (will be normalised)
     * @return {@code true} when unrestricted
     */
    public static boolean isUnrestricted(String env) {
        return UNRESTRICTED.contains(normalize(env));
    }

    /**
     * Returns all recognised UAT variant names.
     */
    public static List<String> uatVariants() {
        return UAT_VARIANTS;
    }
}
