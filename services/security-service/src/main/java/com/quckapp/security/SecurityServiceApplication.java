package com.quckapp.security;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * QuckApp Security Service - Spring Boot Application
 *
 * Security Suite:
 * - Threat Detection & IP Blocking
 * - Web Application Firewall (WAF)
 * - Security Audit & Compliance
 * - Geo-blocking with MaxMind GeoIP2
 * - Real-time threat analysis via Kafka
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
@EnableScheduling
public class SecurityServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(SecurityServiceApplication.class, args);
    }
}
