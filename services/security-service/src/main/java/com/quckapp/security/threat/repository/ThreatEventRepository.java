package com.quckapp.security.threat.repository;

import com.quckapp.security.threat.model.ThreatEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ThreatEventRepository extends JpaRepository<ThreatEvent, String> {

    Page<ThreatEvent> findByEventType(String eventType, Pageable pageable);

    Page<ThreatEvent> findBySeverity(String severity, Pageable pageable);

    Page<ThreatEvent> findBySourceIp(String sourceIp, Pageable pageable);

    Page<ThreatEvent> findByResolved(Boolean resolved, Pageable pageable);

    @Query("SELECT COUNT(t) FROM ThreatEvent t WHERE t.sourceIp = :ip AND t.eventType = :type " +
           "AND t.createdAt > :since")
    long countBySourceIpAndEventTypeSince(
            @Param("ip") String sourceIp,
            @Param("type") String eventType,
            @Param("since") Instant since);

    @Query("SELECT t FROM ThreatEvent t WHERE t.createdAt BETWEEN :start AND :end")
    List<ThreatEvent> findByPeriod(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT t.eventType, COUNT(t) FROM ThreatEvent t WHERE t.createdAt > :since " +
           "GROUP BY t.eventType ORDER BY COUNT(t) DESC")
    List<Object[]> countByEventTypeSince(@Param("since") Instant since);

    @Query("SELECT t.severity, COUNT(t) FROM ThreatEvent t WHERE t.createdAt > :since " +
           "GROUP BY t.severity")
    List<Object[]> countBySeveritySince(@Param("since") Instant since);

    void deleteByCreatedAtBefore(Instant cutoff);
}
