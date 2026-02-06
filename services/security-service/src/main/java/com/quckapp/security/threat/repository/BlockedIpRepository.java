package com.quckapp.security.threat.repository;

import com.quckapp.security.threat.model.BlockedIp;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface BlockedIpRepository extends JpaRepository<BlockedIp, String> {

    Optional<BlockedIp> findByIpAddress(String ipAddress);

    List<BlockedIp> findByCidrRange(String cidrRange);

    Page<BlockedIp> findAll(Pageable pageable);

    @Query("SELECT b FROM BlockedIp b WHERE b.ipAddress = :ip OR b.cidrRange IS NOT NULL")
    List<BlockedIp> findAllBlockRulesForIp(@Param("ip") String ipAddress);

    List<BlockedIp> findByIsPermanentFalseAndExpiresAtBefore(Instant now);

    @Query("SELECT COUNT(b) > 0 FROM BlockedIp b WHERE b.ipAddress = :ip AND " +
           "(b.isPermanent = true OR b.expiresAt > :now)")
    boolean isIpBlocked(@Param("ip") String ipAddress, @Param("now") Instant now);

    void deleteByIsPermanentFalseAndExpiresAtBefore(Instant now);
}
