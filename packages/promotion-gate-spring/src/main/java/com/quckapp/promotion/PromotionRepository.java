package com.quckapp.promotion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link PromotionRecord} entities.
 */
@Repository
public interface PromotionRepository extends JpaRepository<PromotionRecord, String> {

    /**
     * Finds the most recent promotion record for a given service + API
     * version targeting a specific environment with the specified status.
     */
    Optional<PromotionRecord> findFirstByToEnvironmentAndServiceKeyAndApiVersionAndStatusOrderByCreatedAtDesc(
            String toEnvironment, String serviceKey, String apiVersion, String status);

    /**
     * Finds all promotion records for a given service + API version
     * targeting a specific environment with the specified status.
     */
    List<PromotionRecord> findByToEnvironmentAndServiceKeyAndApiVersionAndStatus(
            String toEnvironment, String serviceKey, String apiVersion, String status);

    /**
     * Returns the full promotion history for a service + API version,
     * ordered most-recent first.
     */
    @Query("SELECT p FROM PromotionRecord p " +
           "WHERE p.serviceKey = :serviceKey AND p.apiVersion = :apiVersion " +
           "ORDER BY p.createdAt DESC")
    List<PromotionRecord> findHistory(
            @Param("serviceKey") String serviceKey,
            @Param("apiVersion") String apiVersion);

    /**
     * Returns the most recent completed promotion for a service + API
     * version, regardless of target environment.
     */
    Optional<PromotionRecord> findFirstByServiceKeyAndApiVersionAndStatusOrderByCreatedAtDesc(
            String serviceKey, String apiVersion, String status);
}
