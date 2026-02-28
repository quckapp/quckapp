defmodule VersionPlug.MixProject do
  use Mix.Project

  def project do
    [
      app: :version_plug,
      version: "1.0.0",
      elixir: "~> 1.14",
      deps: deps()
    ]
  end

  def application do
    [extra_applications: [:logger]]
  end

  defp deps do
    [
      {:plug, "~> 1.14"},
      {:jason, "~> 1.4"}
    ]
  end
end
