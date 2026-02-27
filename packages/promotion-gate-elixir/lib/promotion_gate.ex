defmodule PromotionGate do
  @moduledoc """
  Environment promotion chain logic for QuckApp Elixir services.

  Enforces the ordered promotion path:

      local -> dev -> qa -> uat -> staging -> production -> live

  A service must be active in the previous environment before it can be
  promoted to the next one. UAT variants (uat1, uat2, uat3) are all
  normalised to "uat" in the chain. The first two environments (local, dev)
  are unrestricted and do not require a prior promotion record.

  ## Usage

  Add `{:promotion_gate, path: "../packages/promotion-gate-elixir"}` to your
  service's `mix.exs` deps, start `PromotionGate.Store` in your supervision
  tree, and forward routes in your router:

      forward "/promotion", PromotionGate.Router
  """

  @chain ["local", "dev", "qa", "uat", "staging", "production", "live"]

  @uat_variants ["uat", "uat1", "uat2", "uat3"]

  @unrestricted_envs MapSet.new(["local", "dev"])

  @doc """
  Normalise an environment name to its canonical chain form.

  UAT variants (uat1, uat2, uat3) are normalised to `"uat"`.
  All names are lower-cased and trimmed.

  ## Examples

      iex> PromotionGate.normalize("UAT2")
      "uat"

      iex> PromotionGate.normalize("staging")
      "staging"
  """
  @spec normalize(String.t()) :: String.t()
  def normalize(env) when is_binary(env) do
    downcased = env |> String.trim() |> String.downcase()

    if downcased in @uat_variants do
      "uat"
    else
      downcased
    end
  end

  @doc """
  Return the environment that must contain an active promotion before a
  service can be promoted into `env`.

  Returns `nil` if `env` is the first in the chain or is unknown.

  ## Examples

      iex> PromotionGate.previous_of("qa")
      "dev"

      iex> PromotionGate.previous_of("local")
      nil
  """
  @spec previous_of(String.t()) :: String.t() | nil
  def previous_of(env) when is_binary(env) do
    norm = normalize(env)

    case Enum.find_index(@chain, &(&1 == norm)) do
      nil -> nil
      0 -> nil
      idx -> Enum.at(@chain, idx - 1)
    end
  end

  @doc """
  Return `true` when the environment does not require a prior promotion
  record (i.e. local or dev).

  ## Examples

      iex> PromotionGate.is_unrestricted("local")
      true

      iex> PromotionGate.is_unrestricted("staging")
      false
  """
  @spec is_unrestricted(String.t()) :: boolean()
  def is_unrestricted(env) when is_binary(env) do
    MapSet.member?(@unrestricted_envs, normalize(env))
  end

  @doc """
  Return the list of accepted UAT sub-environments.

  ## Examples

      iex> PromotionGate.uat_variants()
      ["uat", "uat1", "uat2", "uat3"]
  """
  @spec uat_variants() :: [String.t()]
  def uat_variants, do: @uat_variants
end
