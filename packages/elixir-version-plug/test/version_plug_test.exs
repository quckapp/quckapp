defmodule VersionPlugTest do
  use ExUnit.Case, async: true
  use Plug.Test

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  defp set_config(overrides \\ %{}) do
    defaults = %{
      supported_versions: ["v1", "v2"],
      deprecated_versions: [],
      sunset_config: %{},
      default_version: "v2",
      version_mode: "deployed"
    }

    config = Map.merge(defaults, overrides)

    Application.put_env(:version_plug, :supported_versions, config.supported_versions)
    Application.put_env(:version_plug, :deprecated_versions, config.deprecated_versions)
    Application.put_env(:version_plug, :sunset_config, config.sunset_config)
    Application.put_env(:version_plug, :default_version, config.default_version)
    Application.put_env(:version_plug, :version_mode, config.version_mode)
  end

  defp call_plug(method, path) do
    conn(method, path)
    |> VersionPlug.call(VersionPlug.init([]))
  end

  # ---------------------------------------------------------------------------
  # Tests
  # ---------------------------------------------------------------------------

  test "active version passes through with api_version assigned" do
    set_config(%{supported_versions: ["v1", "v2"], version_mode: "deployed"})

    conn = call_plug(:get, "/api/v1/users")

    refute conn.halted
    assert conn.assigns[:api_version] == "v1"
  end

  test "unsupported version returns 404" do
    set_config(%{supported_versions: ["v1"], version_mode: "deployed"})

    conn = call_plug(:get, "/api/v3/users")

    assert conn.status == 404
    assert conn.halted

    body = Jason.decode!(conn.resp_body)
    assert body["error"] == "API version not found"
    assert body["version"] == "v3"
  end

  test "deprecated version passes with deprecation headers" do
    set_config(%{
      supported_versions: ["v2"],
      deprecated_versions: ["v1"],
      sunset_config: %{"v1" => "2099-01-01"},
      default_version: "v2",
      version_mode: "deployed"
    })

    conn = call_plug(:get, "/api/v1/users")

    refute conn.halted
    assert conn.assigns[:api_version] == "v1"
    assert get_resp_header(conn, "deprecation") == ["true"]
    assert get_resp_header(conn, "sunset") == ["2099-01-01"]
    assert get_resp_header(conn, "link") == ["</api/v2>; rel=\"successor-version\""]
  end

  test "sunset version returns 410 Gone" do
    set_config(%{
      supported_versions: ["v2"],
      deprecated_versions: ["v1"],
      sunset_config: %{"v1" => "2020-01-01"},
      default_version: "v2",
      version_mode: "deployed"
    })

    conn = call_plug(:get, "/api/v1/users")

    assert conn.status == 410
    assert conn.halted

    body = Jason.decode!(conn.resp_body)
    assert body["error"] == "API version has been sunset"
    assert body["version"] == "v1"
    assert body["sunset"] == "2020-01-01"
  end

  test "local mode skips validation and sets version" do
    set_config(%{
      supported_versions: ["v1"],
      default_version: "v1",
      version_mode: "local"
    })

    conn = call_plug(:get, "/api/v99/users")

    refute conn.halted
    assert conn.assigns[:api_version] == "v99"
  end

  test "local mode uses default version for non-versioned paths" do
    set_config(%{
      supported_versions: ["v1"],
      default_version: "v2",
      version_mode: "local"
    })

    conn = call_plug(:get, "/health")

    refute conn.halted
    assert conn.assigns[:api_version] == "v2"
  end

  test "non-versioned path passes through in deployed mode" do
    set_config(%{supported_versions: ["v1"], version_mode: "deployed"})

    conn = call_plug(:get, "/health")

    refute conn.halted
    assert conn.assigns[:api_version] == nil
  end
end
