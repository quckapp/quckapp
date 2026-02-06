package com.quckapp.security.common.util;

import jakarta.servlet.http.HttpServletRequest;
import lombok.experimental.UtilityClass;

import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * Utility class for IP address operations.
 */
@UtilityClass
public class IpUtils {

    private static final String[] IP_HEADERS = {
            "X-Forwarded-For",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_X_FORWARDED_FOR",
            "HTTP_X_FORWARDED",
            "HTTP_FORWARDED_FOR",
            "HTTP_FORWARDED",
            "HTTP_CLIENT_IP",
            "HTTP_VIA",
            "REMOTE_ADDR",
            "X-Real-IP"
    };

    /**
     * Extract the real client IP address from the request,
     * checking proxy headers first.
     */
    public static String getClientIpAddress(HttpServletRequest request) {
        for (String header : IP_HEADERS) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                // X-Forwarded-For may contain multiple IPs, take the first one
                if (ip.contains(",")) {
                    return ip.split(",")[0].trim();
                }
                return ip.trim();
            }
        }
        return request.getRemoteAddr();
    }

    /**
     * Check if an IP address falls within a CIDR range.
     * Example: isInCidrRange("192.168.1.50", "192.168.1.0/24") returns true.
     */
    public static boolean isInCidrRange(String ipAddress, String cidr) {
        try {
            if (!cidr.contains("/")) {
                return ipAddress.equals(cidr);
            }

            String[] parts = cidr.split("/");
            String networkAddress = parts[0];
            int prefixLength = Integer.parseInt(parts[1]);

            InetAddress ip = InetAddress.getByName(ipAddress);
            InetAddress network = InetAddress.getByName(networkAddress);

            byte[] ipBytes = ip.getAddress();
            byte[] networkBytes = network.getAddress();

            if (ipBytes.length != networkBytes.length) {
                return false;
            }

            int fullBytes = prefixLength / 8;
            int remainingBits = prefixLength % 8;

            for (int i = 0; i < fullBytes; i++) {
                if (ipBytes[i] != networkBytes[i]) {
                    return false;
                }
            }

            if (remainingBits > 0) {
                int mask = 0xFF << (8 - remainingBits);
                return (ipBytes[fullBytes] & mask) == (networkBytes[fullBytes] & mask);
            }

            return true;
        } catch (UnknownHostException | NumberFormatException e) {
            return false;
        }
    }

    /**
     * Validate if a string is a valid IPv4 or IPv6 address.
     */
    public static boolean isValidIpAddress(String ip) {
        try {
            InetAddress.getByName(ip);
            return true;
        } catch (UnknownHostException e) {
            return false;
        }
    }

    /**
     * Validate if a string is a valid CIDR notation.
     */
    public static boolean isValidCidr(String cidr) {
        if (!cidr.contains("/")) {
            return isValidIpAddress(cidr);
        }
        String[] parts = cidr.split("/");
        if (parts.length != 2) return false;
        try {
            int prefix = Integer.parseInt(parts[1]);
            if (prefix < 0 || prefix > 128) return false;
            return isValidIpAddress(parts[0]);
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
