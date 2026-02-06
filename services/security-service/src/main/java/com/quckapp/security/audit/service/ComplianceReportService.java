package com.quckapp.security.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quckapp.security.audit.dto.ComplianceDashboardResponse;
import com.quckapp.security.audit.dto.ComplianceReportResponse;
import com.quckapp.security.audit.model.ComplianceReport;
import com.quckapp.security.audit.model.EncryptionKey;
import com.quckapp.security.audit.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplianceReportService {

    private final ComplianceReportRepository complianceReportRepository;
    private final SecurityEventRepository securityEventRepository;
    private final AccessReviewRepository accessReviewRepository;
    private final EncryptionKeyRepository encryptionKeyRepository;
    private final ObjectMapper objectMapper;

    /**
     * Generate a new compliance report for a given period.
     */
    @Transactional
    public ComplianceReport generateReport(String reportType, Instant periodStart, Instant periodEnd) {
        log.info("Generating {} compliance report for period {} to {}", reportType, periodStart, periodEnd);

        // Gather metrics
        long totalEvents = securityEventRepository.countByPeriod(periodStart, periodEnd);
        long criticalEvents = securityEventRepository.countBySeverityAndPeriod("CRITICAL", periodStart, periodEnd);
        long highEvents = securityEventRepository.countBySeverityAndPeriod("HIGH", periodStart, periodEnd);
        long mediumEvents = securityEventRepository.countBySeverityAndPeriod("MEDIUM", periodStart, periodEnd);
        long lowEvents = securityEventRepository.countBySeverityAndPeriod("LOW", periodStart, periodEnd);

        // Build summary
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalSecurityEvents", totalEvents);
        summary.put("criticalEvents", criticalEvents);
        summary.put("highEvents", highEvents);
        summary.put("reportType", reportType);
        summary.put("periodDays", Duration.between(periodStart, periodEnd).toDays());

        // Build findings from event type breakdown
        List<Object[]> eventsByType = securityEventRepository.countByEventTypeForPeriod(periodStart, periodEnd);
        List<Map<String, Object>> findings = new ArrayList<>();
        for (Object[] row : eventsByType) {
            Map<String, Object> finding = new LinkedHashMap<>();
            finding.put("eventType", row[0]);
            finding.put("count", row[1]);
            findings.add(finding);
        }

        String title = String.format("%s Compliance Report (%s to %s)",
                reportType.toUpperCase(),
                periodStart.toString().substring(0, 10),
                periodEnd.toString().substring(0, 10));

        ComplianceReport report = ComplianceReport.builder()
                .reportType(reportType)
                .title(title)
                .status("COMPLETED")
                .periodStart(periodStart)
                .periodEnd(periodEnd)
                .totalEvents(totalEvents)
                .criticalFindings((int) criticalEvents)
                .highFindings((int) highEvents)
                .mediumFindings((int) mediumEvents)
                .lowFindings((int) lowEvents)
                .generatedAt(Instant.now())
                .build();

        try {
            report.setSummary(objectMapper.writeValueAsString(summary));
            report.setFindings(objectMapper.writeValueAsString(findings));
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize report data", e);
        }

        ComplianceReport saved = complianceReportRepository.save(report);
        log.info("Generated compliance report: {} (id: {})", title, saved.getId());
        return saved;
    }

    /**
     * List compliance reports.
     */
    public Page<ComplianceReportResponse> getReports(String reportType, Pageable pageable) {
        Page<ComplianceReport> reports;
        if (reportType != null) {
            reports = complianceReportRepository.findByReportType(reportType, pageable);
        } else {
            reports = complianceReportRepository.findAll(pageable);
        }
        return reports.map(ComplianceReportResponse::from);
    }

    /**
     * Get a specific report.
     */
    public Optional<ComplianceReportResponse> getReport(String id) {
        return complianceReportRepository.findById(id).map(ComplianceReportResponse::from);
    }

    /**
     * Get compliance dashboard.
     */
    public ComplianceDashboardResponse getDashboard() {
        Instant now = Instant.now();
        Instant last30d = now.minus(Duration.ofDays(30));

        long totalEvents = securityEventRepository.countByPeriod(last30d, now);
        long criticalEvents = securityEventRepository.countBySeverityAndPeriod("CRITICAL", last30d, now);
        long highEvents = securityEventRepository.countBySeverityAndPeriod("HIGH", last30d, now);

        long pendingReviews = accessReviewRepository.findByStatusAndReviewerIdIsNull("PENDING").size();
        long keysNeedingRotation = encryptionKeyRepository.findKeysNeedingRotation(now).size();
        long expiredKeys = encryptionKeyRepository.findExpiredKeys(now).size();

        Map<String, Long> eventsByType = new LinkedHashMap<>();
        securityEventRepository.countByEventTypeForPeriod(last30d, now)
                .forEach(row -> eventsByType.put((String) row[0], (Long) row[1]));

        Map<String, Long> eventsBySeverity = new LinkedHashMap<>();
        securityEventRepository.countBySeverityForPeriod(last30d, now)
                .forEach(row -> eventsBySeverity.put((String) row[0], (Long) row[1]));

        Page<ComplianceReport> recentReports = complianceReportRepository.findAll(
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")));

        return ComplianceDashboardResponse.builder()
                .totalSecurityEvents(totalEvents)
                .criticalEvents(criticalEvents)
                .highEvents(highEvents)
                .pendingAccessReviews(pendingReviews)
                .keysNeedingRotation(keysNeedingRotation)
                .expiredKeys(expiredKeys)
                .totalComplianceReports(complianceReportRepository.count())
                .eventsByType(eventsByType)
                .eventsBySeverity(eventsBySeverity)
                .recentReports(recentReports.map(ComplianceReportResponse::from).getContent())
                .build();
    }
}
