package com.quckapp.security.waf.service;

import com.quckapp.security.waf.dto.ValidateRequestDto;
import com.quckapp.security.waf.dto.WafRuleRequest;
import com.quckapp.security.waf.dto.WafValidationResult;
import com.quckapp.security.waf.model.WafRule;
import com.quckapp.security.waf.repository.WafEventRepository;
import com.quckapp.security.waf.repository.WafRuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WafServiceTest {

    @Mock
    private WafRuleRepository wafRuleRepository;
    @Mock
    private WafEventRepository wafEventRepository;

    @InjectMocks
    private WafService wafService;

    private WafRule sqlInjectionRule;
    private WafRule xssRule;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(wafService, "wafEnabled", true);
        ReflectionTestUtils.setField(wafService, "wafMode", "BLOCK");

        sqlInjectionRule = WafRule.builder()
                .id("rule-sqli-1")
                .name("sqli_union_select")
                .category("SQL_INJECTION")
                .pattern("(?i)(union\\s+(all\\s+)?select)")
                .severity("CRITICAL")
                .enabled(true)
                .priority(10)
                .action("BLOCK")
                .build();

        xssRule = WafRule.builder()
                .id("rule-xss-1")
                .name("xss_script_tag")
                .category("XSS")
                .pattern("(?i)(<script[^>]*>)")
                .severity("CRITICAL")
                .enabled(true)
                .priority(10)
                .action("BLOCK")
                .build();
    }

    @Test
    void validateRequest_cleanRequest_allowed() {
        when(wafRuleRepository.findByEnabledTrueOrderByPriorityAsc())
                .thenReturn(List.of(sqlInjectionRule, xssRule));

        ValidateRequestDto request = ValidateRequestDto.builder()
                .sourceIp("192.168.1.1")
                .method("GET")
                .path("/api/users")
                .body("{\"name\": \"John Doe\"}")
                .build();

        WafValidationResult result = wafService.validateRequest(request);

        assertTrue(result.isAllowed());
        assertFalse(result.hasViolations());
    }

    @Test
    void validateRequest_sqlInjection_blocked() {
        when(wafRuleRepository.findByEnabledTrueOrderByPriorityAsc())
                .thenReturn(List.of(sqlInjectionRule));
        when(wafEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ValidateRequestDto request = ValidateRequestDto.builder()
                .sourceIp("10.0.0.1")
                .method("GET")
                .path("/api/users?id=1 UNION SELECT * FROM passwords")
                .build();

        WafValidationResult result = wafService.validateRequest(request);

        assertFalse(result.isAllowed());
        assertTrue(result.hasViolations());
        assertEquals(1, result.getViolations().size());
        assertEquals("SQL_INJECTION", result.getViolations().get(0).getCategory());
    }

    @Test
    void validateRequest_xssAttack_blocked() {
        when(wafRuleRepository.findByEnabledTrueOrderByPriorityAsc())
                .thenReturn(List.of(xssRule));
        when(wafEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ValidateRequestDto request = ValidateRequestDto.builder()
                .sourceIp("10.0.0.2")
                .method("POST")
                .path("/api/comments")
                .body("{\"comment\": \"<script>alert('xss')</script>\"}")
                .build();

        WafValidationResult result = wafService.validateRequest(request);

        assertFalse(result.isAllowed());
        assertTrue(result.hasViolations());
        assertEquals("XSS", result.getViolations().get(0).getCategory());
    }

    @Test
    void validateRequest_wafDisabled_allowsEverything() {
        ReflectionTestUtils.setField(wafService, "wafEnabled", false);

        ValidateRequestDto request = ValidateRequestDto.builder()
                .path("/api/users?id=1 UNION SELECT * FROM passwords")
                .build();

        WafValidationResult result = wafService.validateRequest(request);

        assertTrue(result.isAllowed());
        verify(wafRuleRepository, never()).findByEnabledTrueOrderByPriorityAsc();
    }

    @Test
    void validateRequest_detectMode_logsButAllows() {
        ReflectionTestUtils.setField(wafService, "wafMode", "DETECT");
        when(wafRuleRepository.findByEnabledTrueOrderByPriorityAsc())
                .thenReturn(List.of(sqlInjectionRule));
        when(wafEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ValidateRequestDto request = ValidateRequestDto.builder()
                .path("/api/users?id=1 UNION SELECT * FROM passwords")
                .build();

        WafValidationResult result = wafService.validateRequest(request);

        assertTrue(result.isAllowed()); // Allowed in DETECT mode
        assertTrue(result.hasViolations()); // But violations are still recorded
    }

    @Test
    void createRule_newRule_success() {
        when(wafRuleRepository.findByName("custom_rule")).thenReturn(Optional.empty());
        when(wafRuleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WafRuleRequest request = WafRuleRequest.builder()
                .name("custom_rule")
                .category("CUSTOM")
                .pattern("(?i)(dangerous_pattern)")
                .severity("HIGH")
                .build();

        WafRule created = wafService.createRule(request);

        assertNotNull(created);
        assertEquals("custom_rule", created.getName());
        assertEquals("CUSTOM", created.getCategory());
    }

    @Test
    void createRule_duplicateName_throwsException() {
        when(wafRuleRepository.findByName("sqli_union_select"))
                .thenReturn(Optional.of(sqlInjectionRule));

        WafRuleRequest request = WafRuleRequest.builder()
                .name("sqli_union_select")
                .category("SQL_INJECTION")
                .pattern("test")
                .build();

        assertThrows(Exception.class, () -> wafService.createRule(request));
    }
}
