package com.quckapp.security.threat.repository;

import com.quckapp.security.threat.model.ThreatRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ThreatRuleRepository extends JpaRepository<ThreatRule, String> {

    Optional<ThreatRule> findByName(String name);

    List<ThreatRule> findByRuleType(String ruleType);

    List<ThreatRule> findByEnabledTrue();

    List<ThreatRule> findByRuleTypeAndEnabledTrue(String ruleType);
}
