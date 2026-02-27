package com.quckapp.promotion;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Core business-logic service for the promotion gate.
 *
 * <p>Supports three flows:
 * <ol>
 *   <li><strong>canPromote</strong> — checks whether a service version is
 *       eligible to be promoted into a target environment.</li>
 *   <li><strong>promote</strong> — records a standard (sequential) promotion
 *       to the next environment in the chain.</li>
 *   <li><strong>emergencyActivate</strong> — records a dual-approval
 *       emergency promotion that may skip chain ordering.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PromotionService {

    private final PromotionRepository promotionRepository;

    @Value("${promotion.service-name:unknown}")
    private String serviceName;

    @Value("${promotion.environment:local}")
    private String currentEnvironment;

    // ------------------------------------------------------------------
    // canPromote
    // ------------------------------------------------------------------

    /**
     * Determines whether the given service key + API version may be promoted
     * into {@code toEnvironment}.
     *
     * <p>Rules:
     * <ul>
     *   <li>Unrestricted environments (local, dev, qa) are always allowed.</li>
     *   <li>The target must exist in the chain.</li>
     *   <li>The immediately preceding environment in the chain must already
     *       have a completed promotion record (with UAT variant handling).</li>
     * </ul>
     *
     * @return a map with keys {@code allowed} (boolean) and {@code reason} (String)
     */
    @Transactional(readOnly = true)
    public Map<String, Object> canPromote(String serviceKey, String apiVersion, String toEnvironment) {
        String normalised = EnvironmentChain.normalize(toEnvironment);

        // Unrestricted environments are always promotable
        if (EnvironmentChain.isUnrestricted(normalised)) {
            return Map.of(
                    "allowed", true,
                    "reason", "Environment '" + normalised + "' is unrestricted"
            );
        }

        // Verify the target is in the chain
        if (!EnvironmentChain.chain().contains(normalised)) {
            return Map.of(
                    "allowed", false,
                    "reason", "Unknown environment: " + toEnvironment
            );
        }

        // The previous environment must have a completed record
        String previous = EnvironmentChain.previousOf(normalised);
        if (previous == null) {
            return Map.of(
                    "allowed", false,
                    "reason", "No preceding environment for '" + normalised + "'"
            );
        }

        // For UAT target, check any UAT variant
        boolean hasCompleted;
        if ("uat".equals(normalised)) {
            hasCompleted = checkAnyUatVariantCompleted(serviceKey, apiVersion, previous);
        } else if ("uat".equals(previous)) {
            // If previous is UAT, any UAT variant completing counts
            hasCompleted = checkAnyUatVariantCompletedAsSource(serviceKey, apiVersion);
        } else {
            hasCompleted = promotionRepository
                    .findFirstByToEnvironmentAndServiceKeyAndApiVersionAndStatusOrderByCreatedAtDesc(
                            previous, serviceKey, apiVersion, "completed")
                    .isPresent();
        }

        if (!hasCompleted) {
            return Map.of(
                    "allowed", false,
                    "reason", "No completed promotion found for environment '" + previous
                            + "' (service=" + serviceKey + ", version=" + apiVersion + ")"
            );
        }

        return Map.of(
                "allowed", true,
                "reason", "Previous environment '" + previous + "' has a completed promotion"
        );
    }

    // ------------------------------------------------------------------
    // promote
    // ------------------------------------------------------------------

    /**
     * Records a normal (sequential) promotion to the next environment in
     * the chain from the service's current environment.
     *
     * @return the persisted {@link PromotionRecord}
     * @throws IllegalStateException if the promotion is not allowed
     */
    @Transactional
    public PromotionRecord promote(String serviceKey, String apiVersion, String promotedBy) {
        String normalisedCurrent = EnvironmentChain.normalize(currentEnvironment);
        List<String> chain = EnvironmentChain.chain();
        int currentIndex = chain.indexOf(normalisedCurrent);

        if (currentIndex < 0 || currentIndex >= chain.size() - 1) {
            throw new IllegalStateException(
                    "Cannot promote from environment '" + currentEnvironment + "' — it is the last in the chain or not recognised");
        }

        String toEnvironment = chain.get(currentIndex + 1);

        Map<String, Object> check = canPromote(serviceKey, apiVersion, toEnvironment);
        if (!Boolean.TRUE.equals(check.get("allowed"))) {
            throw new IllegalStateException("Promotion not allowed: " + check.get("reason"));
        }

        PromotionRecord record = PromotionRecord.builder()
                .serviceKey(serviceKey)
                .apiVersion(apiVersion)
                .fromEnvironment(normalisedCurrent)
                .toEnvironment(toEnvironment)
                .promotionType("normal")
                .status("completed")
                .promotedBy(promotedBy)
                .build();

        PromotionRecord saved = promotionRepository.save(record);
        log.info("Promotion recorded: {} v{} from {} to {} by {}",
                serviceKey, apiVersion, normalisedCurrent, toEnvironment, promotedBy);
        return saved;
    }

    // ------------------------------------------------------------------
    // emergencyActivate
    // ------------------------------------------------------------------

    /**
     * Records a dual-approval emergency activation.
     *
     * <p>Required keys in the request map:
     * <ul>
     *   <li>{@code serviceKey} — the service identifier</li>
     *   <li>{@code apiVersion} — the API version string</li>
     *   <li>{@code toEnvironment} — target environment</li>
     *   <li>{@code promotedBy} — the person initiating the emergency</li>
     *   <li>{@code approver1} — first approver (must differ from promotedBy)</li>
     *   <li>{@code approver2} — second approver (must differ from promotedBy and approver1)</li>
     *   <li>{@code reason} — mandatory justification</li>
     *   <li>{@code jiraTicket} — optional JIRA reference</li>
     * </ul>
     *
     * @return the persisted {@link PromotionRecord}
     * @throws IllegalArgumentException on validation failure
     */
    @Transactional
    public PromotionRecord emergencyActivate(Map<String, String> request) {
        String serviceKey = requireKey(request, "serviceKey");
        String apiVersion = requireKey(request, "apiVersion");
        String toEnvironment = requireKey(request, "toEnvironment");
        String promotedBy = requireKey(request, "promotedBy");
        String approver1 = requireKey(request, "approver1");
        String approver2 = requireKey(request, "approver2");
        String reason = requireKey(request, "reason");
        String jiraTicket = request.get("jiraTicket");

        // Validate dual-approval: all three participants must be distinct
        if (promotedBy.equalsIgnoreCase(approver1)) {
            throw new IllegalArgumentException("approver1 must differ from promotedBy");
        }
        if (promotedBy.equalsIgnoreCase(approver2)) {
            throw new IllegalArgumentException("approver2 must differ from promotedBy");
        }
        if (approver1.equalsIgnoreCase(approver2)) {
            throw new IllegalArgumentException("approver1 and approver2 must be different people");
        }

        String normalisedFrom = EnvironmentChain.normalize(currentEnvironment);

        PromotionRecord record = PromotionRecord.builder()
                .serviceKey(serviceKey)
                .apiVersion(apiVersion)
                .fromEnvironment(normalisedFrom)
                .toEnvironment(EnvironmentChain.normalize(toEnvironment))
                .promotionType("emergency")
                .status("completed")
                .promotedBy(promotedBy)
                .approver1(approver1)
                .approver2(approver2)
                .jiraTicket(jiraTicket)
                .reason(reason)
                .build();

        PromotionRecord saved = promotionRepository.save(record);
        log.warn("EMERGENCY promotion recorded: {} v{} to {} by {} (approvers: {}, {}). Reason: {}",
                serviceKey, apiVersion, toEnvironment, promotedBy, approver1, approver2, reason);
        return saved;
    }

    // ------------------------------------------------------------------
    // history & status
    // ------------------------------------------------------------------

    /**
     * Returns the full promotion history for a service + API version,
     * ordered most-recent first.
     */
    @Transactional(readOnly = true)
    public List<PromotionRecord> history(String serviceKey, String apiVersion) {
        return promotionRepository.findHistory(serviceKey, apiVersion);
    }

    /**
     * Returns the current promotion status for a service + API version,
     * including the last completed promotion and whether a promotion to
     * the next environment is possible.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> status(String serviceKey, String apiVersion) {
        Optional<PromotionRecord> lastCompleted = promotionRepository
                .findFirstByServiceKeyAndApiVersionAndStatusOrderByCreatedAtDesc(
                        serviceKey, apiVersion, "completed");

        String normalisedCurrent = EnvironmentChain.normalize(currentEnvironment);
        List<String> chain = EnvironmentChain.chain();
        int currentIndex = chain.indexOf(normalisedCurrent);
        String nextEnvironment = (currentIndex >= 0 && currentIndex < chain.size() - 1)
                ? chain.get(currentIndex + 1)
                : null;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("serviceName", serviceName);
        result.put("serviceKey", serviceKey);
        result.put("apiVersion", apiVersion);
        result.put("currentEnvironment", normalisedCurrent);
        result.put("nextEnvironment", nextEnvironment);
        result.put("lastPromotion", lastCompleted.orElse(null));

        if (nextEnvironment != null) {
            result.put("canPromoteToNext", canPromote(serviceKey, apiVersion, nextEnvironment));
        }

        return result;
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private boolean checkAnyUatVariantCompleted(String serviceKey, String apiVersion, String previous) {
        // Check if previous env has a completed record — previous is before UAT
        return promotionRepository
                .findFirstByToEnvironmentAndServiceKeyAndApiVersionAndStatusOrderByCreatedAtDesc(
                        previous, serviceKey, apiVersion, "completed")
                .isPresent();
    }

    private boolean checkAnyUatVariantCompletedAsSource(String serviceKey, String apiVersion) {
        // Check any UAT variant has a completed promotion
        for (String variant : EnvironmentChain.uatVariants()) {
            if (promotionRepository
                    .findFirstByToEnvironmentAndServiceKeyAndApiVersionAndStatusOrderByCreatedAtDesc(
                            variant, serviceKey, apiVersion, "completed")
                    .isPresent()) {
                return true;
            }
        }
        return false;
    }

    private String requireKey(Map<String, String> map, String key) {
        String value = map.get(key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing required field: " + key);
        }
        return value.trim();
    }
}
