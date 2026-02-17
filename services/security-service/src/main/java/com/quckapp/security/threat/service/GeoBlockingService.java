package com.quckapp.security.threat.service;

import com.quckapp.security.common.exception.SecurityServiceException;
import com.quckapp.security.threat.model.GeoBlockRule;
import com.quckapp.security.threat.repository.GeoBlockRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeoBlockingService {

    private final GeoBlockRuleRepository geoBlockRuleRepository;

    /**
     * Check if a country code is blocked.
     */
    public boolean isCountryBlocked(String countryCode) {
        return geoBlockRuleRepository.existsByCountryCodeAndEnabledTrue(countryCode.toUpperCase());
    }

    /**
     * Get all geo-blocking rules.
     */
    public List<GeoBlockRule> getGeoBlockRules() {
        return geoBlockRuleRepository.findAll();
    }

    /**
     * Get only active geo-blocking rules.
     */
    public List<GeoBlockRule> getActiveGeoBlockRules() {
        return geoBlockRuleRepository.findByEnabledTrue();
    }

    /**
     * Create a new geo-blocking rule.
     */
    @Transactional
    public GeoBlockRule createGeoBlockRule(GeoBlockRule rule) {
        if (geoBlockRuleRepository.findByCountryCode(rule.getCountryCode().toUpperCase()).isPresent()) {
            throw new SecurityServiceException(
                    "Geo-block rule already exists for country: " + rule.getCountryCode(),
                    HttpStatus.CONFLICT, "GEO_RULE_EXISTS");
        }
        rule.setCountryCode(rule.getCountryCode().toUpperCase());
        GeoBlockRule saved = geoBlockRuleRepository.save(rule);
        log.info("Created geo-block rule for country: {} ({})", rule.getCountryCode(), rule.getCountryName());
        return saved;
    }

    /**
     * Delete a geo-blocking rule.
     */
    @Transactional
    public void deleteGeoBlockRule(String id) {
        GeoBlockRule rule = geoBlockRuleRepository.findById(id)
                .orElseThrow(() -> new SecurityServiceException("Geo-block rule not found",
                        HttpStatus.NOT_FOUND, "NOT_FOUND"));
        geoBlockRuleRepository.delete(rule);
        log.info("Deleted geo-block rule for country: {}", rule.getCountryCode());
    }

    /**
     * Toggle a geo-blocking rule.
     */
    @Transactional
    public GeoBlockRule toggleGeoBlockRule(String id) {
        GeoBlockRule rule = geoBlockRuleRepository.findById(id)
                .orElseThrow(() -> new SecurityServiceException("Geo-block rule not found",
                        HttpStatus.NOT_FOUND, "NOT_FOUND"));
        rule.setEnabled(!rule.getEnabled());
        return geoBlockRuleRepository.save(rule);
    }
}
