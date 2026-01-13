package com.quikapp.user;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * QuikApp User Service - Spring Boot Application
 *
 * Features:
 * - User CRUD operations
 * - Profile management
 * - Preferences management
 * - User search
 * - Caching with Redis
 * - Event publishing to Kafka
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
@EnableCaching
public class UserServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}
