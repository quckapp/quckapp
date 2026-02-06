package com.quckapp.security.waf.controller;

import com.quckapp.security.common.dto.ApiResponse;
import com.quckapp.security.common.dto.PageResponse;
import com.quckapp.security.waf.dto.*;
import com.quckapp.security.waf.model.WafEvent;
import com.quckapp.security.waf.model.WafRule;
import com.quckapp.security.waf.service.WafService;
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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/waf")
@RequiredArgsConstructor
@Tag(name = "WAF", description = "Web Application Firewall endpoints")
public class WafController {

    private final WafService wafService;

    // ===== Validation =====

    @PostMapping("/validate")
    @Operation(summary = "Validate a request against WAF rules")
    public ResponseEntity<ApiResponse<WafValidationResult>> validateRequest(
            @RequestBody ValidateRequestDto request) {
        WafValidationResult result = wafService.validateRequest(request);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ===== Rules =====

    @GetMapping("/rules")
    @Operation(summary = "List all WAF rules")
    public ResponseEntity<ApiResponse<List<WafRule>>> getRules() {
        return ResponseEntity.ok(ApiResponse.ok(wafService.getAllRules()));
    }

    @PostMapping("/rules")
    @Operation(summary = "Create a new WAF rule")
    public ResponseEntity<ApiResponse<WafRule>> createRule(@Valid @RequestBody WafRuleRequest request) {
        WafRule rule = wafService.createRule(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Rule created", rule));
    }

    @PutMapping("/rules/{id}")
    @Operation(summary = "Update a WAF rule")
    public ResponseEntity<ApiResponse<WafRule>> updateRule(
            @PathVariable String id,
            @Valid @RequestBody WafRuleRequest request) {
        WafRule rule = wafService.updateRule(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Rule updated", rule));
    }

    @DeleteMapping("/rules/{id}")
    @Operation(summary = "Delete a WAF rule")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable String id) {
        wafService.deleteRule(id);
        return ResponseEntity.ok(ApiResponse.ok("Rule deleted"));
    }

    // ===== Events =====

    @GetMapping("/events")
    @Operation(summary = "List WAF events")
    public ResponseEntity<ApiResponse<PageResponse<WafEvent>>> getEvents(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<WafEvent> events = wafService.getWafEvents(category,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(events)));
    }

    // ===== Config =====

    @GetMapping("/config")
    @Operation(summary = "Get WAF configuration")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getConfig() {
        return ResponseEntity.ok(ApiResponse.ok(wafService.getWafConfig()));
    }

    // ===== Stats =====

    @GetMapping("/stats")
    @Operation(summary = "Get WAF statistics")
    public ResponseEntity<ApiResponse<WafStatsResponse>> getStats() {
        return ResponseEntity.ok(ApiResponse.ok(wafService.getStats()));
    }
}
