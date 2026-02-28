package com.quckapp.promotion;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller exposing the promotion gate API under {@code /promotion}.
 *
 * <p>All responses are wrapped in {@code Map.of("data", ...)} to match
 * the QuckApp service response convention.</p>
 */
@RestController
@RequestMapping("/promotion")
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionService promotionService;

    // ------------------------------------------------------------------
    // GET /promotion/can-promote
    // ------------------------------------------------------------------

    /**
     * Check whether a service version may be promoted to a target
     * environment.
     *
     * @param serviceKey    the service identifier
     * @param apiVersion    the API version string
     * @param toEnvironment the target environment
     */
    @GetMapping("/can-promote")
    public ResponseEntity<Map<String, Object>> canPromote(
            @RequestParam("serviceKey") String serviceKey,
            @RequestParam("apiVersion") String apiVersion,
            @RequestParam("toEnvironment") String toEnvironment) {

        Map<String, Object> result = promotionService.canPromote(serviceKey, apiVersion, toEnvironment);
        return ResponseEntity.ok(Map.of("data", result));
    }

    // ------------------------------------------------------------------
    // POST /promotion/promote
    // ------------------------------------------------------------------

    /**
     * Record a standard promotion to the next environment in the chain.
     */
    @PostMapping("/promote")
    public ResponseEntity<Map<String, Object>> promote(
            @RequestBody Map<String, String> request) {

        String serviceKey = request.get("serviceKey");
        String apiVersion = request.get("apiVersion");
        String promotedBy = request.get("promotedBy");

        PromotionRecord record = promotionService.promote(serviceKey, apiVersion, promotedBy);
        return ResponseEntity.ok(Map.of("data", record));
    }

    // ------------------------------------------------------------------
    // POST /promotion/emergency-activate
    // ------------------------------------------------------------------

    /**
     * Record a dual-approval emergency activation.
     */
    @PostMapping("/emergency-activate")
    public ResponseEntity<Map<String, Object>> emergencyActivate(
            @RequestBody Map<String, String> request) {

        PromotionRecord record = promotionService.emergencyActivate(request);
        return ResponseEntity.ok(Map.of("data", record));
    }

    // ------------------------------------------------------------------
    // GET /promotion/history
    // ------------------------------------------------------------------

    /**
     * Return the full promotion history for a service + API version.
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> history(
            @RequestParam("serviceKey") String serviceKey,
            @RequestParam("apiVersion") String apiVersion) {

        List<PromotionRecord> records = promotionService.history(serviceKey, apiVersion);
        return ResponseEntity.ok(Map.of("data", records));
    }

    // ------------------------------------------------------------------
    // GET /promotion/status
    // ------------------------------------------------------------------

    /**
     * Return the current promotion status for a service + API version.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(
            @RequestParam("serviceKey") String serviceKey,
            @RequestParam("apiVersion") String apiVersion) {

        Map<String, Object> result = promotionService.status(serviceKey, apiVersion);
        return ResponseEntity.ok(Map.of("data", result));
    }
}
