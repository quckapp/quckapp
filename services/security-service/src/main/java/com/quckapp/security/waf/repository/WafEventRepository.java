package com.quckapp.security.waf.repository;

import com.quckapp.security.waf.model.WafEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface WafEventRepository extends JpaRepository<WafEvent, String> {

    Page<WafEvent> findByCategory(String category, Pageable pageable);

    Page<WafEvent> findBySourceIp(String sourceIp, Pageable pageable);

    Page<WafEvent> findBySeverity(String severity, Pageable pageable);

    @Query("SELECT w.category, COUNT(w) FROM WafEvent w WHERE w.createdAt > :since " +
           "GROUP BY w.category ORDER BY COUNT(w) DESC")
    List<Object[]> countByCategorySince(@Param("since") Instant since);

    @Query("SELECT w.actionTaken, COUNT(w) FROM WafEvent w WHERE w.createdAt > :since " +
           "GROUP BY w.actionTaken")
    List<Object[]> countByActionSince(@Param("since") Instant since);

    @Query("SELECT COUNT(w) FROM WafEvent w WHERE w.createdAt > :since")
    long countSince(@Param("since") Instant since);

    void deleteByCreatedAtBefore(Instant cutoff);
}
