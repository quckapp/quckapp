package com.quckapp.security.waf.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WafStatsResponse {

    private long totalEventsLast24h;
    private long totalEventsLast7d;
    private long totalRules;
    private long activeRules;
    private String wafMode;
    private boolean wafEnabled;
    private Map<String, Long> eventsByCategory;
    private Map<String, Long> eventsByAction;
}
