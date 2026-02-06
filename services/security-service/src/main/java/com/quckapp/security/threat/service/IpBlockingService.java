package com.quckapp.security.threat.service;

import com.quckapp.security.common.exception.SecurityServiceException;
import com.quckapp.security.common.util.IpUtils;
import com.quckapp.security.threat.dto.BlockIpRequest;
import com.quckapp.security.threat.model.BlockedIp;
import com.quckapp.security.threat.repository.BlockedIpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class IpBlockingService {

    private static final String BLOCKED_IP_CACHE_PREFIX = "security:blocked_ip:";

    private final BlockedIpRepository blockedIpRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Block an IP address or CIDR range.
     */
    @Transactional
    public BlockedIp blockIp(BlockIpRequest request) {
        // Validate IP
        if (!IpUtils.isValidIpAddress(request.getIpAddress()) &&
            !IpUtils.isValidCidr(request.getIpAddress())) {
            throw new SecurityServiceException("Invalid IP address or CIDR: " + request.getIpAddress(),
                    HttpStatus.BAD_REQUEST, "INVALID_IP");
        }

        // Check if already blocked
        if (blockedIpRepository.findByIpAddress(request.getIpAddress()).isPresent()) {
            throw new SecurityServiceException("IP is already blocked: " + request.getIpAddress(),
                    HttpStatus.CONFLICT, "IP_ALREADY_BLOCKED");
        }

        Instant expiresAt = null;
        if (!Boolean.TRUE.equals(request.getPermanent()) && request.getDurationHours() != null) {
            expiresAt = Instant.now().plus(Duration.ofHours(request.getDurationHours()));
        }

        BlockedIp blockedIp = BlockedIp.builder()
                .ipAddress(request.getIpAddress())
                .cidrRange(request.getCidrRange())
                .reason(request.getReason())
                .isPermanent(request.getPermanent())
                .expiresAt(expiresAt)
                .build();

        BlockedIp saved = blockedIpRepository.save(blockedIp);

        // Cache in Redis for fast lookups
        cacheBlockedIp(saved);

        log.info("Blocked IP: {} (reason: {}, permanent: {})", request.getIpAddress(),
                request.getReason(), request.getPermanent());

        return saved;
    }

    /**
     * Automatically block an IP based on threat detection rules.
     */
    @Transactional
    public BlockedIp autoBlockIp(String ipAddress, String reason, int durationHours) {
        if (blockedIpRepository.findByIpAddress(ipAddress).isPresent()) {
            log.debug("IP already blocked: {}", ipAddress);
            return blockedIpRepository.findByIpAddress(ipAddress).orElse(null);
        }

        BlockIpRequest request = BlockIpRequest.builder()
                .ipAddress(ipAddress)
                .reason(reason)
                .permanent(false)
                .durationHours(durationHours)
                .build();

        return blockIp(request);
    }

    /**
     * Unblock an IP address.
     */
    @Transactional
    public void unblockIp(String id) {
        BlockedIp blockedIp = blockedIpRepository.findById(id)
                .orElseThrow(() -> new SecurityServiceException("Blocked IP not found",
                        HttpStatus.NOT_FOUND, "NOT_FOUND"));

        blockedIpRepository.delete(blockedIp);
        evictBlockedIpCache(blockedIp.getIpAddress());

        log.info("Unblocked IP: {}", blockedIp.getIpAddress());
    }

    /**
     * Check if an IP is currently blocked.
     */
    public boolean isIpBlocked(String ipAddress) {
        // Check Redis cache first
        Boolean cached = (Boolean) redisTemplate.opsForValue()
                .get(BLOCKED_IP_CACHE_PREFIX + ipAddress);
        if (Boolean.TRUE.equals(cached)) {
            return true;
        }

        // Check database for exact match
        boolean blocked = blockedIpRepository.isIpBlocked(ipAddress, Instant.now());
        if (blocked) {
            redisTemplate.opsForValue().set(BLOCKED_IP_CACHE_PREFIX + ipAddress, true,
                    Duration.ofMinutes(5));
            return true;
        }

        // Check CIDR ranges
        List<BlockedIp> allRules = blockedIpRepository.findAll();
        for (BlockedIp rule : allRules) {
            if (rule.getCidrRange() != null && IpUtils.isInCidrRange(ipAddress, rule.getCidrRange())) {
                if (Boolean.TRUE.equals(rule.getIsPermanent()) ||
                    (rule.getExpiresAt() != null && rule.getExpiresAt().isAfter(Instant.now()))) {
                    redisTemplate.opsForValue().set(BLOCKED_IP_CACHE_PREFIX + ipAddress, true,
                            Duration.ofMinutes(5));
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get all blocked IPs with pagination.
     */
    public Page<BlockedIp> getBlockedIps(Pageable pageable) {
        return blockedIpRepository.findAll(pageable);
    }

    /**
     * Clean up expired temporary blocks.
     */
    @Transactional
    public int cleanupExpiredBlocks() {
        List<BlockedIp> expired = blockedIpRepository
                .findByIsPermanentFalseAndExpiresAtBefore(Instant.now());

        for (BlockedIp ip : expired) {
            evictBlockedIpCache(ip.getIpAddress());
        }

        blockedIpRepository.deleteByIsPermanentFalseAndExpiresAtBefore(Instant.now());
        log.info("Cleaned up {} expired IP blocks", expired.size());
        return expired.size();
    }

    private void cacheBlockedIp(BlockedIp blockedIp) {
        Duration ttl = Boolean.TRUE.equals(blockedIp.getIsPermanent())
                ? Duration.ofHours(24)
                : Duration.between(Instant.now(), blockedIp.getExpiresAt());

        if (!ttl.isNegative()) {
            redisTemplate.opsForValue().set(
                    BLOCKED_IP_CACHE_PREFIX + blockedIp.getIpAddress(), true, ttl);
        }
    }

    private void evictBlockedIpCache(String ipAddress) {
        redisTemplate.delete(BLOCKED_IP_CACHE_PREFIX + ipAddress);
    }
}
