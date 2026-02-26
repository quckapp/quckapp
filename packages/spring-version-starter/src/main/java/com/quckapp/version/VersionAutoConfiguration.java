package com.quckapp.version;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Boot auto-configuration that registers the {@link VersionFilter}
 * for API version routing, validation, deprecation headers, and sunset
 * enforcement.
 *
 * <p>This configuration is activated automatically in any servlet-based
 * Spring Boot web application that has this starter on its classpath.
 * Behaviour is controlled via {@link VersionProperties} (bound to the
 * {@code quckapp.version.*} namespace).</p>
 *
 * <p>The filter is registered with URL patterns {@code /api/*} and
 * {@code /v*} at order 1 so it runs early in the filter chain, before
 * security and application filters.</p>
 */
@Configuration
@ConditionalOnWebApplication
@EnableConfigurationProperties(VersionProperties.class)
public class VersionAutoConfiguration {

    @Bean
    public FilterRegistrationBean<VersionFilter> versionFilterRegistration(
            VersionProperties properties) {

        FilterRegistrationBean<VersionFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new VersionFilter(properties));
        registration.addUrlPatterns("/api/*", "/v*");
        registration.setOrder(1);
        registration.setName("versionFilter");
        return registration;
    }
}
