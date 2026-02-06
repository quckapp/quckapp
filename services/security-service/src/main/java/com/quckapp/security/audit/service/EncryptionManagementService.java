package com.quckapp.security.audit.service;

import com.quckapp.security.audit.model.EncryptionKey;
import com.quckapp.security.audit.repository.EncryptionKeyRepository;
import com.quckapp.security.common.exception.SecurityServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EncryptionManagementService {

    private final EncryptionKeyRepository encryptionKeyRepository;

    /**
     * Register a new encryption key for tracking.
     */
    @Transactional
    public EncryptionKey registerKey(EncryptionKey key) {
        if (key.getRotationIntervalDays() != null && key.getRotationIntervalDays() > 0) {
            key.setNextRotationAt(Instant.now().plus(Duration.ofDays(key.getRotationIntervalDays())));
        }
        EncryptionKey saved = encryptionKeyRepository.save(key);
        log.info("Registered encryption key: {} (service: {})", key.getKeyAlias(), key.getServiceName());
        return saved;
    }

    /**
     * Mark a key as rotated.
     */
    @Transactional
    public EncryptionKey markKeyRotated(String id) {
        EncryptionKey key = encryptionKeyRepository.findById(id)
                .orElseThrow(() -> new SecurityServiceException("Encryption key not found",
                        HttpStatus.NOT_FOUND, "NOT_FOUND"));

        key.setRotatedAt(Instant.now());
        if (key.getRotationIntervalDays() != null && key.getRotationIntervalDays() > 0) {
            key.setNextRotationAt(Instant.now().plus(Duration.ofDays(key.getRotationIntervalDays())));
        }

        EncryptionKey saved = encryptionKeyRepository.save(key);
        log.info("Marked encryption key as rotated: {}", key.getKeyAlias());
        return saved;
    }

    /**
     * Get all encryption keys.
     */
    public List<EncryptionKey> getAllKeys() {
        return encryptionKeyRepository.findAll();
    }

    /**
     * Get keys that need rotation.
     */
    public List<EncryptionKey> getKeysNeedingRotation() {
        return encryptionKeyRepository.findKeysNeedingRotation(Instant.now());
    }

    /**
     * Get expired keys.
     */
    public List<EncryptionKey> getExpiredKeys() {
        return encryptionKeyRepository.findExpiredKeys(Instant.now());
    }
}
