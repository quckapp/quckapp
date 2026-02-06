package com.quckapp.security.audit.repository;

import com.quckapp.security.audit.model.AccessReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccessReviewRepository extends JpaRepository<AccessReview, String> {

    Page<AccessReview> findByStatus(String status, Pageable pageable);

    Page<AccessReview> findByUserId(String userId, Pageable pageable);

    List<AccessReview> findByStatusAndReviewerIdIsNull(String status);
}
