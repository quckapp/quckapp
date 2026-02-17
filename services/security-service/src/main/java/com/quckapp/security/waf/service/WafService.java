package com.quckapp.security.waf.service;

import com.quckapp.security.common.exception.SecurityServiceException;
import com.quckapp.security.waf.dto.*;
import com.quckapp.security.waf.model.WafEvent;
import com.quckapp.security.waf.model.WafRule;
import com.quckapp.security.waf.repository.WafEventRepository;
import com.quckapp.security.waf.repository.WafRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class WafService {

    private final WafRuleRepository wafRuleRepository;
    private final WafEventRepository wafEventRepository;

    @Value("${security-service.waf.enabled:true}")
    private boolean wafEnabled;

    @Value("${security-service.waf.mode:DETECT}")
    private String wafMode;

    /**
     * Validate a request against all active WAF rules.
     */
    @Transactional
    public WafValidationResult validateRequest(ValidateRequestDto request) {
        WafValidationResult result = WafValidationResult.builder().allowed(true).build();

        if (!wafEnabled) {
            return result;
        }

        List<WafRule> activeRules = wafRuleRepository.findByEnabledTrueOrderByPriorityAsc();

        for (WafRule rule : activeRules) {
            checkRule(rule, request, result);
        }

        // Log events for any violations
        if (result.hasViolations()) {
            for (WafValidationResult.WafViolation violation : result.getViolations()) {
                logWafEvent(violation, request);
            }

            // In DETECT mode, allow the request but still log violations
            if ("DETECT".equals(wafMode)) {
                result.setAllowed(true);
            }
        }

        return result;
    }

    /**
     * Check a single rule against the request.
     */
    private void checkRule(WafRule rule, ValidateRequestDto request, WafValidationResult result) {
        try {
            Pattern pattern = Pattern.compile(rule.getPattern(), Pattern.CASE_INSENSITIVE);
            String contentToCheck = buildContentToCheck(request);

            Matcher matcher = pattern.matcher(contentToCheck);
            if (matcher.find()) {
                String effectiveAction = "BLOCK".equals(wafMode) ? rule.getAction() : "LOG";

                WafValidationResult.WafViolation violation = WafValidationResult.WafViolation.builder()
                        .ruleId(rule.getId())
                        .ruleName(rule.getName())
                        .category(rule.getCategory())
                        .severity(rule.getSeverity())
                        .matchedPattern(rule.getPattern())
                        .matchedContent(truncate(matcher.group(), 500))
                        .action(effectiveAction)
                        .build();

                result.addViolation(violation);
                log.warn("WAF rule matched: {} (category: {}, severity: {}, action: {})",
                        rule.getName(), rule.getCategory(), rule.getSeverity(), effectiveAction);
            }
        } catch (Exception e) {
            log.error("Error evaluating WAF rule '{}': {}", rule.getName(), e.getMessage());
        }
    }

    /**
     * Build the content string to check against rules.
     */
    private String buildContentToCheck(ValidateRequestDto request) {
        StringBuilder sb = new StringBuilder();

        if (request.getPath() != null) {
            sb.append(request.getPath()).append(" ");
        }
        if (request.getBody() != null) {
            sb.append(request.getBody()).append(" ");
        }
        if (request.getQueryParams() != null) {
            request.getQueryParams().values().forEach(v -> sb.append(v).append(" "));
        }
        if (request.getHeaders() != null) {
            request.getHeaders().values().forEach(v -> sb.append(v).append(" "));
        }

        return sb.toString();
    }

    /**
     * Log a WAF event to the database.
     */
    private void logWafEvent(WafValidationResult.WafViolation violation, ValidateRequestDto request) {
        WafEvent event = WafEvent.builder()
                .ruleId(violation.getRuleId())
                .ruleName(violation.getRuleName())
                .category(violation.getCategory())
                .actionTaken(violation.getAction())
                .sourceIp(request.getSourceIp())
                .requestMethod(request.getMethod())
                .requestPath(request.getPath())
                .matchedPattern(violation.getMatchedPattern())
                .matchedContent(violation.getMatchedContent())
                .severity(violation.getSeverity())
                .userAgent(request.getUserAgent())
                .build();

        wafEventRepository.save(event);
    }

    // ===== WAF Rules CRUD =====

    public List<WafRule> getAllRules() {
        return wafRuleRepository.findAll();
    }

    public List<WafRule> getActiveRules() {
        return wafRuleRepository.findByEnabledTrueOrderByPriorityAsc();
    }

    @Transactional
    public WafRule createRule(WafRuleRequest request) {
        if (wafRuleRepository.findByName(request.getName()).isPresent()) {
            throw new SecurityServiceException("WAF rule already exists: " + request.getName(),
                    HttpStatus.CONFLICT, "RULE_EXISTS");
        }

        WafRule rule = WafRule.builder()
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .pattern(request.getPattern())
                .severity(request.getSeverity())
                .enabled(request.getEnabled())
                .priority(request.getPriority())
                .action(request.getAction())
                .build();

        return wafRuleRepository.save(rule);
    }

    @Transactional
    public WafRule updateRule(String id, WafRuleRequest request) {
        WafRule rule = wafRuleRepository.findById(id)
                .orElseThrow(() -> new SecurityServiceException("WAF rule not found",
                        HttpStatus.NOT_FOUND, "NOT_FOUND"));

        rule.setName(request.getName());
        rule.setDescription(request.getDescription());
        rule.setCategory(request.getCategory());
        rule.setPattern(request.getPattern());
        rule.setSeverity(request.getSeverity());
        rule.setEnabled(request.getEnabled());
        rule.setPriority(request.getPriority());
        rule.setAction(request.getAction());

        return wafRuleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(String id) {
        if (!wafRuleRepository.existsById(id)) {
            throw new SecurityServiceException("WAF rule not found",
                    HttpStatus.NOT_FOUND, "NOT_FOUND");
        }
        wafRuleRepository.deleteById(id);
    }

    // ===== WAF Events =====

    public Page<WafEvent> getWafEvents(String category, Pageable pageable) {
        if (category != null) {
            return wafEventRepository.findByCategory(category, pageable);
        }
        return wafEventRepository.findAll(pageable);
    }

    // ===== WAF Config =====

    public Map<String, Object> getWafConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("enabled", wafEnabled);
        config.put("mode", wafMode);
        return config;
    }

    // ===== WAF Stats =====

    public WafStatsResponse getStats() {
        Instant last24h = Instant.now().minus(Duration.ofHours(24));
        Instant last7d = Instant.now().minus(Duration.ofDays(7));

        Map<String, Long> eventsByCategory = new LinkedHashMap<>();
        wafEventRepository.countByCategorySince(last7d)
                .forEach(row -> eventsByCategory.put((String) row[0], (Long) row[1]));

        Map<String, Long> eventsByAction = new LinkedHashMap<>();
        wafEventRepository.countByActionSince(last7d)
                .forEach(row -> eventsByAction.put((String) row[0], (Long) row[1]));

        return WafStatsResponse.builder()
                .totalEventsLast24h(wafEventRepository.countSince(last24h))
                .totalEventsLast7d(wafEventRepository.countSince(last7d))
                .totalRules(wafRuleRepository.count())
                .activeRules(wafRuleRepository.findByEnabledTrueOrderByPriorityAsc().size())
                .wafMode(wafMode)
                .wafEnabled(wafEnabled)
                .eventsByCategory(eventsByCategory)
                .eventsByAction(eventsByAction)
                .build();
    }

    private String truncate(String str, int maxLength) {
        if (str == null) return null;
        return str.length() > maxLength ? str.substring(0, maxLength) + "..." : str;
    }
}
