"""FastAPI router factory for the promotion-gate endpoints.

Usage::

    from promotion_gate import create_promotion_router

    promo_router = create_promotion_router("ml-service", os.getenv("ENVIRONMENT", "local"))
    app.include_router(promo_router, prefix="/api/v1/promotion")
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .chain import is_unrestricted, normalize, previous_of, uat_variants
from .models import (
    CanPromoteResponse,
    EmergencyActivateRequest,
    PromoteRequest,
    PromotionRecordResponse,
)
from .store import (
    PromotionRecord,
    get_promo_db,
    get_history,
    is_active_in_env,
    record_promotion,
)

logger = logging.getLogger(__name__)


def _wrap(data: Any) -> Dict[str, Any]:
    """Wrap a response payload in the standard ``{"data": ...}`` envelope."""
    return {"data": data}


def create_promotion_router(service_name: str, environment: str) -> APIRouter:
    """Create and return a FastAPI :class:`APIRouter` with promotion-gate
    endpoints.

    The returned router defines endpoints at its **root** (no prefix).  The
    caller is responsible for mounting the router with the desired prefix::

        promo = create_promotion_router("ml-service", "staging")
        app.include_router(promo, prefix="/api/v1/promotion")

    Args:
        service_name: Identifies this service (e.g. ``"ml-service"``).
        environment: The deployment environment this instance runs in
            (e.g. ``"staging"``).  Used as the default ``toEnvironment``
            context.
    """

    router = APIRouter(tags=["Promotion Gate"])

    # ------------------------------------------------------------------
    # GET /can-promote?serviceKey=&apiVersion=&toEnvironment=
    # ------------------------------------------------------------------
    @router.get("/can-promote")
    def can_promote(
        serviceKey: str = Query(..., description="Service identifier"),
        apiVersion: str = Query(..., description="API version (e.g. v1)"),
        toEnvironment: str = Query(..., description="Target environment"),
        db: Session = Depends(get_promo_db),
    ) -> Dict[str, Any]:
        """Check whether a service version can be promoted to *toEnvironment*.

        Returns ``{"data": {"allowed": true/false, ...}}``.
        """
        if is_unrestricted(toEnvironment):
            return _wrap(
                CanPromoteResponse(
                    allowed=True,
                    serviceKey=serviceKey,
                    apiVersion=apiVersion,
                    fromEnvironment="none",
                    toEnvironment=toEnvironment,
                    blockedReason=None,
                ).model_dump(by_alias=True)
            )

        prev_env = previous_of(toEnvironment)
        if prev_env is None:
            return _wrap(
                CanPromoteResponse(
                    allowed=True,
                    serviceKey=serviceKey,
                    apiVersion=apiVersion,
                    fromEnvironment="none",
                    toEnvironment=toEnvironment,
                    blockedReason=None,
                ).model_dump(by_alias=True)
            )

        active = is_active_in_env(db, prev_env, serviceKey, apiVersion)

        if active:
            return _wrap(
                CanPromoteResponse(
                    allowed=True,
                    serviceKey=serviceKey,
                    apiVersion=apiVersion,
                    fromEnvironment=prev_env,
                    toEnvironment=toEnvironment,
                    blockedReason=None,
                ).model_dump(by_alias=True)
            )
        else:
            reason = (
                f"{serviceKey} {apiVersion} is not ACTIVE in {prev_env}"
            )
            return _wrap(
                CanPromoteResponse(
                    allowed=False,
                    serviceKey=serviceKey,
                    apiVersion=apiVersion,
                    fromEnvironment=prev_env,
                    toEnvironment=toEnvironment,
                    blockedReason=reason,
                ).model_dump(by_alias=True)
            )

    # ------------------------------------------------------------------
    # POST /promote
    # ------------------------------------------------------------------
    @router.post("/promote")
    def promote(
        body: PromoteRequest,
        db: Session = Depends(get_promo_db),
    ) -> Dict[str, Any]:
        """Record a normal promotion.

        Validates the environment chain gate before persisting.
        """
        to_env = body.to_environment
        from_env = body.from_environment

        # Gate check (unless unrestricted)
        if not is_unrestricted(to_env):
            prev_env = previous_of(to_env)
            if prev_env is not None:
                if not is_active_in_env(db, prev_env, body.service_key, body.api_version):
                    raise HTTPException(
                        status_code=403,
                        detail=(
                            f"Promotion blocked: {body.service_key} {body.api_version} "
                            f"is not ACTIVE in {prev_env}. "
                            f"Use emergency-activate for hotfix bypass."
                        ),
                    )

        rec = PromotionRecord(
            service_key=body.service_key,
            api_version=body.api_version,
            from_environment=from_env,
            to_environment=to_env,
            status="ACTIVE",
            promoted_by=body.promoted_by,
            reason=body.reason or "",
            is_emergency=False,
        )
        rec = record_promotion(db, rec)

        logger.info(
            "Promoted %s %s from %s to %s by %s",
            body.service_key,
            body.api_version,
            from_env,
            to_env,
            body.promoted_by,
        )

        return _wrap(
            PromotionRecordResponse.model_validate(rec).model_dump(by_alias=True)
        )

    # ------------------------------------------------------------------
    # POST /emergency-activate
    # ------------------------------------------------------------------
    @router.post("/emergency-activate")
    def emergency_activate(
        body: EmergencyActivateRequest,
        db: Session = Depends(get_promo_db),
    ) -> Dict[str, Any]:
        """Emergency hotfix bypass -- requires dual approval.

        Validation rules:
        - ``approvedBy`` must differ from ``promotedBy``
        - A JIRA ticket is mandatory
        """
        # Dual-approval validation
        if body.approved_by.lower() == body.promoted_by.lower():
            raise HTTPException(
                status_code=400,
                detail="Emergency hotfix: approvedBy must differ from promotedBy",
            )

        rec = PromotionRecord(
            service_key=body.service_key,
            api_version=body.api_version,
            from_environment="EMERGENCY_BYPASS",
            to_environment=body.to_environment,
            status="ACTIVE",
            promoted_by=body.promoted_by,
            approved_by=body.approved_by,
            reason=body.reason,
            is_emergency=True,
            jira_ticket=body.jira_ticket,
        )
        rec = record_promotion(db, rec)

        logger.warning(
            "EMERGENCY HOTFIX: %s %s activated in %s by %s (approver: %s, ticket: %s)",
            body.service_key,
            body.api_version,
            body.to_environment,
            body.promoted_by,
            body.approved_by,
            body.jira_ticket,
        )

        return _wrap(
            PromotionRecordResponse.model_validate(rec).model_dump(by_alias=True)
        )

    # ------------------------------------------------------------------
    # GET /history?serviceKey=&apiVersion=
    # ------------------------------------------------------------------
    @router.get("/history")
    def history(
        serviceKey: str = Query(..., description="Service identifier"),
        apiVersion: str = Query(..., description="API version (e.g. v1)"),
        db: Session = Depends(get_promo_db),
    ) -> Dict[str, Any]:
        """Return the promotion audit trail for a service version (up to 100
        entries, newest first).
        """
        records = get_history(db, serviceKey, apiVersion)
        return _wrap(
            [
                PromotionRecordResponse.model_validate(r).model_dump(by_alias=True)
                for r in records
            ]
        )

    # ------------------------------------------------------------------
    # GET /status?serviceKey=&apiVersion=
    # ------------------------------------------------------------------
    @router.get("/status")
    def status(
        serviceKey: str = Query(..., description="Service identifier"),
        apiVersion: str = Query(..., description="API version (e.g. v1)"),
        db: Session = Depends(get_promo_db),
    ) -> Dict[str, Any]:
        """Return the current promotion status for a service version across
        all environments in the chain.
        """
        from .chain import CHAIN

        env_status: Dict[str, Any] = {}
        for env in CHAIN:
            # For UAT, check all variants
            if env == "uat":
                active = False
                active_variants: List[str] = []
                for variant in uat_variants():
                    if is_active_in_env(db, variant, serviceKey, apiVersion):
                        active = True
                        active_variants.append(variant)
                env_status[env] = {
                    "active": active,
                    "activeVariants": active_variants,
                }
            else:
                env_status[env] = {
                    "active": is_active_in_env(db, env, serviceKey, apiVersion),
                }

        return _wrap(
            {
                "serviceKey": serviceKey,
                "apiVersion": apiVersion,
                "currentEnvironment": environment,
                "serviceName": service_name,
                "environments": env_status,
            }
        )

    return router
