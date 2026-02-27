"""SQLAlchemy persistence layer for promotion records.

Usage::

    from promotion_gate.store import init_promotion_db, get_promo_db

    # At startup (e.g. in FastAPI lifespan):
    init_promotion_db("mysql+pymysql://user:pass@host/db")

    # In route handlers — use as a FastAPI dependency:
    @router.get("/history")
    def history(db: Session = Depends(get_promo_db)):
        ...
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Generator, List, Optional

from sqlalchemy import Boolean, Column, DateTime, Index, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .chain import UAT_VARIANTS

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# SQLAlchemy declarative base and model
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    pass


class PromotionRecord(Base):
    """Maps to the ``promotion_records`` table.

    Column layout is intentionally aligned with the Go ``SQLStore`` schema so
    that services in both languages can share the same database.
    """

    __tablename__ = "promotion_records"

    id: str = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    service_key: str = Column(String(255), nullable=False)
    api_version: str = Column(String(50), nullable=False)
    from_environment: str = Column(String(50), nullable=False, default="")
    to_environment: str = Column(String(50), nullable=False)
    status: str = Column(String(20), nullable=False, default="ACTIVE")
    promoted_by: str = Column(String(255), nullable=False, default="")
    approved_by: str = Column(String(255), nullable=False, default="")
    reason: str = Column(Text, nullable=False, default="")
    is_emergency: bool = Column(Boolean, nullable=False, default=False)
    jira_ticket: str = Column(String(100), nullable=True, default=None)
    created_at: datetime = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        Index(
            "idx_promotion_records_env_svc_ver",
            "to_environment",
            "service_key",
            "api_version",
            "status",
        ),
        Index(
            "idx_promotion_records_svc_ver",
            "service_key",
            "api_version",
            "created_at",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<PromotionRecord {self.service_key} {self.api_version} "
            f"{self.from_environment}->{self.to_environment} [{self.status}]>"
        )


# ---------------------------------------------------------------------------
# Engine / session factory (module-level singletons)
# ---------------------------------------------------------------------------

_engine = None
_SessionLocal = None


def init_promotion_db(database_url: str) -> None:
    """Initialise the SQLAlchemy engine, session factory, and create the
    ``promotion_records`` table if it does not already exist.

    Call this once at application startup (e.g. inside a FastAPI lifespan
    context manager).

    Args:
        database_url: A SQLAlchemy connection string, e.g.
            ``"mysql+pymysql://user:pass@host:3306/dbname"``.
    """
    global _engine, _SessionLocal

    _engine = create_engine(database_url, pool_pre_ping=True)
    _SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)

    Base.metadata.create_all(bind=_engine)
    logger.info("promotion_gate: database initialised (%s)", database_url.split("@")[-1])


def get_promo_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a SQLAlchemy session and ensures it
    is closed after the request completes.

    Raises:
        RuntimeError: If :func:`init_promotion_db` has not been called.

    Usage::

        @router.get("/history")
        def history(db: Session = Depends(get_promo_db)):
            ...
    """
    if _SessionLocal is None:
        raise RuntimeError(
            "Promotion DB not initialised. Call init_promotion_db() at startup."
        )
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def is_active_in_env(
    db: Session,
    env: str,
    service_key: str,
    api_version: str,
) -> bool:
    """Return ``True`` when at least one ACTIVE promotion record exists for
    the given *env*, *service_key*, and *api_version*.

    When *env* normalises to ``"uat"`` the check is broadened to all UAT
    variants (uat, uat1, uat2, uat3).
    """
    from .chain import normalize  # local import to avoid circular

    norm = normalize(env)
    envs_to_check = UAT_VARIANTS if norm == "uat" else [norm]

    count = (
        db.query(PromotionRecord)
        .filter(
            PromotionRecord.to_environment.in_(envs_to_check),
            PromotionRecord.service_key == service_key,
            PromotionRecord.api_version == api_version,
            PromotionRecord.status == "ACTIVE",
        )
        .count()
    )
    return count > 0


def record_promotion(db: Session, rec: PromotionRecord) -> PromotionRecord:
    """Persist a new :class:`PromotionRecord` and flush so that defaults
    (id, created_at) are populated.

    Returns the same instance with server-generated fields filled in.
    """
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def get_history(
    db: Session,
    service_key: str,
    api_version: str,
) -> List[PromotionRecord]:
    """Return the 100 most recent promotion records for the given
    *service_key* and *api_version*, newest first.
    """
    return (
        db.query(PromotionRecord)
        .filter(
            PromotionRecord.service_key == service_key,
            PromotionRecord.api_version == api_version,
        )
        .order_by(PromotionRecord.created_at.desc())
        .limit(100)
        .all()
    )
