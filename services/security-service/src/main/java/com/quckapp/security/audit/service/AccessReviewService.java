package com.quckapp.security.audit.service;

import com.quckapp.security.audit.model.AccessReview;
import com.quckapp.security.audit.repository.AccessReviewRepository;
import com.quckapp.security.common.exception.SecurityServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccessReviewService {

    private final AccessReviewRepository accessReviewRepository;

    /**
     * Create a new access review for a user.
     */
    @Transactional
    public AccessReview createAccessReview(String userId, String userEmail,
                                            String currentRoles, String currentPermissions) {
        AccessReview review = AccessReview.builder()
                .userId(userId)
                .userEmail(userEmail)
                .currentRoles(currentRoles)
                .currentPermissions(currentPermissions)
                .status("PENDING")
                .dueDate(Instant.now().plus(Duration.ofDays(30)))
                .build();

        AccessReview saved = accessReviewRepository.save(review);
        log.info("Created access review for user: {} (id: {})", userEmail, saved.getId());
        return saved;
    }

    /**
     * Complete an access review.
     */
    @Transactional
    public AccessReview completeReview(String id, String reviewerId, String reviewerEmail,
                                        String recommendation, String notes) {
        AccessReview review = accessReviewRepository.findById(id)
                .orElseThrow(() -> new SecurityServiceException("Access review not found",
                        HttpStatus.NOT_FOUND, "NOT_FOUND"));

        review.setStatus("COMPLETED");
        review.setReviewerId(reviewerId);
        review.setReviewerEmail(reviewerEmail);
        review.setRecommendation(recommendation);
        review.setReviewNotes(notes);
        review.setReviewedAt(Instant.now());

        AccessReview saved = accessReviewRepository.save(review);
        log.info("Completed access review {} with recommendation: {}", id, recommendation);
        return saved;
    }

    /**
     * List access reviews.
     */
    public Page<AccessReview> getAccessReviews(String status, Pageable pageable) {
        if (status != null) {
            return accessReviewRepository.findByStatus(status, pageable);
        }
        return accessReviewRepository.findAll(pageable);
    }

    /**
     * Get pending unassigned reviews.
     */
    public List<AccessReview> getPendingReviews() {
        return accessReviewRepository.findByStatusAndReviewerIdIsNull("PENDING");
    }
}
