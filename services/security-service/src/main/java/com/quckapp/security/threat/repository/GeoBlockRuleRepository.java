package com.quckapp.security.threat.repository;

import com.quckapp.security.threat.model.GeoBlockRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GeoBlockRuleRepository extends JpaRepository<GeoBlockRule, String> {

    Optional<GeoBlockRule> findByCountryCode(String countryCode);

    List<GeoBlockRule> findByEnabledTrue();

    boolean existsByCountryCodeAndEnabledTrue(String countryCode);
}
