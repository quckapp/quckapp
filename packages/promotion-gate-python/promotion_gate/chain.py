"""Environment promotion chain logic.

Defines the ordered promotion path that a service version must follow:
local -> dev -> qa -> uat -> staging -> production -> live

UAT variants (uat1, uat2, uat3) are normalised to "uat" when checking
the chain position.
"""

from __future__ import annotations

from typing import List, Optional

CHAIN: List[str] = ["local", "dev", "qa", "uat", "staging", "production", "live"]

UAT_VARIANTS: List[str] = ["uat", "uat1", "uat2", "uat3"]


def normalize(env: str) -> str:
    """Normalise an environment name to its canonical chain form.

    UAT variants (uat1, uat2, uat3) are collapsed to ``"uat"``.
    All names are lower-cased and stripped of whitespace.
    """
    env = env.strip().lower()
    if env in UAT_VARIANTS:
        return "uat"
    return env


def _index_of(env: str) -> int:
    """Return the index of *env* in the chain, or raise ValueError."""
    norm = normalize(env)
    try:
        return CHAIN.index(norm)
    except ValueError:
        raise ValueError(
            f"Unknown environment: {env!r}. Valid environments: {CHAIN}"
        )


def previous_of(env: str) -> Optional[str]:
    """Return the environment that must contain an active promotion before
    a service can be promoted into *env*.

    Returns ``None`` if *env* is the first in the chain.
    """
    idx = _index_of(env)
    if idx <= 0:
        return None
    return CHAIN[idx - 1]


def is_unrestricted(env: str) -> bool:
    """Return ``True`` when the environment does not require a prior
    promotion record (i.e. ``"local"``).
    """
    return normalize(env) == "local"


def uat_variants() -> List[str]:
    """Return a copy of the accepted UAT sub-environment names."""
    return list(UAT_VARIANTS)
