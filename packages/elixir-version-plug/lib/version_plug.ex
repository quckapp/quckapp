defmodule VersionPlug do
  @moduledoc """
  Plug for API version routing, validation, deprecation headers, and sunset enforcement.

  Extracts the API version from URL paths like `/api/v1/...` and validates
  against configured active, deprecated, and sunset versions.

  ## Configuration

  Configuration is read from `Application.get_env(:version_plug, ...)`:

      config :version_plug,
        supported_versions: ["v1", "v2"],
        deprecated_versions: ["v1"],
        sunset_config: %{"v1" => "2026-06-01"},
        default_version: "v2",
        version_mode: "deployed"

  ## Usage

  Add to your Phoenix pipeline or Plug router:

      plug VersionPlug

  Access the version in downstream plugs or controllers:

      version = conn.assigns[:api_version]

  ## Modes

  - `"local"` -- extracts the version from the path (or uses the default) and
    passes through without validation. Useful for development.
  - `"deployed"` -- enforces version checks: sunset versions return 410 Gone,
    unsupported versions return 404 Not Found, deprecated versions get
    deprecation headers.
  """

  @behaviour Plug

  import Plug.Conn

  @version_pattern ~r{^/api/(v\d+(?:\.\d+)?)(/.*)$}

  @impl true
  def init(opts) do
    opts
  end

  @impl true
  def call(conn, _opts) do
    config = load_config()
    path = conn.request_path

    version_mode = config.version_mode

    cond do
      version_mode == "local" ->
        handle_local_mode(conn, path, config)

      true ->
        handle_deployed_mode(conn, path, config)
    end
  end

  # ---------------------------------------------------------------------------
  # Local mode
  # ---------------------------------------------------------------------------

  defp handle_local_mode(conn, path, config) do
    version =
      case Regex.run(@version_pattern, path) do
        [_, ver, _rest] -> ver
        _ -> config.default_version
      end

    assign(conn, :api_version, version)
  end

  # ---------------------------------------------------------------------------
  # Deployed mode
  # ---------------------------------------------------------------------------

  defp handle_deployed_mode(conn, path, config) do
    case Regex.run(@version_pattern, path) do
      [_, version, _rest] ->
        validate_version(conn, version, config)

      _ ->
        # Non-versioned paths (health, metrics, etc.) pass through
        conn
    end
  end

  defp validate_version(conn, version, config) do
    active_set = MapSet.new(config.supported_versions)
    deprecated_set = MapSet.new(config.deprecated_versions)

    cond do
      # Sunset check: if the version has a sunset date in the past, return 410 Gone
      sunset_expired?(version, config.sunset_config) ->
        sunset_date = Map.get(config.sunset_config, version)

        conn
        |> put_resp_content_type("application/json")
        |> send_resp(
          410,
          Jason.encode!(%{
            "error" => "API version has been sunset",
            "version" => version,
            "sunset" => sunset_date,
            "message" =>
              "API #{version} was sunset on #{sunset_date}. Please migrate to #{config.default_version}."
          })
        )
        |> halt()

      # Unsupported: not active and not deprecated
      not MapSet.member?(active_set, version) and not MapSet.member?(deprecated_set, version) ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(
          404,
          Jason.encode!(%{
            "error" => "API version not found",
            "version" => version,
            "supported_versions" => config.supported_versions
          })
        )
        |> halt()

      # Deprecated: pass through with deprecation headers
      MapSet.member?(deprecated_set, version) ->
        sunset_date = Map.get(config.sunset_config, version)

        conn
        |> assign(:api_version, version)
        |> put_resp_header("deprecation", "true")
        |> maybe_put_sunset_header(sunset_date)
        |> put_resp_header("link", "</api/#{config.default_version}>; rel=\"successor-version\"")

      # Active: pass through
      true ->
        assign(conn, :api_version, version)
    end
  end

  # ---------------------------------------------------------------------------
  # Sunset helpers
  # ---------------------------------------------------------------------------

  defp sunset_expired?(version, sunset_config) do
    case Map.get(sunset_config, version) do
      nil ->
        false

      date_str ->
        case Date.from_iso8601(date_str) do
          {:ok, sunset_date} ->
            Date.compare(Date.utc_today(), sunset_date) == :gt

          {:error, _} ->
            false
        end
    end
  end

  defp maybe_put_sunset_header(conn, nil), do: conn
  defp maybe_put_sunset_header(conn, sunset_date), do: put_resp_header(conn, "sunset", sunset_date)

  # ---------------------------------------------------------------------------
  # Configuration
  # ---------------------------------------------------------------------------

  defp load_config do
    %{
      supported_versions:
        Application.get_env(:version_plug, :supported_versions, ["v1", "v2"]),
      deprecated_versions:
        Application.get_env(:version_plug, :deprecated_versions, ["v1"]),
      sunset_config:
        Application.get_env(:version_plug, :sunset_config, %{"v1" => "2026-06-01"}),
      default_version:
        Application.get_env(:version_plug, :default_version, "v2"),
      version_mode:
        Application.get_env(:version_plug, :version_mode, "deployed")
    }
  end
end
