package com.quckapp.security.audit.repository;

import com.quckapp.security.audit.model.SecurityEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEvent, String> {

    Page<SecurityEvent> findByEventType(String eventType, Pageable pageable);

    Page<SecurityEvent> findByUserId(String userId, Pageable pageable);

    Page<SecurityEvent> findBySourceService(String sourceService, Pageable pageable);

    Page<SecurityEvent> findBySeverity(String severity, Pageable pageable);

    @Query("SELECT s FROM SecurityEvent s WHERE s.createdAt BETWEEN :start AND :end")
    List<SecurityEvent> findByPeriod(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT s.eventType, COUNT(s) FROM SecurityEvent s WHERE s.createdAt BETWEEN :start AND :end " +
           "GROUP BY s.eventType ORDER BY COUNT(s) DESC")
    List<Object[]> countByEventTypeForPeriod(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT s.severity, COUNT(s) FROM SecurityEvent s WHERE s.createdAt BETWEEN :start AND :end " +
           "GROUP BY s.severity")
    List<Object[]> countBySeverityForPeriod(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT s.status, COUNT(s) FROM SecurityEvent s WHERE s.createdAt BETWEEN :start AND :end " +
           "GROUP BY s.status")
    List<Object[]> countByStatusForPeriod(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT COUNT(s) FROM SecurityEvent s WHERE s.createdAt BETWEEN :start AND :end")
    long countByPeriod(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT COUNT(s) FROM SecurityEvent s WHERE s.severity = :severity AND s.createdAt BETWEEN :start AND :end")
    long countBySeverityAndPeriod(@Param("severity") String severity,
                                  @Param("start") Instant start, @Param("end") Instant end);

    void deleteByCreatedAtBefore(Instant cutoff);
}
