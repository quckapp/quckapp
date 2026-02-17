package com.quckapp.security.common.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class IpUtilsTest {

    @Test
    void isInCidrRange_ipInRange_returnsTrue() {
        assertTrue(IpUtils.isInCidrRange("192.168.1.50", "192.168.1.0/24"));
        assertTrue(IpUtils.isInCidrRange("10.0.0.1", "10.0.0.0/8"));
        assertTrue(IpUtils.isInCidrRange("172.16.5.100", "172.16.0.0/12"));
    }

    @Test
    void isInCidrRange_ipOutOfRange_returnsFalse() {
        assertFalse(IpUtils.isInCidrRange("192.168.2.1", "192.168.1.0/24"));
        assertFalse(IpUtils.isInCidrRange("11.0.0.1", "10.0.0.0/8"));
    }

    @Test
    void isInCidrRange_exactMatch_returnsTrue() {
        assertTrue(IpUtils.isInCidrRange("192.168.1.1", "192.168.1.1"));
    }

    @Test
    void isInCidrRange_noMatch_returnsFalse() {
        assertFalse(IpUtils.isInCidrRange("192.168.1.1", "192.168.1.2"));
    }

    @Test
    void isValidIpAddress_validIpv4_returnsTrue() {
        assertTrue(IpUtils.isValidIpAddress("192.168.1.1"));
        assertTrue(IpUtils.isValidIpAddress("10.0.0.1"));
        assertTrue(IpUtils.isValidIpAddress("255.255.255.255"));
    }

    @Test
    void isValidIpAddress_invalidIp_returnsFalse() {
        assertFalse(IpUtils.isValidIpAddress("not-an-ip"));
        assertFalse(IpUtils.isValidIpAddress(""));
    }

    @Test
    void isValidCidr_validCidr_returnsTrue() {
        assertTrue(IpUtils.isValidCidr("192.168.1.0/24"));
        assertTrue(IpUtils.isValidCidr("10.0.0.0/8"));
        assertTrue(IpUtils.isValidCidr("192.168.1.1")); // Single IP is valid CIDR
    }

    @Test
    void isValidCidr_invalidCidr_returnsFalse() {
        assertFalse(IpUtils.isValidCidr("not-cidr/abc"));
        assertFalse(IpUtils.isValidCidr("192.168.1.0/33")); // Invalid prefix for IPv4
    }
}
