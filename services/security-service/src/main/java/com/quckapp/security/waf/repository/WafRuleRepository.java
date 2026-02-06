package com.quckapp.security.waf.repository;

import com.quckapp.security.waf.model.WafRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WafRuleRepository extends JpaRepository<WafRule, String> {

    Optional<WafRule> findByName(String name);

    List<WafRule> findByCategory(String category);

    List<WafRule> findByEnabledTrueOrderByPriorityAsc();

    List<WafRule> findByCategoryAndEnabledTrueOrderByPriorityAsc(String category);
}
