package com.quckapp.security.scheduler;

import com.quckapp.security.audit.model.AccessReview;
import com.quckapp.security.audit.service.AccessReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AccessReviewScheduler {

    private final AccessReviewService accessReviewService;

    /**
     * Check for overdue access reviews daily at 4 AM.
     */
    @Scheduled(cron = "0 0 4 * * *")
    public void checkOverdueReviews() {
        log.info("Checking for overdue access reviews...");
        List<AccessReview> pending = accessReviewService.getPendingReviews();
        if (!pending.isEmpty()) {
            log.warn("Found {} pending unassigned access reviews", pending.size());
        }
    }
}
