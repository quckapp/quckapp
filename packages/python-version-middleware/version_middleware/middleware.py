"""Starlette/FastAPI middleware for API version routing, validation,
deprecation headers, and sunset enforcement.

It extracts the API version from URL paths like ``/api/v1/...`` and validates
against configured active, deprecated, and sunset versions.

Usage::

    from version_middleware import VersionMiddleware, VersionConfig

    config = VersionConfig(
        service_key="ml-service",
        active_versions=["v1", "v2"],
        deprecated_versions=["v0"],
        sunset_config={"v0": "2025-06-01"},
        default_version="v2",
        version_mode="deployed",
    )
    app.add_middleware(VersionMiddleware, config=config)

    # Or build config from environment variables:
    config = VersionConfig.from_env("ml-service")
    app.add_middleware(VersionMiddleware, config=config)
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Dict, List

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

# Matches versioned API paths like /api/v1/resource or /api/v1.2/resource.
_VERSION_PATTERN = re.compile(r"^/api/(v\d+(?:\.\d+)?)(/.*)$")


@dataclass
class VersionConfig:
    """Configuration for the version middleware.

    Attributes:
        service_key: Identifies the service for environment variable lookups.
        active_versions: API versions that are fully supported.
        deprecated_versions: API versions that still work but are deprecated.
        sunset_config: Maps version strings to sunset ISO dates
            (e.g. ``{"v1": "2026-06-01"}``).
        default_version: The version to advertise as the successor in
            deprecation headers.
        version_mode: ``"local"`` skips validation; ``"deployed"`` enforces it.
    """

    service_key: str
    active_versions: List[str] = field(default_factory=lambda: ["v1"])
    deprecated_versions: List[str] = field(default_factory=list)
    sunset_config: Dict[str, str] = field(default_factory=dict)
    default_version: str = "v1"
    version_mode: str = "deployed"

    @classmethod
    def from_env(cls, service_key: str) -> "VersionConfig":
        """Build a :class:`VersionConfig` from environment variables.

        The method checks service-specific env vars first (e.g.
        ``ML_SERVICE_SUPPORTED_VERSIONS``) then falls back to generic ones
        (e.g. ``SUPPORTED_VERSIONS``).

        Environment variables:
            - ``SUPPORTED_VERSIONS`` / ``{KEY}_SUPPORTED_VERSIONS``:
              comma-separated active versions
            - ``DEPRECATED_VERSIONS`` / ``{KEY}_DEPRECATED_VERSIONS``:
              comma-separated deprecated versions
            - ``SUNSET_CONFIG`` / ``{KEY}_SUNSET_CONFIG``:
              format ``"v1:2026-06-01,v2:2026-12-01"``
            - ``API_VERSION``: default version (falls back to ``"v1"``)
            - ``VERSION_MODE``: ``"local"`` or ``"deployed"``
              (falls back to ``"local"``)
        """
        key = service_key.upper().replace("-", "_")

        active_versions: List[str] = []
        deprecated_versions: List[str] = []
        sunset_config: Dict[str, str] = {}

        # Active versions
        supported = _env_with_fallback(
            f"{key}_SUPPORTED_VERSIONS", "SUPPORTED_VERSIONS"
        )
        if supported:
            active_versions = _split_csv(supported)

        # Deprecated versions
        deprecated = _env_with_fallback(
            f"{key}_DEPRECATED_VERSIONS", "DEPRECATED_VERSIONS"
        )
        if deprecated:
            deprecated_versions = _split_csv(deprecated)

        # Sunset config
        sunset_raw = _env_with_fallback(f"{key}_SUNSET_CONFIG", "SUNSET_CONFIG")
        if sunset_raw:
            sunset_config = _parse_sunset_config(sunset_raw)

        # Default version
        default_version = os.environ.get("API_VERSION", "") or "v1"

        # Version mode
        version_mode = os.environ.get("VERSION_MODE", "") or "local"

        # If no versions configured at all, default to the default version
        if not active_versions and not deprecated_versions:
            active_versions = [default_version]

        return cls(
            service_key=service_key,
            active_versions=active_versions,
            deprecated_versions=deprecated_versions,
            sunset_config=sunset_config,
            default_version=default_version,
            version_mode=version_mode,
        )


class VersionMiddleware(BaseHTTPMiddleware):
    """Starlette/FastAPI middleware that validates API versions in request paths.

    In local mode it sets ``request.state.api_version`` and passes through
    without validation.  In deployed mode it enforces version checks:

    - Sunset versions past their date return **410 Gone**
    - Unsupported versions return **404 Not Found**
    - Deprecated versions pass through with ``Deprecation`` and ``Sunset``
      headers
    - Active versions pass through normally
    """

    def __init__(self, app, config: VersionConfig) -> None:  # noqa: ANN001
        super().__init__(app)
        self.config = config
        self._active_set = set(config.active_versions)
        self._deprecated_set = set(config.deprecated_versions)

    async def dispatch(self, request: Request, call_next) -> Response:  # noqa: ANN001
        path = request.url.path

        # --- Local mode: extract version if present and pass through ---
        if self.config.version_mode == "local":
            version = self.config.default_version
            match = _VERSION_PATTERN.match(path)
            if match:
                version = match.group(1)
            request.state.api_version = version
            return await call_next(request)

        # --- Non-versioned paths (health, metrics, etc.) pass through ---
        match = _VERSION_PATTERN.match(path)
        if match is None:
            return await call_next(request)

        version = match.group(1)

        # --- Sunset check ---
        sunset_date_str = self.config.sunset_config.get(version)
        if sunset_date_str is not None:
            try:
                sunset_dt = datetime.strptime(sunset_date_str, "%Y-%m-%d").date()
                if date.today() > sunset_dt:
                    return JSONResponse(
                        status_code=410,
                        content={
                            "error": "API version has been sunset",
                            "version": version,
                            "sunset": sunset_date_str,
                            "message": (
                                f"API {version} was sunset on {sunset_date_str}. "
                                f"Please migrate to {self.config.default_version}."
                            ),
                        },
                    )
            except ValueError:
                pass  # malformed date — ignore sunset check

        # --- Unsupported version check ---
        is_active = version in self._active_set
        is_deprecated = version in self._deprecated_set

        if not is_active and not is_deprecated:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "API version not found",
                    "version": version,
                    "supported_versions": self.config.active_versions,
                },
            )

        # --- Set version on request state and call next ---
        request.state.api_version = version
        response = await call_next(request)

        # --- Deprecation headers ---
        if is_deprecated:
            response.headers["Deprecation"] = "true"
            if sunset_date_str is not None:
                response.headers["Sunset"] = sunset_date_str
            response.headers["Link"] = (
                f"</api/{self.config.default_version}>; "
                f'rel="successor-version"'
            )

        return response


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _env_with_fallback(primary: str, fallback: str) -> str:
    """Return the value of *primary* env var, or *fallback* if empty."""
    val = os.environ.get(primary, "")
    if val:
        return val
    return os.environ.get(fallback, "")


def _split_csv(s: str) -> List[str]:
    """Split a comma-separated string into trimmed, non-empty parts."""
    return [part.strip() for part in s.split(",") if part.strip()]


def _parse_sunset_config(s: str) -> Dict[str, str]:
    """Parse ``"v1:2026-06-01,v2:2026-12-01"`` into a dict."""
    result: Dict[str, str] = {}
    for pair in s.split(","):
        pair = pair.strip()
        if ":" not in pair:
            continue
        key, _, val = pair.partition(":")
        key = key.strip()
        val = val.strip()
        if key and val:
            result[key] = val
    return result
