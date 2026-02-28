defmodule PromotionGate.MixProject do
  use Mix.Project

  def project do
    [
      app: :promotion_gate,
      version: "0.1.0",
      elixir: "~> 1.15",
      deps: deps()
    ]
  end

  def application do
    [extra_applications: [:logger]]
  end

  defp deps do
    [
      {:phoenix, "~> 1.7.10"},
      {:jason, "~> 1.4"},
      {:mongodb_driver, "~> 1.4"},
      {:plug_cowboy, "~> 2.7"}
    ]
  end
end
