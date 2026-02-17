package com.quckapp.security.waf.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WafValidationResult {

    @Builder.Default
    private boolean allowed = true;

    @Builder.Default
    private List<WafViolation> violations = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WafViolation {
        private String ruleId;
        private String ruleName;
        private String category;
        private String severity;
        private String matchedPattern;
        private String matchedContent;
        private String action;
    }

    public void addViolation(WafViolation violation) {
        if (violations == null) {
            violations = new ArrayList<>();
        }
        violations.add(violation);
        if ("BLOCK".equals(violation.getAction())) {
            this.allowed = false;
        }
    }

    public boolean hasViolations() {
        return violations != null && !violations.isEmpty();
    }
}
