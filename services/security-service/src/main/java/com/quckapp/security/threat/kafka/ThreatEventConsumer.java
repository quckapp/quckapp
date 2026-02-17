package com.quckapp.security.threat.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quckapp.security.threat.service.ThreatDetectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka consumer for auth events and security requests.
 * Listens to events from other services and triggers threat detection.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ThreatEventConsumer {

    private final ThreatDetectionService threatDetectionService;
    private final ObjectMapper objectMapper;

    /**
     * Listen for authentication events from auth-service.
     */
    @KafkaListener(
            topics = "${kafka.topics.auth-events:auth.events}",
            groupId = "security-threat-consumer",
            autoStartup = "${spring.kafka.consumer.auto-startup:true}"
    )
    public void consumeAuthEvent(String message) {
        try {
            JsonNode event = objectMapper.readTree(message);

            String eventType = event.has("eventType") ? event.get("eventType").asText() : null;
            String sourceIp = event.has("ipAddress") ? event.get("ipAddress").asText() : null;
            String userId = event.has("userId") ? event.get("userId").asText() : null;
            String email = event.has("email") ? event.get("email").asText() : null;
            String status = event.has("status") ? event.get("status").asText() : null;

            if ("LOGIN_ATTEMPT".equals(eventType) || "LOGIN".equals(eventType)) {
                boolean success = "SUCCESS".equalsIgnoreCase(status);
                threatDetectionService.analyzeLoginEvent(sourceIp, userId, email, success);
            }

            log.debug("Processed auth event: type={}, ip={}, success={}", eventType, sourceIp, status);
        } catch (Exception e) {
            log.error("Failed to process auth event: {}", e.getMessage(), e);
        }
    }

    /**
     * Listen for security-related requests from other services.
     */
    @KafkaListener(
            topics = "${kafka.topics.security-requests:security.requests}",
            groupId = "security-request-consumer",
            autoStartup = "${spring.kafka.consumer.auto-startup:true}"
    )
    public void consumeSecurityRequest(String message) {
        try {
            JsonNode event = objectMapper.readTree(message);

            String requestType = event.has("type") ? event.get("type").asText() : null;
            String sourceIp = event.has("sourceIp") ? event.get("sourceIp").asText() : null;
            String description = event.has("description") ? event.get("description").asText() : "Security event";

            if (requestType != null) {
                threatDetectionService.logThreatEvent(
                        requestType, "MEDIUM", sourceIp, null, null, description, message);
            }

            log.debug("Processed security request: type={}, ip={}", requestType, sourceIp);
        } catch (Exception e) {
            log.error("Failed to process security request: {}", e.getMessage(), e);
        }
    }
}
