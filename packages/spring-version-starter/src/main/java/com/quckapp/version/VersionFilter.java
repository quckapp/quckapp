package com.quckapp.version;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Servlet filter for API version routing, validation, deprecation headers,
 * and sunset enforcement.
 *
 * <p>This filter mirrors the behaviour of the Go and Python version
 * middleware packages used elsewhere in the QuckApp platform, adapted for
 * the Spring Boot / Jakarta Servlet ecosystem.</p>
 *
 * <h3>Behaviour summary</h3>
 * <ul>
 *   <li><b>Local mode</b> ({@code quckapp.version.mode=local}): sets the
 *       {@code api_version} request attribute and passes through without
 *       any validation.</li>
 *   <li><b>Non-versioned URIs</b>: requests whose path does not match the
 *       version pattern (e.g. health checks, actuator) pass through.</li>
 *   <li><b>Sunset versions</b>: if the version appears in
 *       {@code sunsetConfig} and the date has passed, the filter returns
 *       {@code 410 Gone} with a JSON body.</li>
 *   <li><b>Unsupported versions</b>: if the version is neither in
 *       {@code supportedVersions} nor {@code deprecatedVersions}, the
 *       filter returns {@code 404 Not Found} with a JSON body.</li>
 *   <li><b>Deprecated versions</b>: the request passes through with
 *       {@code Deprecation}, {@code Sunset}, and {@code Link} response
 *       headers added.</li>
 *   <li><b>Active versions</b>: the {@code api_version} request attribute
 *       is set and the request proceeds normally.</li>
 * </ul>
 */
public class VersionFilter implements Filter {

    /** Request attribute key used to expose the resolved API version. */
    public static final String API_VERSION_ATTRIBUTE = "api_version";

    /**
     * Matches versioned API paths such as {@code /api/v1/resource} or
     * {@code /v1.2/resource}.
     *
     * <p>Group 1 captures the version token (e.g. {@code v1}, {@code v1.2}).
     * Group 2 captures the remaining path after the version segment.</p>
     */
    private static final Pattern VERSION_PATTERN =
            Pattern.compile("^/(?:api/)?(v\\d+(?:\\.\\d+)?)(/.*)$");

    private final VersionProperties properties;
    private final Set<String> activeSet;
    private final Set<String> deprecatedSet;

    public VersionFilter(VersionProperties properties) {
        this.properties = properties;
        this.activeSet = new HashSet<>(properties.getSupportedVersions());
        this.deprecatedSet = new HashSet<>(properties.getDeprecatedVersions());
    }

    @Override
    public void doFilter(ServletRequest servletRequest,
                         ServletResponse servletResponse,
                         FilterChain chain)
            throws IOException, ServletException {

        if (!(servletRequest instanceof HttpServletRequest request)
                || !(servletResponse instanceof HttpServletResponse response)) {
            chain.doFilter(servletRequest, servletResponse);
            return;
        }

        String path = request.getRequestURI();

        // --- Local mode: extract version if present and pass through ---
        if ("local".equalsIgnoreCase(properties.getMode())) {
            String version = properties.getApiVersion();
            Matcher matcher = VERSION_PATTERN.matcher(path);
            if (matcher.matches()) {
                version = matcher.group(1);
            }
            request.setAttribute(API_VERSION_ATTRIBUTE, version);
            chain.doFilter(request, response);
            return;
        }

        // --- Non-versioned paths (health, metrics, actuator, etc.) pass through ---
        Matcher matcher = VERSION_PATTERN.matcher(path);
        if (!matcher.matches()) {
            chain.doFilter(request, response);
            return;
        }

        String version = matcher.group(1);

        // --- Sunset check ---
        String sunsetDateStr = properties.getSunsetConfig().get(version);
        if (sunsetDateStr != null) {
            try {
                LocalDate sunsetDate = LocalDate.parse(sunsetDateStr);
                if (LocalDate.now().isAfter(sunsetDate)) {
                    writeJsonError(response, HttpServletResponse.SC_GONE,
                            "{\"error\":\"API version has been sunset\","
                            + "\"version\":\"" + escapeJson(version) + "\","
                            + "\"sunset\":\"" + escapeJson(sunsetDateStr) + "\","
                            + "\"message\":\"API " + escapeJson(version)
                            + " was sunset on " + escapeJson(sunsetDateStr)
                            + ". Please migrate to " + escapeJson(properties.getApiVersion()) + ".\"}");
                    return;
                }
            } catch (DateTimeParseException ignored) {
                // Malformed date -- skip sunset enforcement for this version
            }
        }

        // --- Unsupported version check ---
        boolean isActive = activeSet.contains(version);
        boolean isDeprecated = deprecatedSet.contains(version);

        if (!isActive && !isDeprecated) {
            writeJsonError(response, HttpServletResponse.SC_NOT_FOUND,
                    "{\"error\":\"API version not found\","
                    + "\"version\":\"" + escapeJson(version) + "\","
                    + "\"supported_versions\":" + toJsonArray(properties.getSupportedVersions()) + "}");
            return;
        }

        // --- Deprecated: add deprecation headers ---
        if (isDeprecated) {
            response.setHeader("Deprecation", "true");
            if (sunsetDateStr != null) {
                response.setHeader("Sunset", sunsetDateStr);
            }
            response.setHeader("Link",
                    "</api/" + properties.getApiVersion() + ">; rel=\"successor-version\"");
        }

        // --- Set version attribute and continue ---
        request.setAttribute(API_VERSION_ATTRIBUTE, version);
        chain.doFilter(request, response);
    }

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    /**
     * Write a JSON error response with the given HTTP status and body.
     */
    private void writeJsonError(HttpServletResponse response, int status, String jsonBody)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(jsonBody);
        response.getWriter().flush();
    }

    /**
     * Escape special characters for embedding in a JSON string value.
     */
    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\t", "\\t");
    }

    /**
     * Convert a list of strings to a JSON array literal,
     * e.g. {@code ["v1","v2"]}.
     */
    private String toJsonArray(java.util.List<String> items) {
        if (items == null || items.isEmpty()) {
            return "[]";
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) {
                sb.append(",");
            }
            sb.append("\"").append(escapeJson(items.get(i))).append("\"");
        }
        sb.append("]");
        return sb.toString();
    }
}
