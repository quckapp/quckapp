#!/usr/bin/env bash
# =============================================================================
# Install Erlang 26 + Elixir 1.15 for the dev container
# No standard devcontainer feature exists for Elixir
# =============================================================================
set -euo pipefail

echo "=== Installing Erlang/OTP 26 ==="
apt-get update
apt-get install -y --no-install-recommends \
  wget \
  gnupg2 \
  apt-transport-https

wget -O- https://packages.erlang-solutions.com/ubuntu/erlang_solutions.asc | apt-key add -
echo "deb https://packages.erlang-solutions.com/ubuntu jammy contrib" > /etc/apt/sources.list.d/erlang.list
apt-get update
apt-get install -y --no-install-recommends esl-erlang=1:26.*

echo "=== Installing Elixir 1.15 ==="
ELIXIR_VERSION="1.15.7"
wget -q "https://github.com/elixir-lang/elixir/releases/download/v${ELIXIR_VERSION}/elixir-otp-26.zip" -O /tmp/elixir.zip
unzip -q /tmp/elixir.zip -d /usr/local/elixir
ln -sf /usr/local/elixir/bin/* /usr/local/bin/
rm /tmp/elixir.zip

echo "=== Installing Hex + Rebar ==="
mix local.hex --force
mix local.rebar --force

echo "=== Elixir installation complete ==="
elixir --version
