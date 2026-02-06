package com.quckapp.security.audit.controller;

import com.quckapp.security.audit.dto.ComplianceDashboardResponse;
import com.quckapp.security.audit.dto.ComplianceReportResponse;
import com.quckapp.security.audit.model.AccessReview;
import com.quckapp.security.audit.model.ComplianceReport;
import com.quckapp.security.audit.model.EncryptionKey;
import com.quckapp.security.audit.service.AccessReviewService;
import com.quckapp.security.audit.service.ComplianceReportService;
import com.quckapp.security.audit.service.EncryptionManagementService;
import com.quckapp.security.common.dto.ApiResponse;
import com.quckapp.security.common.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/v1/compliance")
@RequiredArgsConstructor
@Tag(name = "Compliance", description = "Compliance reporting, access reviews, and encryption key management")
public class ComplianceController {

    private final ComplianceReportService complianceReportService;
    private final AccessReviewService accessReviewService;
    private final EncryptionManagementService encryptionManagementService;

    // ===== Compliance Reports =====

    @GetMapping("/reports")
    @Operation(summary = "List compliance reports")
    public ResponseEntity<ApiResponse<PageResponse<ComplianceReportResponse>>> getReports(
            @RequestParam(required = false) String reportType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ComplianceReportResponse> reports = complianceReportService.getReports(
                reportType,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(reports)));
    }

    @PostMapping("/reports")
    @Operation(summary = "Generate a new compliance report")
    public ResponseEntity<ApiResponse<ComplianceReportResponse>> generateReport(
            @RequestParam(defaultValue = "GENERAL") String reportType,
            @RequestParam(required = false) Integer periodDays) {
        Instant periodEnd = Instant.now();
        Instant periodStart = periodEnd.minus(Duration.ofDays(periodDays != null ? periodDays : 30));

        ComplianceReport report = complianceReportService.generateReport(reportType, periodStart, periodEnd);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Report generated", ComplianceReportResponse.from(report)));
    }

    @GetMapping("/reports/{id}")
    @Operation(summary = "Get compliance report details")
    public ResponseEntity<ApiResponse<ComplianceReportResponse>> getReport(@PathVariable String id) {
        return complianceReportService.getReport(id)
                .map(report -> ResponseEntity.ok(ApiResponse.ok(report)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ===== Access Reviews =====

    @GetMapping("/access-reviews")
    @Operation(summary = "List access reviews")
    public ResponseEntity<ApiResponse<PageResponse<AccessReview>>> getAccessReviews(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AccessReview> reviews = accessReviewService.getAccessReviews(
                status, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(reviews)));
    }

    @PostMapping("/access-reviews")
    @Operation(summary = "Create a new access review")
    public ResponseEntity<ApiResponse<AccessReview>> createAccessReview(
            @RequestParam String userId,
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false) String currentRoles,
            @RequestParam(required = false) String currentPermissions) {
        AccessReview review = accessReviewService.createAccessReview(
                userId, userEmail, currentRoles, currentPermissions);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Access review created", review));
    }

    @PostMapping("/access-reviews/{id}/complete")
    @Operation(summary = "Complete an access review")
    public ResponseEntity<ApiResponse<AccessReview>> completeAccessReview(
            @PathVariable String id,
            @RequestParam String reviewerId,
            @RequestParam(required = false) String reviewerEmail,
            @RequestParam String recommendation,
            @RequestParam(required = false) String notes) {
        AccessReview review = accessReviewService.completeReview(
                id, reviewerId, reviewerEmail, recommendation, notes);
        return ResponseEntity.ok(ApiResponse.ok("Access review completed", review));
    }

    // ===== Encryption Keys =====

    @GetMapping("/encryption-keys")
    @Operation(summary = "List encryption key status")
    public ResponseEntity<ApiResponse<List<EncryptionKey>>> getEncryptionKeys() {
        return ResponseEntity.ok(ApiResponse.ok(encryptionManagementService.getAllKeys()));
    }

    @PostMapping("/encryption-keys")
    @Operation(summary = "Register a new encryption key")
    public ResponseEntity<ApiResponse<EncryptionKey>> registerKey(@RequestBody EncryptionKey key) {
        EncryptionKey saved = encryptionManagementService.registerKey(key);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Key registered", saved));
    }

    @PostMapping("/encryption-keys/{id}/rotate")
    @Operation(summary = "Mark encryption key as rotated")
    public ResponseEntity<ApiResponse<EncryptionKey>> rotateKey(@PathVariable String id) {
        EncryptionKey key = encryptionManagementService.markKeyRotated(id);
        return ResponseEntity.ok(ApiResponse.ok("Key marked as rotated", key));
    }

    // ===== Dashboard =====

    @GetMapping("/dashboard")
    @Operation(summary = "Get compliance dashboard")
    public ResponseEntity<ApiResponse<ComplianceDashboardResponse>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(complianceReportService.getDashboard()));
    }
}
