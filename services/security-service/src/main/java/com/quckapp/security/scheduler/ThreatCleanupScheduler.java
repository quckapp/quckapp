package com.quckapp.security.scheduler;

import com.quckapp.security.threat.service.IpBlockingService;
import com.quckapp.security.threat.service.ThreatDetectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ThreatCleanupScheduler {

    private final ThreatDetectionService threatDetectionService;
    private final IpBlockingService ipBlockingService;

    @Value("${security-service.threat.cleanup-retention-days:90}")
    private int retentionDays;

    /**
     * Clean up expired IP blocks every hour.
     */
    @Scheduled(fixedRate = 3600000) // Every hour
    public void cleanupExpiredBlocks() {
        log.info("Running expired IP block cleanup...");
        int cleaned = ipBlockingService.cleanupExpiredBlocks();
        log.info("Expired IP block cleanup completed: {} removed", cleaned);
    }

    /**
     * Archive old threat events daily at 3 AM.
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void archiveOldThreatEvents() {
        log.info("Running threat event archive (retention: {} days)...", retentionDays);
        threatDetectionService.cleanupOldEvents(retentionDays);
        log.info("Threat event archive completed");
    }
}
