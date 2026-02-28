defmodule PromotionGate.Store do
  @moduledoc """
  GenServer that manages promotion records in MongoDB.

  Holds connection configuration (pool name, database, collection, service
  name, current environment) and provides functions to query and persist
  promotion records.

  ## Usage

  Add to your supervision tree:

      children = [
        {PromotionGate.Store,
         pool: :mongo_pool,
         db: "my_service_db",
         service: "message-service",
         env: System.get_env("ENVIRONMENT", "local")}
      ]

  Then call the public API:

      PromotionGate.Store.is_active_in_env("qa", "message-service", "v1")
      PromotionGate.Store.record_promotion(%{...})
      PromotionGate.Store.get_history("message-service", "v1")
  """

  use GenServer
  require Logger

  @default_collection "promotion_records"

  # ---------------------------------------------------------------------------
  # Public API
  # ---------------------------------------------------------------------------

  @doc """
  Start the Store GenServer.

  ## Options

    * `:pool` - the named Mongo connection pool (e.g. `:mongo_pool`). Required.
    * `:db` - the MongoDB database name. Required.
    * `:service` - the logical service name. Required.
    * `:env` - the current environment (e.g. `"local"`). Required.
    * `:collection` - collection name. Defaults to `"promotion_records"`.
  """
  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Return `true` when at least one ACTIVE promotion record exists for the
  given environment, service key, and API version.
  """
  @spec is_active_in_env(String.t(), String.t(), String.t()) :: {:ok, boolean()} | {:error, term()}
  def is_active_in_env(env, service_key, api_version) do
    GenServer.call(__MODULE__, {:is_active_in_env, env, service_key, api_version})
  end

  @doc """
  Persist a new promotion record. The map should contain the following keys:

    * `"service_key"` - the service identifier
    * `"api_version"` - API version string (e.g. `"v1"`)
    * `"from_environment"` - source environment
    * `"to_environment"` - target environment
    * `"status"` - record status (e.g. `"ACTIVE"`)
    * `"promoted_by"` - who triggered the promotion
    * `"approved_by"` - who approved (for emergency activations)
    * `"reason"` - human-readable reason
    * `"is_emergency"` - boolean flag
  """
  @spec record_promotion(map()) :: {:ok, map()} | {:error, term()}
  def record_promotion(record_map) do
    GenServer.call(__MODULE__, {:record_promotion, record_map})
  end

  @doc """
  Return the 100 most recent promotion records for a service key and API
  version, ordered by `created_at` descending.
  """
  @spec get_history(String.t(), String.t()) :: {:ok, [map()]} | {:error, term()}
  def get_history(service_key, api_version) do
    GenServer.call(__MODULE__, {:get_history, service_key, api_version})
  end

  # ---------------------------------------------------------------------------
  # GenServer callbacks
  # ---------------------------------------------------------------------------

  @impl true
  def init(opts) do
    pool = Keyword.fetch!(opts, :pool)
    db = Keyword.fetch!(opts, :db)
    service = Keyword.fetch!(opts, :service)
    env = Keyword.fetch!(opts, :env)
    collection = Keyword.get(opts, :collection, @default_collection)

    state = %{
      pool: pool,
      db: db,
      collection: collection,
      service: service,
      env: env
    }

    ensure_indexes(state)

    Logger.info(
      "[PromotionGate.Store] started for service=#{service} env=#{env} " <>
        "pool=#{pool} db=#{db} collection=#{collection}"
    )

    {:ok, state}
  end

  @impl true
  def handle_call({:is_active_in_env, env, service_key, api_version}, _from, state) do
    filter = %{
      "to_environment" => env,
      "service_key" => service_key,
      "api_version" => api_version,
      "status" => "ACTIVE"
    }

    case Mongo.count_documents(state.pool, state.collection, filter) do
      {:ok, count} ->
        {:reply, {:ok, count > 0}, state}

      {:error, reason} = err ->
        Logger.error("[PromotionGate.Store] is_active_in_env failed: #{inspect(reason)}")
        {:reply, err, state}
    end
  end

  @impl true
  def handle_call({:record_promotion, record_map}, _from, state) do
    doc =
      record_map
      |> Map.put("_id", uuid4())
      |> Map.put("created_at", DateTime.utc_now())

    case Mongo.insert_one(state.pool, state.collection, doc) do
      {:ok, _result} ->
        {:reply, {:ok, doc}, state}

      {:error, reason} = err ->
        Logger.error("[PromotionGate.Store] record_promotion failed: #{inspect(reason)}")
        {:reply, err, state}
    end
  end

  @impl true
  def handle_call({:get_history, service_key, api_version}, _from, state) do
    filter = %{
      "service_key" => service_key,
      "api_version" => api_version
    }

    records =
      Mongo.find(state.pool, state.collection, filter,
        sort: %{"created_at" => -1},
        limit: 100
      )
      |> Enum.to_list()

    {:reply, {:ok, records}, state}
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp ensure_indexes(state) do
    # Index for active-in-env lookups
    Mongo.command(state.pool, %{
      "createIndexes" => state.collection,
      "indexes" => [
        %{
          "key" => %{
            "to_environment" => 1,
            "service_key" => 1,
            "api_version" => 1,
            "status" => 1
          },
          "name" => "idx_active_env_lookup"
        },
        %{
          "key" => %{
            "service_key" => 1,
            "api_version" => 1,
            "created_at" => -1
          },
          "name" => "idx_history_lookup"
        }
      ]
    })
  rescue
    error ->
      Logger.warning(
        "[PromotionGate.Store] index creation deferred: #{inspect(error)}"
      )
  end

  defp uuid4 do
    hex =
      :crypto.strong_rand_bytes(16)
      |> Base.encode16(case: :lower)

    <<a::binary-size(8), b::binary-size(4), c::binary-size(4), d::binary-size(4),
      e::binary-size(12)>> = hex

    "#{a}-#{b}-#{c}-#{d}-#{e}"
  end
end
