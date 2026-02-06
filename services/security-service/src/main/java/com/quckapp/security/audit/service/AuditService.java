package com.quckapp.security.audit.service;

import com.quckapp.security.audit.dto.SecurityEventRequest;
import com.quckapp.security.audit.model.SecurityEvent;
import com.quckapp.security.audit.repository.SecurityEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final SecurityEventRepository securityEventRepository;

    /**
     * Log a new security event (immutable - append only).
     */
    @Transactional
    public SecurityEvent logEvent(SecurityEventRequest request) {
        SecurityEvent event = SecurityEvent.builder()
                .eventType(request.getEventType())
                .severity(request.getSeverity())
                .sourceService(request.getSourceService())
                .userId(request.getUserId())
                .userEmail(request.getUserEmail())
                .ipAddress(request.getIpAddress())
                .userAgent(request.getUserAgent())
                .resourceType(request.getResourceType())
                .resourceId(request.getResourceId())
                .action(request.getAction())
                .status(request.getStatus())
                .details(request.getDetails())
                .requestId(request.getRequestId())
                .sessionId(request.getSessionId())
                .build();

        SecurityEvent saved = securityEventRepository.save(event);
        log.debug("Logged security event: type={}, action={}, service={}",
                request.getEventType(), request.getAction(), request.getSourceService());
        return saved;
    }

    /**
     * Search security events with optional filters.
     */
    public Page<SecurityEvent> searchEvents(String eventType, String userId,
                                             String sourceService, String severity,
                                             Pageable pageable) {
        if (eventType != null) {
            return securityEventRepository.findByEventType(eventType, pageable);
        } else if (userId != null) {
            return securityEventRepository.findByUserId(userId, pageable);
        } else if (sourceService != null) {
            return securityEventRepository.findBySourceService(sourceService, pageable);
        } else if (severity != null) {
            return securityEventRepository.findBySeverity(severity, pageable);
        }
        return securityEventRepository.findAll(pageable);
    }

    /**
     * Get a specific security event by ID.
     */
    public Optional<SecurityEvent> getEvent(String id) {
        return securityEventRepository.findById(id);
    }

    /**
     * Get event count for a time period.
     */
    public long countEvents(Instant start, Instant end) {
        return securityEventRepository.countByPeriod(start, end);
    }

    /**
     * Get event count by severity for a time period.
     */
    public long countBySeverity(String severity, Instant start, Instant end) {
        return securityEventRepository.countBySeverityAndPeriod(severity, start, end);
    }

    /**
     * Clean up old security events based on retention policy.
     */
    @Transactional
    public void cleanupOldEvents(int retentionDays) {
        Instant cutoff = Instant.now().minus(Duration.ofDays(retentionDays));
        securityEventRepository.deleteByCreatedAtBefore(cutoff);
        log.info("Cleaned up security events older than {} days", retentionDays);
    }
}
