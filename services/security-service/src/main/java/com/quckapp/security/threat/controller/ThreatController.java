package com.quckapp.security.threat.controller;

import com.quckapp.security.common.dto.ApiResponse;
import com.quckapp.security.common.dto.PageResponse;
import com.quckapp.security.threat.dto.BlockIpRequest;
import com.quckapp.security.threat.dto.ThreatDashboardResponse;
import com.quckapp.security.threat.dto.ThreatEventResponse;
import com.quckapp.security.threat.model.BlockedIp;
import com.quckapp.security.threat.model.GeoBlockRule;
import com.quckapp.security.threat.model.ThreatRule;
import com.quckapp.security.threat.service.GeoBlockingService;
import com.quckapp.security.threat.service.IpBlockingService;
import com.quckapp.security.threat.service.ThreatDetectionService;
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
@RequestMapping("/v1/threats")
@RequiredArgsConstructor
@Tag(name = "Threat Detection", description = "Threat detection, IP blocking, and geo-blocking endpoints")
public class ThreatController {

    private final ThreatDetectionService threatDetectionService;
    private final IpBlockingService ipBlockingService;
    private final GeoBlockingService geoBlockingService;

    // ===== Blocked IPs =====

    @GetMapping("/blocked-ips")
    @Operation(summary = "List all blocked IPs")
    public ResponseEntity<ApiResponse<PageResponse<BlockedIp>>> getBlockedIps(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<BlockedIp> result = ipBlockingService.getBlockedIps(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(result)));
    }

    @PostMapping("/blocked-ips")
    @Operation(summary = "Block an IP address or CIDR range")
    public ResponseEntity<ApiResponse<BlockedIp>> blockIp(@Valid @RequestBody BlockIpRequest request) {
        BlockedIp blocked = ipBlockingService.blockIp(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("IP blocked", blocked));
    }

    @DeleteMapping("/blocked-ips/{id}")
    @Operation(summary = "Unblock an IP address")
    public ResponseEntity<ApiResponse<Void>> unblockIp(@PathVariable String id) {
        ipBlockingService.unblockIp(id);
        return ResponseEntity.ok(ApiResponse.ok("IP unblocked"));
    }

    @GetMapping("/blocked-ips/check/{ip}")
    @Operation(summary = "Check if an IP is blocked")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkIp(@PathVariable String ip) {
        boolean blocked = ipBlockingService.isIpBlocked(ip);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("blocked", blocked)));
    }

    // ===== Threat Events =====

    @GetMapping("/events")
    @Operation(summary = "List threat events")
    public ResponseEntity<ApiResponse<PageResponse<ThreatEventResponse>>> getThreatEvents(
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String severity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ThreatEventResponse> events = threatDetectionService.getThreatEvents(
                eventType, severity,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(events)));
    }

    @GetMapping("/events/{id}")
    @Operation(summary = "Get threat event details")
    public ResponseEntity<ApiResponse<ThreatEventResponse>> getThreatEvent(@PathVariable String id) {
        return threatDetectionService.getThreatEvent(id)
                .map(event -> ResponseEntity.ok(ApiResponse.ok(event)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/events/{id}/resolve")
    @Operation(summary = "Resolve a threat event")
    public ResponseEntity<ApiResponse<ThreatEventResponse>> resolveThreatEvent(
            @PathVariable String id,
            @RequestParam(defaultValue = "admin") String resolvedBy) {
        var resolved = threatDetectionService.resolveThreatEvent(id, resolvedBy);
        return ResponseEntity.ok(ApiResponse.ok("Threat resolved", ThreatEventResponse.from(resolved)));
    }

    // ===== Threat Rules =====

    @GetMapping("/rules")
    @Operation(summary = "List threat detection rules")
    public ResponseEntity<ApiResponse<List<ThreatRule>>> getThreatRules() {
        return ResponseEntity.ok(ApiResponse.ok(threatDetectionService.getThreatRules()));
    }

    @PostMapping("/rules")
    @Operation(summary = "Create or update a threat rule")
    public ResponseEntity<ApiResponse<ThreatRule>> saveThreatRule(@Valid @RequestBody ThreatRule rule) {
        ThreatRule saved = threatDetectionService.saveThreatRule(rule);
        return ResponseEntity.ok(ApiResponse.ok("Rule saved", saved));
    }

    // ===== Geo-blocking =====

    @GetMapping("/geo-rules")
    @Operation(summary = "List geo-blocking rules")
    public ResponseEntity<ApiResponse<List<GeoBlockRule>>> getGeoBlockRules() {
        return ResponseEntity.ok(ApiResponse.ok(geoBlockingService.getGeoBlockRules()));
    }

    @PostMapping("/geo-rules")
    @Operation(summary = "Create a geo-blocking rule")
    public ResponseEntity<ApiResponse<GeoBlockRule>> createGeoBlockRule(
            @Valid @RequestBody GeoBlockRule rule) {
        GeoBlockRule created = geoBlockingService.createGeoBlockRule(rule);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Geo-block rule created", created));
    }

    @DeleteMapping("/geo-rules/{id}")
    @Operation(summary = "Delete a geo-blocking rule")
    public ResponseEntity<ApiResponse<Void>> deleteGeoBlockRule(@PathVariable String id) {
        geoBlockingService.deleteGeoBlockRule(id);
        return ResponseEntity.ok(ApiResponse.ok("Geo-block rule deleted"));
    }

    // ===== Dashboard =====

    @GetMapping("/dashboard")
    @Operation(summary = "Get threat detection dashboard summary")
    public ResponseEntity<ApiResponse<ThreatDashboardResponse>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(threatDetectionService.getDashboard()));
    }
}
