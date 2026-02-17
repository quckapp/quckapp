package com.quckapp.security.waf.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WafRuleRequest {

    @NotBlank(message = "Rule name is required")
    private String name;

    private String description;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Pattern is required")
    private String pattern;

    @Builder.Default
    private String severity = "MEDIUM";

    @Builder.Default
    private Boolean enabled = true;

    @Builder.Default
    private Integer priority = 100;

    @Builder.Default
    private String action = "LOG";
}
