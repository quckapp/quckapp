package com.quckapp.security.threat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quckapp.security.threat.dto.ThreatDashboardResponse;
import com.quckapp.security.threat.dto.ThreatEventResponse;
import com.quckapp.security.threat.model.ThreatEvent;
import com.quckapp.security.threat.model.ThreatRule;
import com.quckapp.security.threat.repository.BlockedIpRepository;
import com.quckapp.security.threat.repository.GeoBlockRuleRepository;
import com.quckapp.security.threat.repository.ThreatEventRepository;
import com.quckapp.security.threat.repository.ThreatRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThreatDetectionService {

    private final ThreatEventRepository threatEventRepository;
    private final ThreatRuleRepository threatRuleRepository;
    private final BlockedIpRepository blockedIpRepository;
    private final GeoBlockRuleRepository geoBlockRuleRepository;
    private final IpBlockingService ipBlockingService;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${kafka.topics.security-threats:security.threats}")
    private String securityThreatsTopic;

    /**
     * Analyze a login event for potential threats.
     */
    @Transactional
    public Optional<ThreatEvent> analyzeLoginEvent(String sourceIp, String userId,
                                                     String email, boolean success) {
        if (!success) {
            return checkBruteForce(sourceIp, userId, email);
        }
        return Optional.empty();
    }

    /**
     * Check for brute force attack patterns.
     */
    private Optional<ThreatEvent> checkBruteForce(String sourceIp, String userId, String email) {
        List<ThreatRule> rules = threatRuleRepository.findByRuleTypeAndEnabledTrue("BRUTE_FORCE");

        for (ThreatRule rule : rules) {
            Instant windowStart = Instant.now().minus(Duration.ofMinutes(rule.getWindowMinutes()));
            long failedAttempts = threatEventRepository
                    .countBySourceIpAndEventTypeSince(sourceIp, "LOGIN_FAILURE", windowStart);

            // Count current attempt
            ThreatEvent failureEvent = createThreatEvent("LOGIN_FAILURE", "LOW", sourceIp,
                    userId, email, "Failed login attempt from " + sourceIp, null);

            if (failedAttempts + 1 >= rule.getThreshold()) {
                ThreatEvent threatEvent = createThreatEvent("BRUTE_FORCE", rule.getSeverity(),
                        sourceIp, userId, email,
                        String.format("Brute force detected: %d failed attempts in %d minutes from %s",
                                failedAttempts + 1, rule.getWindowMinutes(), sourceIp),
                        null);

                // Auto-block if rule dictates
                if ("BLOCK".equals(rule.getAction()) && rule.getAutoBlockDurationHours() != null) {
                    ipBlockingService.autoBlockIp(sourceIp,
                            "Auto-blocked: brute force attack", rule.getAutoBlockDurationHours());
                }

                // Publish threat event to Kafka
                publishThreatEvent(threatEvent);

                log.warn("BRUTE FORCE detected from IP: {} ({} attempts)", sourceIp, failedAttempts + 1);
                return Optional.of(threatEvent);
            }

            return Optional.of(failureEvent);
        }

        return Optional.empty();
    }

    /**
     * Log a custom threat event.
     */
    @Transactional
    public ThreatEvent logThreatEvent(String eventType, String severity, String sourceIp,
                                       String userId, String email, String description, String details) {
        return createThreatEvent(eventType, severity, sourceIp, userId, email, description, details);
    }

    /**
     * Get threat events with pagination and optional filters.
     */
    public Page<ThreatEventResponse> getThreatEvents(String eventType, String severity,
                                                       Pageable pageable) {
        Page<ThreatEvent> events;
        if (eventType != null) {
            events = threatEventRepository.findByEventType(eventType, pageable);
        } else if (severity != null) {
            events = threatEventRepository.findBySeverity(severity, pageable);
        } else {
            events = threatEventRepository.findAll(pageable);
        }
        return events.map(ThreatEventResponse::from);
    }

    /**
     * Get threat event by ID.
     */
    public Optional<ThreatEventResponse> getThreatEvent(String id) {
        return threatEventRepository.findById(id).map(ThreatEventResponse::from);
    }

    /**
     * Resolve a threat event.
     */
    @Transactional
    public ThreatEvent resolveThreatEvent(String id, String resolvedBy) {
        ThreatEvent event = threatEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Threat event not found: " + id));

        event.setResolved(true);
        event.setResolvedAt(Instant.now());
        event.setResolvedBy(resolvedBy);

        return threatEventRepository.save(event);
    }

    /**
     * Get threat rules.
     */
    public List<ThreatRule> getThreatRules() {
        return threatRuleRepository.findAll();
    }

    /**
     * Create or update a threat rule.
     */
    @Transactional
    public ThreatRule saveThreatRule(ThreatRule rule) {
        return threatRuleRepository.save(rule);
    }

    /**
     * Get threat dashboard summary.
     */
    public ThreatDashboardResponse getDashboard() {
        Instant last24h = Instant.now().minus(Duration.ofHours(24));
        Instant last7d = Instant.now().minus(Duration.ofDays(7));

        Map<String, Long> threatsByType = new LinkedHashMap<>();
        threatEventRepository.countByEventTypeSince(last7d)
                .forEach(row -> threatsByType.put((String) row[0], (Long) row[1]));

        Map<String, Long> threatsBySeverity = new LinkedHashMap<>();
        threatEventRepository.countBySeveritySince(last7d)
                .forEach(row -> threatsBySeverity.put((String) row[0], (Long) row[1]));

        return ThreatDashboardResponse.builder()
                .totalThreatsLast24h(threatEventRepository.findByPeriod(last24h, Instant.now()).size())
                .totalThreatsLast7d(threatEventRepository.findByPeriod(last7d, Instant.now()).size())
                .totalBlockedIps(blockedIpRepository.count())
                .activeGeoBlockRules(geoBlockRuleRepository.findByEnabledTrue().size())
                .threatsByType(threatsByType)
                .threatsBySeverity(threatsBySeverity)
                .unresolvedThreats(threatEventRepository.findByResolved(false, Pageable.unpaged()).getTotalElements())
                .build();
    }

    /**
     * Clean up old threat events.
     */
    @Transactional
    public void cleanupOldEvents(int retentionDays) {
        Instant cutoff = Instant.now().minus(Duration.ofDays(retentionDays));
        threatEventRepository.deleteByCreatedAtBefore(cutoff);
        log.info("Cleaned up threat events older than {} days", retentionDays);
    }

    private ThreatEvent createThreatEvent(String eventType, String severity, String sourceIp,
                                           String userId, String email, String description,
                                           String details) {
        ThreatEvent event = ThreatEvent.builder()
                .eventType(eventType)
                .severity(severity)
                .sourceIp(sourceIp)
                .targetUserId(userId)
                .targetEmail(email)
                .description(description)
                .details(details)
                .build();

        return threatEventRepository.save(event);
    }

    private void publishThreatEvent(ThreatEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(ThreatEventResponse.from(event));
            kafkaTemplate.send(securityThreatsTopic, event.getSourceIp(), payload);
            log.debug("Published threat event to Kafka: {}", event.getEventType());
        } catch (JsonProcessingException e) {
            log.error("Failed to publish threat event to Kafka", e);
        }
    }
}
