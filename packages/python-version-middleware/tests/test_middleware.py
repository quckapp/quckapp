"""Tests for the VersionMiddleware using FastAPI TestClient."""

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from version_middleware import VersionConfig, VersionMiddleware


def _create_app(config: VersionConfig) -> FastAPI:
    """Create a minimal FastAPI app with the version middleware applied."""
    app = FastAPI()
    app.add_middleware(VersionMiddleware, config=config)

    @app.get("/api/{version}/{rest:path}")
    async def versioned_endpoint(version: str, rest: str, request: Request):
        api_version = getattr(request.state, "api_version", None)
        return {"version": api_version}

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


# ---- Tests ----------------------------------------------------------------


def test_active_version():
    """v1 active -> 200, version reported correctly, no deprecation headers."""
    config = VersionConfig(
        service_key="test",
        active_versions=["v1", "v2"],
        default_version="v2",
        version_mode="deployed",
    )
    client = TestClient(_create_app(config))
    response = client.get("/api/v1/users")

    assert response.status_code == 200
    assert response.json()["version"] == "v1"
    assert "Deprecation" not in response.headers


def test_unsupported_version():
    """v3 with only v1 active -> 404 with error payload."""
    config = VersionConfig(
        service_key="test",
        active_versions=["v1"],
        default_version="v1",
        version_mode="deployed",
    )
    client = TestClient(_create_app(config))
    response = client.get("/api/v3/users")

    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "API version not found"
    assert body["version"] == "v3"
    assert "v1" in body["supported_versions"]


def test_deprecated_headers():
    """v1 deprecated -> 200 + Deprecation + Sunset + Link headers."""
    config = VersionConfig(
        service_key="test",
        active_versions=["v2"],
        deprecated_versions=["v1"],
        sunset_config={"v1": "2099-01-01"},
        default_version="v2",
        version_mode="deployed",
    )
    client = TestClient(_create_app(config))
    response = client.get("/api/v1/users")

    assert response.status_code == 200
    assert response.headers["Deprecation"] == "true"
    assert response.headers["Sunset"] == "2099-01-01"
    assert '</api/v2>; rel="successor-version"' in response.headers["Link"]


def test_sunset_version():
    """v1 with past sunset date -> 410 Gone."""
    config = VersionConfig(
        service_key="test",
        active_versions=["v2"],
        deprecated_versions=["v1"],
        sunset_config={"v1": "2020-01-01"},
        default_version="v2",
        version_mode="deployed",
    )
    client = TestClient(_create_app(config))
    response = client.get("/api/v1/users")

    assert response.status_code == 410
    body = response.json()
    assert body["error"] == "API version has been sunset"
    assert body["version"] == "v1"
    assert body["sunset"] == "2020-01-01"


def test_local_mode():
    """v99 in local mode -> 200 (no validation)."""
    config = VersionConfig(
        service_key="test",
        active_versions=["v1"],
        default_version="v1",
        version_mode="local",
    )
    client = TestClient(_create_app(config))
    response = client.get("/api/v99/users")

    assert response.status_code == 200
    assert response.json()["version"] == "v99"
