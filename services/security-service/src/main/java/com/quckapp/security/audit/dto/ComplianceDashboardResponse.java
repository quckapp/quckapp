package com.quckapp.security.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceDashboardResponse {

    private long totalSecurityEvents;
    private long criticalEvents;
    private long highEvents;
    private long pendingAccessReviews;
    private long keysNeedingRotation;
    private long expiredKeys;
    private long totalComplianceReports;
    private Map<String, Long> eventsByType;
    private Map<String, Long> eventsBySeverity;
    private List<ComplianceReportResponse> recentReports;
}
