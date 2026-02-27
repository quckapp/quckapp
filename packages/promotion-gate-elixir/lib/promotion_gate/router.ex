defmodule PromotionGate.Router do
  @moduledoc """
  Phoenix router for the promotion-gate endpoints.

  Services mount this router via `forward` in their own router:

      forward "/promotion", PromotionGate.Router

  This exposes the following routes under the forwarded prefix:

      GET  /can_promote        - check promotion eligibility
      POST /promote            - record a standard promotion
      POST /emergency_activate - record an emergency activation
      GET  /history            - list recent promotion records
      GET  /status             - return environment metadata
  """

  use Phoenix.Router

  pipeline :promotion_api do
    plug :accepts, ["json"]
  end

  scope "/", PromotionGate do
    pipe_through :promotion_api

    get "/can_promote", PromotionController, :can_promote
    post "/promote", PromotionController, :promote
    post "/emergency_activate", PromotionController, :emergency_activate
    get "/history", PromotionController, :history
    get "/status", PromotionController, :status
  end
end
