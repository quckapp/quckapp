from typing import Optional, Dict
import structlog
from app.core.config import settings

logger = structlog.get_logger()

class MLModerationService:
    """ML-based content moderation using transformers"""

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self._load_model()

    def _load_model(self):
        """Lazy load the ML model"""
        try:
            from transformers import pipeline
            self.classifier = pipeline(
                "text-classification",
                model=settings.MODEL_NAME,
                top_k=None,
            )
            logger.info("ML model loaded", model=settings.MODEL_NAME)
        except Exception as e:
            logger.warning("Failed to load ML model, using fallback", error=str(e))
            self.classifier = None

    async def analyze(self, text: str) -> Optional[Dict]:
        """Analyze text for toxicity"""
        if not self.classifier:
            return self._fallback_analyze(text)

        try:
            # Truncate long text
            text = text[:512]

            results = self.classifier(text)

            # Parse results - format depends on model
            if results and len(results) > 0:
                scores = {r["label"]: r["score"] for r in results[0]}

                # Check for toxic labels
                toxic_labels = ["hate", "toxic", "offensive", "LABEL_1"]
                max_toxic_score = max(
                    scores.get(label, 0) for label in toxic_labels
                )

                is_toxic = max_toxic_score >= settings.TOXICITY_THRESHOLD

                return {
                    "score": max_toxic_score,
                    "is_toxic": is_toxic,
                    "labels": scores,
                }

            return {"score": 0.0, "is_toxic": False, "labels": {}}

        except Exception as e:
            logger.error("ML analysis failed", error=str(e))
            return self._fallback_analyze(text)

    def _fallback_analyze(self, text: str) -> Dict:
        """Simple fallback when ML model is unavailable"""
        # Basic heuristics
        toxic_patterns = [
            r"\b(kill|die|hate|stupid|idiot)\b",
            r"[!]{3,}",  # Excessive exclamation marks
        ]

        import re
        score = 0.0
        for pattern in toxic_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.2

        score = min(score, 1.0)

        return {
            "score": score,
            "is_toxic": score >= settings.TOXICITY_THRESHOLD,
            "labels": {"fallback": score},
        }
