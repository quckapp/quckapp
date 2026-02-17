package com.quckapp.security.audit.controller;

import com.quckapp.security.audit.dto.SecurityEventRequest;
import com.quckapp.security.audit.model.SecurityEvent;
import com.quckapp.security.audit.service.AuditService;
import com.quckapp.security.common.dto.ApiResponse;
import com.quckapp.security.common.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/audit")
@RequiredArgsConstructor
@Tag(name = "Audit", description = "Security audit event logging and search endpoints")
public class AuditController {

    private final AuditService auditService;

    @PostMapping("/events")
    @Operation(summary = "Log a security event")
    public ResponseEntity<ApiResponse<SecurityEvent>> logEvent(
            @Valid @RequestBody SecurityEventRequest request) {
        SecurityEvent event = auditService.logEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Event logged", event));
    }

    @GetMapping("/events")
    @Operation(summary = "Search security events")
    public ResponseEntity<ApiResponse<PageResponse<SecurityEvent>>> searchEvents(
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String sourceService,
            @RequestParam(required = false) String severity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SecurityEvent> events = auditService.searchEvents(
                eventType, userId, sourceService, severity,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(events)));
    }

    @GetMapping("/events/{id}")
    @Operation(summary = "Get security event details")
    public ResponseEntity<ApiResponse<SecurityEvent>> getEvent(@PathVariable String id) {
        return auditService.getEvent(id)
                .map(event -> ResponseEntity.ok(ApiResponse.ok(event)))
                .orElse(ResponseEntity.notFound().build());
    }
}
