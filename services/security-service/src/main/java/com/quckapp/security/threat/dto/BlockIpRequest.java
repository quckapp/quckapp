package com.quckapp.security.threat.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockIpRequest {

    @NotBlank(message = "IP address is required")
    private String ipAddress;

    private String cidrRange;

    @NotBlank(message = "Reason is required")
    private String reason;

    @Builder.Default
    private Boolean permanent = false;

    private Integer durationHours;
}
