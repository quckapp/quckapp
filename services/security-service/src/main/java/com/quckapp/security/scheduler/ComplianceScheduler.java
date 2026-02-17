package com.quckapp.security.scheduler;

import com.quckapp.security.audit.service.ComplianceReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class ComplianceScheduler {

    private final ComplianceReportService complianceReportService;

    /**
     * Auto-generate monthly compliance report.
     * Runs at 2 AM on the 1st of every month.
     */
    @Scheduled(cron = "${security-service.audit.compliance-report-cron:0 0 2 1 * *}")
    public void generateMonthlyReport() {
        log.info("Generating monthly compliance report...");
        Instant periodEnd = Instant.now();
        Instant periodStart = periodEnd.minus(Duration.ofDays(30));

        try {
            complianceReportService.generateReport("MONTHLY", periodStart, periodEnd);
            log.info("Monthly compliance report generated successfully");
        } catch (Exception e) {
            log.error("Failed to generate monthly compliance report", e);
        }
    }
}
