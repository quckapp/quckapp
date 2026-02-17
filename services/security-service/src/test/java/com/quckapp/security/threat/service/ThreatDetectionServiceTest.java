package com.quckapp.security.threat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quckapp.security.threat.model.ThreatEvent;
import com.quckapp.security.threat.model.ThreatRule;
import com.quckapp.security.threat.repository.BlockedIpRepository;
import com.quckapp.security.threat.repository.GeoBlockRuleRepository;
import com.quckapp.security.threat.repository.ThreatEventRepository;
import com.quckapp.security.threat.repository.ThreatRuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ThreatDetectionServiceTest {

    @Mock
    private ThreatEventRepository threatEventRepository;
    @Mock
    private ThreatRuleRepository threatRuleRepository;
    @Mock
    private BlockedIpRepository blockedIpRepository;
    @Mock
    private GeoBlockRuleRepository geoBlockRuleRepository;
    @Mock
    private IpBlockingService ipBlockingService;
    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ThreatDetectionService threatDetectionService;

    private ThreatRule bruteForceRule;

    @BeforeEach
    void setUp() {
        bruteForceRule = ThreatRule.builder()
                .id("rule-1")
                .name("brute_force_login")
                .ruleType("BRUTE_FORCE")
                .severity("HIGH")
                .threshold(5)
                .windowMinutes(5)
                .action("BLOCK")
                .autoBlockDurationHours(24)
                .enabled(true)
                .build();
    }

    @Test
    void analyzeLoginEvent_successfulLogin_noThreat() {
        Optional<ThreatEvent> result = threatDetectionService.analyzeLoginEvent(
                "192.168.1.1", "user-1", "test@test.com", true);

        assertTrue(result.isEmpty());
        verify(threatEventRepository, never()).save(any());
    }

    @Test
    void analyzeLoginEvent_failedLogin_belowThreshold_logOnly() {
        when(threatRuleRepository.findByRuleTypeAndEnabledTrue("BRUTE_FORCE"))
                .thenReturn(List.of(bruteForceRule));
        when(threatEventRepository.countBySourceIpAndEventTypeSince(anyString(), anyString(), any()))
                .thenReturn(2L); // Below threshold of 5
        when(threatEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Optional<ThreatEvent> result = threatDetectionService.analyzeLoginEvent(
                "192.168.1.1", "user-1", "test@test.com", false);

        assertTrue(result.isPresent());
        assertEquals("LOGIN_FAILURE", result.get().getEventType());
        verify(ipBlockingService, never()).autoBlockIp(anyString(), anyString(), anyInt());
    }

    @Test
    void analyzeLoginEvent_failedLogin_aboveThreshold_triggersBlock() {
        when(threatRuleRepository.findByRuleTypeAndEnabledTrue("BRUTE_FORCE"))
                .thenReturn(List.of(bruteForceRule));
        when(threatEventRepository.countBySourceIpAndEventTypeSince(anyString(), anyString(), any()))
                .thenReturn(5L); // Meets threshold
        when(threatEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Optional<ThreatEvent> result = threatDetectionService.analyzeLoginEvent(
                "192.168.1.1", "user-1", "test@test.com", false);

        assertTrue(result.isPresent());
        assertEquals("BRUTE_FORCE", result.get().getEventType());
        verify(ipBlockingService).autoBlockIp("192.168.1.1", "Auto-blocked: brute force attack", 24);
    }

    @Test
    void logThreatEvent_savesEvent() {
        when(threatEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ThreatEvent event = threatDetectionService.logThreatEvent(
                "SUSPICIOUS_ACTIVITY", "MEDIUM", "10.0.0.1",
                "user-2", "user@test.com", "Suspicious activity detected", null);

        assertNotNull(event);
        assertEquals("SUSPICIOUS_ACTIVITY", event.getEventType());
        assertEquals("MEDIUM", event.getSeverity());
        verify(threatEventRepository).save(any());
    }

    @Test
    void getThreatRules_returnsAllRules() {
        when(threatRuleRepository.findAll()).thenReturn(List.of(bruteForceRule));

        List<ThreatRule> rules = threatDetectionService.getThreatRules();

        assertEquals(1, rules.size());
        assertEquals("brute_force_login", rules.get(0).getName());
    }

    @Test
    void resolveThreatEvent_markAsResolved() {
        ThreatEvent event = ThreatEvent.builder()
                .id("event-1")
                .eventType("BRUTE_FORCE")
                .resolved(false)
                .build();

        when(threatEventRepository.findById("event-1")).thenReturn(Optional.of(event));
        when(threatEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ThreatEvent resolved = threatDetectionService.resolveThreatEvent("event-1", "admin");

        assertTrue(resolved.getResolved());
        assertNotNull(resolved.getResolvedAt());
        assertEquals("admin", resolved.getResolvedBy());
    }
}
