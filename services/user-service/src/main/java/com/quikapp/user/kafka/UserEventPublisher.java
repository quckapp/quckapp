package com.quikapp.user.kafka;

import com.quikapp.user.domain.entity.User;
import com.quikapp.user.domain.entity.UserPreferences;
import com.quikapp.user.domain.entity.UserProfile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.user-events:quikapp.users.events}")
    private String userEventsTopic;

    @Async
    public void publishUserCreated(User user) {
        publishEvent("USER_CREATED", user.getId(), Map.of("id", user.getId().toString(), "email", user.getEmail(), "username", user.getUsername()));
    }

    @Async
    public void publishUserUpdated(User user) {
        publishEvent("USER_UPDATED", user.getId(), Map.of("id", user.getId().toString(), "email", user.getEmail(), "displayName", user.getDisplayName() != null ? user.getDisplayName() : ""));
    }

    @Async
    public void publishUserDeactivated(User user) {
        publishEvent("USER_DEACTIVATED", user.getId(), Map.of("id", user.getId().toString(), "email", user.getEmail()));
    }

    @Async
    public void publishUserSuspended(User user) {
        publishEvent("USER_SUSPENDED", user.getId(), Map.of("id", user.getId().toString(), "email", user.getEmail()));
    }

    @Async
    public void publishProfileUpdated(UUID userId, UserProfile profile) {
        Map<String, Object> data = new HashMap<>();
        data.put("userId", userId.toString());
        if (profile.getCustomStatus() != null) data.put("customStatus", profile.getCustomStatus());
        publishEvent("PROFILE_UPDATED", userId, data);
    }

    @Async
    public void publishPreferencesUpdated(UUID userId, UserPreferences preferences) {
        publishEvent("PREFERENCES_UPDATED", userId, Map.of("userId", userId.toString(), "theme", preferences.getTheme()));
    }

    private void publishEvent(String eventType, UUID userId, Map<String, Object> data) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("eventType", eventType);
            event.put("userId", userId.toString());
            event.put("data", data);
            event.put("timestamp", Instant.now().toString());
            event.put("source", "user-service");
            kafkaTemplate.send(userEventsTopic, userId.toString(), event)
                .whenComplete((r, ex) -> { if (ex != null) log.error("Failed to publish {}", eventType, ex); });
        } catch (Exception e) { log.error("Error publishing {} event", eventType, e); }
    }
}
