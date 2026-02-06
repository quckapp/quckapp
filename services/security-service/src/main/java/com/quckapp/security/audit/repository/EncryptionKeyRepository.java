package com.quckapp.security.audit.repository;

import com.quckapp.security.audit.model.EncryptionKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface EncryptionKeyRepository extends JpaRepository<EncryptionKey, String> {

    Optional<EncryptionKey> findByKeyAlias(String keyAlias);

    List<EncryptionKey> findByStatus(String status);

    List<EncryptionKey> findByServiceName(String serviceName);

    @Query("SELECT e FROM EncryptionKey e WHERE e.nextRotationAt <= :now AND e.status = 'ACTIVE'")
    List<EncryptionKey> findKeysNeedingRotation(@Param("now") Instant now);

    @Query("SELECT e FROM EncryptionKey e WHERE e.expiresAt <= :now AND e.status = 'ACTIVE'")
    List<EncryptionKey> findExpiredKeys(@Param("now") Instant now);
}
