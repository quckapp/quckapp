package com.quckapp.security.waf.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidateRequestDto {

    private String sourceIp;
    private String method;
    private String path;
    private Map<String, String> headers;
    private String body;
    private Map<String, String> queryParams;
    private String userAgent;
}
