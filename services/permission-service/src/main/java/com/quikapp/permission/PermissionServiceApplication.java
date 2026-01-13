package com.quikapp.permission;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * QuikApp Permission Service - RBAC with Casbin
 *
 * Features:
 * - Role-Based Access Control (RBAC)
 * - Casbin policy enforcement
 * - Permission management
 * - Role management
 * - Policy caching
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
public class PermissionServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PermissionServiceApplication.class, args);
    }
}
