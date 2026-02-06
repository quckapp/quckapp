package com.quckapp.security.audit.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quckapp.security.audit.dto.SecurityEventRequest;
import com.quckapp.security.audit.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka consumer for audit events from all services.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditEventConsumer {

    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    /**
     * Listen for audit events from all services.
     */
    @KafkaListener(
            topics = "${kafka.topics.security-audit:security.audit}",
            groupId = "security-audit-consumer",
            autoStartup = "${spring.kafka.consumer.auto-startup:true}"
    )
    public void consumeAuditEvent(String message) {
        try {
            JsonNode event = objectMapper.readTree(message);

            SecurityEventRequest request = SecurityEventRequest.builder()
                    .eventType(getTextField(event, "eventType"))
                    .severity(getTextField(event, "severity", "INFO"))
                    .sourceService(getTextField(event, "sourceService"))
                    .userId(getTextField(event, "userId"))
                    .userEmail(getTextField(event, "userEmail"))
                    .ipAddress(getTextField(event, "ipAddress"))
                    .userAgent(getTextField(event, "userAgent"))
                    .resourceType(getTextField(event, "resourceType"))
                    .resourceId(getTextField(event, "resourceId"))
                    .action(getTextField(event, "action", "UNKNOWN"))
                    .status(getTextField(event, "status", "SUCCESS"))
                    .details(event.has("details") ? event.get("details").toString() : null)
                    .requestId(getTextField(event, "requestId"))
                    .sessionId(getTextField(event, "sessionId"))
                    .build();

            auditService.logEvent(request);
            log.debug("Processed audit event from {}: {}", request.getSourceService(), request.getEventType());
        } catch (Exception e) {
            log.error("Failed to process audit event: {}", e.getMessage(), e);
        }
    }

    private String getTextField(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : null;
    }

    private String getTextField(JsonNode node, String field, String defaultValue) {
        String value = getTextField(node, field);
        return value != null ? value : defaultValue;
    }
}
