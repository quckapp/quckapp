package com.quckapp.security.audit.service;

import com.quckapp.security.audit.dto.SecurityEventRequest;
import com.quckapp.security.audit.model.SecurityEvent;
import com.quckapp.security.audit.repository.SecurityEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private SecurityEventRepository securityEventRepository;

    @InjectMocks
    private AuditService auditService;

    @Test
    void logEvent_savesSecurityEvent() {
        SecurityEventRequest request = SecurityEventRequest.builder()
                .eventType("LOGIN")
                .severity("INFO")
                .sourceService("auth-service")
                .userId("user-1")
                .userEmail("test@test.com")
                .action("USER_LOGIN")
                .status("SUCCESS")
                .ipAddress("192.168.1.1")
                .build();

        when(securityEventRepository.save(any(SecurityEvent.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        SecurityEvent event = auditService.logEvent(request);

        assertNotNull(event);
        assertEquals("LOGIN", event.getEventType());
        assertEquals("INFO", event.getSeverity());
        assertEquals("auth-service", event.getSourceService());
        assertEquals("user-1", event.getUserId());
        assertEquals("USER_LOGIN", event.getAction());
        assertEquals("SUCCESS", event.getStatus());
        verify(securityEventRepository).save(any(SecurityEvent.class));
    }

    @Test
    void searchEvents_byEventType_returnsFiltered() {
        SecurityEvent event = SecurityEvent.builder()
                .id("event-1")
                .eventType("LOGIN")
                .action("USER_LOGIN")
                .severity("INFO")
                .status("SUCCESS")
                .build();

        Page<SecurityEvent> page = new PageImpl<>(List.of(event));
        when(securityEventRepository.findByEventType(eq("LOGIN"), any(Pageable.class)))
                .thenReturn(page);

        Page<SecurityEvent> result = auditService.searchEvents(
                "LOGIN", null, null, null, PageRequest.of(0, 20));

        assertEquals(1, result.getTotalElements());
        assertEquals("LOGIN", result.getContent().get(0).getEventType());
    }

    @Test
    void searchEvents_byUserId_returnsFiltered() {
        SecurityEvent event = SecurityEvent.builder()
                .id("event-2")
                .eventType("DATA_ACCESS")
                .userId("user-1")
                .action("READ_PROFILE")
                .severity("INFO")
                .status("SUCCESS")
                .build();

        Page<SecurityEvent> page = new PageImpl<>(List.of(event));
        when(securityEventRepository.findByUserId(eq("user-1"), any(Pageable.class)))
                .thenReturn(page);

        Page<SecurityEvent> result = auditService.searchEvents(
                null, "user-1", null, null, PageRequest.of(0, 20));

        assertEquals(1, result.getTotalElements());
        assertEquals("user-1", result.getContent().get(0).getUserId());
    }

    @Test
    void searchEvents_noFilters_returnsAll() {
        Page<SecurityEvent> page = new PageImpl<>(List.of());
        when(securityEventRepository.findAll(any(Pageable.class))).thenReturn(page);

        Page<SecurityEvent> result = auditService.searchEvents(
                null, null, null, null, PageRequest.of(0, 20));

        assertNotNull(result);
        verify(securityEventRepository).findAll(any(Pageable.class));
    }

    @Test
    void getEvent_existingId_returnsEvent() {
        SecurityEvent event = SecurityEvent.builder()
                .id("event-1")
                .eventType("LOGIN")
                .action("USER_LOGIN")
                .severity("INFO")
                .status("SUCCESS")
                .build();

        when(securityEventRepository.findById("event-1")).thenReturn(Optional.of(event));

        Optional<SecurityEvent> result = auditService.getEvent("event-1");

        assertTrue(result.isPresent());
        assertEquals("event-1", result.get().getId());
    }

    @Test
    void getEvent_nonExistingId_returnsEmpty() {
        when(securityEventRepository.findById("non-existent")).thenReturn(Optional.empty());

        Optional<SecurityEvent> result = auditService.getEvent("non-existent");

        assertTrue(result.isEmpty());
    }
}
