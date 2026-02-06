package com.quckapp.security.audit.dto;

import com.quckapp.security.audit.model.ComplianceReport;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceReportResponse {

    private String id;
    private String reportType;
    private String title;
    private String status;
    private Instant periodStart;
    private Instant periodEnd;
    private String summary;
    private String findings;
    private Long totalEvents;
    private Integer criticalFindings;
    private Integer highFindings;
    private Integer mediumFindings;
    private Integer lowFindings;
    private String generatedBy;
    private Instant generatedAt;
    private Instant createdAt;

    public static ComplianceReportResponse from(ComplianceReport report) {
        return ComplianceReportResponse.builder()
                .id(report.getId())
                .reportType(report.getReportType())
                .title(report.getTitle())
                .status(report.getStatus())
                .periodStart(report.getPeriodStart())
                .periodEnd(report.getPeriodEnd())
                .summary(report.getSummary())
                .findings(report.getFindings())
                .totalEvents(report.getTotalEvents())
                .criticalFindings(report.getCriticalFindings())
                .highFindings(report.getHighFindings())
                .mediumFindings(report.getMediumFindings())
                .lowFindings(report.getLowFindings())
                .generatedBy(report.getGeneratedBy())
                .generatedAt(report.getGeneratedAt())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
