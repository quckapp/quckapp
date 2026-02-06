package com.quckapp.security.common.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JwtUserPrincipal {
    private UUID userId;
    private String email;
    private String externalId;
    private String sessionId;
}
