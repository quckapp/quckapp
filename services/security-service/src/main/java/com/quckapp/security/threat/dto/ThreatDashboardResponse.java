package com.quckapp.security.threat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThreatDashboardResponse {

    private long totalThreatsLast24h;
    private long totalThreatsLast7d;
    private long totalBlockedIps;
    private long activeGeoBlockRules;
    private Map<String, Long> threatsByType;
    private Map<String, Long> threatsBySeverity;
    private long unresolvedThreats;
}
