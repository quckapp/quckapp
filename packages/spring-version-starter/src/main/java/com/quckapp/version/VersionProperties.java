package com.quckapp.version;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Configuration properties for API version routing, validation, deprecation
 * headers, and sunset enforcement.
 *
 * <p>Bind these via {@code application.yml} or environment variables under
 * the {@code quckapp.version} prefix. For example:</p>
 *
 * <pre>{@code
 * quckapp:
 *   version:
 *     api-version: v1
 *     mode: deployed
 *     supported-versions:
 *       - v1
 *       - v2
 *     deprecated-versions:
 *       - v0
 *     sunset-config:
 *       v0: "2026-06-01"
 * }</pre>
 */
@ConfigurationProperties(prefix = "quckapp.version")
public class VersionProperties {

    /**
     * The default API version to advertise as the successor in deprecation
     * headers and to set as a request attribute in local mode.
     */
    private String apiVersion = "v1";

    /**
     * Version validation mode. {@code "local"} skips validation and passes
     * all requests through. {@code "deployed"} enforces sunset, unsupported,
     * and deprecation checks.
     */
    private String mode = "deployed";

    /**
     * API versions that are fully supported (active).
     */
    private List<String> supportedVersions = new ArrayList<>(List.of("v1"));

    /**
     * API versions that still work but are deprecated. Requests to these
     * versions will receive {@code Deprecation}, {@code Sunset}, and
     * {@code Link} response headers.
     */
    private List<String> deprecatedVersions = new ArrayList<>();

    /**
     * Maps version strings to ISO date strings (e.g. {@code "2026-06-01"}).
     * Requests to a version whose sunset date has passed will receive a
     * {@code 410 Gone} response.
     */
    private Map<String, String> sunsetConfig = new HashMap<>();

    public String getApiVersion() {
        return apiVersion;
    }

    public void setApiVersion(String apiVersion) {
        this.apiVersion = apiVersion;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public List<String> getSupportedVersions() {
        return supportedVersions;
    }

    public void setSupportedVersions(List<String> supportedVersions) {
        this.supportedVersions = supportedVersions;
    }

    public List<String> getDeprecatedVersions() {
        return deprecatedVersions;
    }

    public void setDeprecatedVersions(List<String> deprecatedVersions) {
        this.deprecatedVersions = deprecatedVersions;
    }

    public Map<String, String> getSunsetConfig() {
        return sunsetConfig;
    }

    public void setSunsetConfig(Map<String, String> sunsetConfig) {
        this.sunsetConfig = sunsetConfig;
    }
}
