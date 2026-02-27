defmodule PromotionGate.PromotionController do
  @moduledoc """
  Phoenix controller exposing the promotion-gate HTTP API.

  Endpoints:

    * `GET  /can_promote`        - check whether a promotion is allowed
    * `POST /promote`            - record a normal promotion
    * `POST /emergency_activate` - record an emergency activation (bypasses chain)
    * `GET  /history`            - list recent promotion records
    * `GET  /status`             - return current environment and service metadata
  """

  use Phoenix.Controller, formats: [:json]
  require Logger

  alias PromotionGate
  alias PromotionGate.Store

  # ---------------------------------------------------------------------------
  # GET /can_promote?serviceKey=...&apiVersion=...&toEnvironment=...
  # ---------------------------------------------------------------------------

  @doc """
  Check whether a service version is eligible for promotion into the
  requested target environment. Returns JSON with `allowed`, `reason`, and
  context fields.
  """
  def can_promote(conn, params) do
    service_key = Map.get(params, "serviceKey", "")
    api_version = Map.get(params, "apiVersion", "")
    to_env = Map.get(params, "toEnvironment", "")

    norm_to = PromotionGate.normalize(to_env)
    previous = PromotionGate.previous_of(to_env)

    cond do
      service_key == "" or api_version == "" or to_env == "" ->
        conn
        |> put_status(400)
        |> json(%{"error" => "serviceKey, apiVersion, and toEnvironment are required"})

      PromotionGate.is_unrestricted(to_env) ->
        json(conn, %{
          "data" => %{
            "allowed" => true,
            "reason" => "Environment #{norm_to} is unrestricted",
            "fromEnvironment" => previous,
            "toEnvironment" => norm_to,
            "serviceKey" => service_key,
            "apiVersion" => api_version,
            "previousRequired" => nil,
            "activeInPrevious" => true
          }
        })

      true ->
        case Store.is_active_in_env(previous, service_key, api_version) do
          {:ok, true} ->
            json(conn, %{
              "data" => %{
                "allowed" => true,
                "reason" => "Service is active in #{previous}; promotion to #{norm_to} is allowed",
                "fromEnvironment" => previous,
                "toEnvironment" => norm_to,
                "serviceKey" => service_key,
                "apiVersion" => api_version,
                "previousRequired" => previous,
                "activeInPrevious" => true
              }
            })

          {:ok, false} ->
            json(conn, %{
              "data" => %{
                "allowed" => false,
                "reason" =>
                  "Service #{service_key} #{api_version} is not active in #{previous}; " <>
                    "cannot promote to #{norm_to}",
                "fromEnvironment" => previous,
                "toEnvironment" => norm_to,
                "serviceKey" => service_key,
                "apiVersion" => api_version,
                "previousRequired" => previous,
                "activeInPrevious" => false
              }
            })

          {:error, reason} ->
            Logger.error("[PromotionGate] can_promote check failed: #{inspect(reason)}")

            conn
            |> put_status(500)
            |> json(%{"error" => "Internal error checking promotion eligibility"})
        end
    end
  end

  # ---------------------------------------------------------------------------
  # POST /promote
  # Body: serviceKey, apiVersion, fromEnvironment, toEnvironment, promotedBy, reason
  # ---------------------------------------------------------------------------

  @doc """
  Record a standard promotion. The service must be active in the previous
  environment (enforced by the chain) unless the target is unrestricted.
  """
  def promote(conn, params) do
    with {:ok, service_key} <- require_param(params, "serviceKey"),
         {:ok, api_version} <- require_param(params, "apiVersion"),
         {:ok, from_env} <- require_param(params, "fromEnvironment"),
         {:ok, to_env} <- require_param(params, "toEnvironment"),
         {:ok, promoted_by} <- require_param(params, "promotedBy") do
      norm_to = PromotionGate.normalize(to_env)
      previous = PromotionGate.previous_of(to_env)
      reason = Map.get(params, "reason", "")

      allowed =
        PromotionGate.is_unrestricted(to_env) or
          match?({:ok, true}, Store.is_active_in_env(previous, service_key, api_version))

      if allowed do
        record = %{
          "service_key" => service_key,
          "api_version" => api_version,
          "from_environment" => PromotionGate.normalize(from_env),
          "to_environment" => norm_to,
          "status" => "ACTIVE",
          "promoted_by" => promoted_by,
          "approved_by" => nil,
          "reason" => reason,
          "is_emergency" => false
        }

        case Store.record_promotion(record) do
          {:ok, doc} ->
            conn
            |> put_status(201)
            |> json(%{"data" => doc})

          {:error, err} ->
            Logger.error("[PromotionGate] promote failed: #{inspect(err)}")

            conn
            |> put_status(500)
            |> json(%{"error" => "Failed to record promotion"})
        end
      else
        conn
        |> put_status(403)
        |> json(%{
          "error" =>
            "Service #{service_key} #{api_version} is not active in #{previous}; " <>
              "cannot promote to #{norm_to}"
        })
      end
    else
      {:error, message} ->
        conn
        |> put_status(400)
        |> json(%{"error" => message})
    end
  end

  # ---------------------------------------------------------------------------
  # POST /emergency_activate
  # Body: serviceKey, apiVersion, toEnvironment, promotedBy, approvedBy, reason
  # ---------------------------------------------------------------------------

  @doc """
  Record an emergency activation that bypasses the normal promotion chain.
  Requires `approvedBy` and `reason` fields.
  """
  def emergency_activate(conn, params) do
    with {:ok, service_key} <- require_param(params, "serviceKey"),
         {:ok, api_version} <- require_param(params, "apiVersion"),
         {:ok, to_env} <- require_param(params, "toEnvironment"),
         {:ok, promoted_by} <- require_param(params, "promotedBy"),
         {:ok, approved_by} <- require_param(params, "approvedBy"),
         {:ok, reason} <- require_param(params, "reason") do
      norm_to = PromotionGate.normalize(to_env)

      record = %{
        "service_key" => service_key,
        "api_version" => api_version,
        "from_environment" => nil,
        "to_environment" => norm_to,
        "status" => "ACTIVE",
        "promoted_by" => promoted_by,
        "approved_by" => approved_by,
        "reason" => reason,
        "is_emergency" => true
      }

      case Store.record_promotion(record) do
        {:ok, doc} ->
          Logger.warning(
            "[PromotionGate] EMERGENCY activation: #{service_key} #{api_version} -> #{norm_to} " <>
              "by #{promoted_by}, approved by #{approved_by}, reason: #{reason}"
          )

          conn
          |> put_status(201)
          |> json(%{"data" => doc})

        {:error, err} ->
          Logger.error("[PromotionGate] emergency_activate failed: #{inspect(err)}")

          conn
          |> put_status(500)
          |> json(%{"error" => "Failed to record emergency activation"})
      end
    else
      {:error, message} ->
        conn
        |> put_status(400)
        |> json(%{"error" => message})
    end
  end

  # ---------------------------------------------------------------------------
  # GET /history?serviceKey=...&apiVersion=...
  # ---------------------------------------------------------------------------

  @doc """
  Return the most recent promotion records for a service key and API version.
  """
  def history(conn, params) do
    service_key = Map.get(params, "serviceKey", "")
    api_version = Map.get(params, "apiVersion", "")

    if service_key == "" or api_version == "" do
      conn
      |> put_status(400)
      |> json(%{"error" => "serviceKey and apiVersion are required"})
    else
      case Store.get_history(service_key, api_version) do
        {:ok, records} ->
          json(conn, %{"data" => records})

        {:error, reason} ->
          Logger.error("[PromotionGate] history query failed: #{inspect(reason)}")

          conn
          |> put_status(500)
          |> json(%{"error" => "Failed to retrieve promotion history"})
      end
    end
  end

  # ---------------------------------------------------------------------------
  # GET /status
  # ---------------------------------------------------------------------------

  @doc """
  Return metadata about the promotion gate: current environment, service
  name, environment chain, and UAT variants.
  """
  def status(conn, _params) do
    state = :sys.get_state(Store)

    json(conn, %{
      "data" => %{
        "service" => state.service,
        "environment" => state.env,
        "chain" => ["local", "dev", "qa", "uat", "staging", "production", "live"],
        "uatVariants" => PromotionGate.uat_variants()
      }
    })
  end

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  defp require_param(params, key) do
    case Map.get(params, key) do
      nil -> {:error, "#{key} is required"}
      "" -> {:error, "#{key} is required"}
      value -> {:ok, value}
    end
  end
end
