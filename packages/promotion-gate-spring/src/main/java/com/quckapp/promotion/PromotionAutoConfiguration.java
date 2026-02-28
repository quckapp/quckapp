package com.quckapp.promotion;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Spring Boot auto-configuration that activates the promotion gate module.
 *
 * <p>When this starter is on the classpath, Spring Boot will automatically:
 * <ul>
 *   <li>Scan for {@code @Service} and {@code @RestController} beans in
 *       {@code com.quckapp.promotion}</li>
 *   <li>Register JPA repositories in the same package</li>
 *   <li>Discover the {@link PromotionRecord} entity for JPA</li>
 * </ul>
 *
 * <p>Consuming services only need to add this starter as a Maven dependency
 * and provide the {@code promotion.service-name} and
 * {@code promotion.environment} properties.</p>
 */
@AutoConfiguration
@ComponentScan("com.quckapp.promotion")
@EntityScan("com.quckapp.promotion")
@EnableJpaRepositories("com.quckapp.promotion")
public class PromotionAutoConfiguration {
}
