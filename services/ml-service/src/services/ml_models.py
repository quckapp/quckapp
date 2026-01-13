import os
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from functools import lru_cache
import asyncio
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from langdetect import detect, detect_langs, LangDetectException
from textblob import TextBlob

logger = logging.getLogger(__name__)

# Thread pool for CPU-bound ML operations
_executor = ThreadPoolExecutor(max_workers=4)


class MLModels:
    """ML Models service with real implementations using lightweight models"""

    def __init__(self):
        self.sentiment_model = None
        self.ner_pipeline = None
        self.summarizer = None
        self.embedding_model = None
        self.initialized = False
        self._use_transformers = os.getenv("USE_TRANSFORMERS", "false").lower() == "true"

        # Content moderation patterns
        self._spam_patterns = [
            r'\b(buy now|click here|limited offer|act now|free money|winner)\b',
            r'(https?://\S+){3,}',  # Multiple URLs
            r'(.)\1{5,}',  # Repeated characters
            r'\b(viagra|casino|lottery|prize)\b',
        ]

        # Profanity/harassment patterns (simplified - use a proper list in production)
        self._harassment_patterns = [
            r'\b(idiot|stupid|dumb|loser|hate you)\b',
        ]

        # Adult content patterns
        self._adult_patterns = [
            r'\b(nsfw|xxx|porn)\b',
        ]

    async def initialize(self):
        """Initialize ML models"""
        logger.info("Initializing ML models...")

        if self._use_transformers:
            await self._initialize_transformers()
        else:
            logger.info("Using lightweight models (TextBlob, langdetect)")

        self.initialized = True
        logger.info("ML models initialized successfully")

    async def _initialize_transformers(self):
        """Initialize transformer models (optional, for better quality)"""
        try:
            from transformers import pipeline, AutoTokenizer, AutoModel

            logger.info("Loading transformer models...")

            # Load models in thread pool to not block event loop
            loop = asyncio.get_event_loop()

            # Sentiment analysis
            self.sentiment_model = await loop.run_in_executor(
                _executor,
                lambda: pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
            )

            # Named Entity Recognition
            self.ner_pipeline = await loop.run_in_executor(
                _executor,
                lambda: pipeline("ner", model="dbmdz/bert-large-cased-finetuned-conll03-english", aggregation_strategy="simple")
            )

            # Summarization
            self.summarizer = await loop.run_in_executor(
                _executor,
                lambda: pipeline("summarization", model="facebook/bart-large-cnn")
            )

            logger.info("Transformer models loaded successfully")

        except Exception as e:
            logger.warning(f"Failed to load transformer models, falling back to lightweight: {e}")
            self._use_transformers = False

    async def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of text"""
        if not text or not text.strip():
            return {
                "sentiment": "neutral",
                "confidence": 0.0,
                "scores": {"positive": 0.0, "neutral": 1.0, "negative": 0.0}
            }

        try:
            if self._use_transformers and self.sentiment_model:
                return await self._analyze_sentiment_transformers(text)
            else:
                return await self._analyze_sentiment_textblob(text)
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return {
                "sentiment": "neutral",
                "confidence": 0.0,
                "scores": {"positive": 0.0, "neutral": 1.0, "negative": 0.0},
                "error": str(e)
            }

    async def _analyze_sentiment_textblob(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment using TextBlob"""
        loop = asyncio.get_event_loop()

        def _analyze():
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity  # -1 to 1
            subjectivity = blob.sentiment.subjectivity  # 0 to 1

            # Convert polarity to sentiment label and scores
            if polarity > 0.1:
                sentiment = "positive"
                pos_score = min(0.5 + polarity * 0.5, 1.0)
                neg_score = max(0.0, 0.5 - polarity * 0.5)
            elif polarity < -0.1:
                sentiment = "negative"
                neg_score = min(0.5 + abs(polarity) * 0.5, 1.0)
                pos_score = max(0.0, 0.5 - abs(polarity) * 0.5)
            else:
                sentiment = "neutral"
                pos_score = 0.3
                neg_score = 0.3

            neutral_score = 1.0 - pos_score - neg_score
            neutral_score = max(0.0, neutral_score)

            # Normalize scores
            total = pos_score + neutral_score + neg_score
            if total > 0:
                pos_score /= total
                neutral_score /= total
                neg_score /= total

            confidence = max(pos_score, neutral_score, neg_score)

            return {
                "sentiment": sentiment,
                "confidence": round(confidence, 3),
                "scores": {
                    "positive": round(pos_score, 3),
                    "neutral": round(neutral_score, 3),
                    "negative": round(neg_score, 3)
                },
                "subjectivity": round(subjectivity, 3)
            }

        return await loop.run_in_executor(_executor, _analyze)

    async def _analyze_sentiment_transformers(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment using transformers"""
        loop = asyncio.get_event_loop()

        def _analyze():
            # Truncate text for model input limit
            truncated = text[:512]
            result = self.sentiment_model(truncated)[0]

            label = result["label"].lower()
            score = result["score"]

            if label == "positive":
                return {
                    "sentiment": "positive",
                    "confidence": round(score, 3),
                    "scores": {
                        "positive": round(score, 3),
                        "neutral": round((1 - score) * 0.3, 3),
                        "negative": round((1 - score) * 0.7, 3)
                    }
                }
            else:
                return {
                    "sentiment": "negative",
                    "confidence": round(score, 3),
                    "scores": {
                        "positive": round((1 - score) * 0.7, 3),
                        "neutral": round((1 - score) * 0.3, 3),
                        "negative": round(score, 3)
                    }
                }

        return await loop.run_in_executor(_executor, _analyze)

    async def moderate_content(self, content: str, content_type: str = "text") -> Dict[str, Any]:
        """Check content for inappropriate material"""
        if not content or not content.strip():
            return {
                "is_safe": True,
                "categories": {},
                "flagged_terms": []
            }

        content_lower = content.lower()
        categories = {}
        flagged_terms = []
        is_safe = True

        # Check spam
        spam_score = 0.0
        for pattern in self._spam_patterns:
            matches = re.findall(pattern, content_lower, re.IGNORECASE)
            if matches:
                spam_score += 0.3
                flagged_terms.extend(matches[:3])

        spam_flagged = spam_score >= 0.5
        categories["spam"] = {
            "flagged": spam_flagged,
            "confidence": round(min(spam_score, 1.0), 3)
        }
        if spam_flagged:
            is_safe = False

        # Check harassment
        harassment_score = 0.0
        for pattern in self._harassment_patterns:
            matches = re.findall(pattern, content_lower, re.IGNORECASE)
            if matches:
                harassment_score += 0.4
                flagged_terms.extend(matches[:3])

        harassment_flagged = harassment_score >= 0.3
        categories["harassment"] = {
            "flagged": harassment_flagged,
            "confidence": round(min(harassment_score, 1.0), 3)
        }
        if harassment_flagged:
            is_safe = False

        # Check hate speech (simplified)
        hate_score = 0.0
        hate_patterns = [r'\b(hate|kill|die)\b.*\b(all|every)\b']
        for pattern in hate_patterns:
            if re.search(pattern, content_lower):
                hate_score += 0.5

        hate_flagged = hate_score >= 0.4
        categories["hate_speech"] = {
            "flagged": hate_flagged,
            "confidence": round(min(hate_score, 1.0), 3)
        }
        if hate_flagged:
            is_safe = False

        # Check adult content
        adult_score = 0.0
        for pattern in self._adult_patterns:
            if re.search(pattern, content_lower):
                adult_score += 0.6

        adult_flagged = adult_score >= 0.5
        categories["adult_content"] = {
            "flagged": adult_flagged,
            "confidence": round(min(adult_score, 1.0), 3)
        }
        if adult_flagged:
            is_safe = False

        # Use sentiment for toxicity hint
        sentiment = await self.analyze_sentiment(content)
        if sentiment["sentiment"] == "negative" and sentiment["confidence"] > 0.8:
            categories["potentially_toxic"] = {
                "flagged": False,
                "confidence": round(sentiment["scores"]["negative"], 3),
                "note": "High negative sentiment detected"
            }

        return {
            "is_safe": is_safe,
            "categories": categories,
            "flagged_terms": list(set(flagged_terms))[:10]
        }

    async def generate_smart_replies(
        self,
        conversation: List[Dict],
        context: Dict = None
    ) -> List[str]:
        """Generate smart reply suggestions based on conversation"""
        if not conversation:
            return ["Hello!", "How can I help?", "Thanks!"]

        # Get last message
        last_message = conversation[-1].get("content", "") if conversation else ""
        last_message_lower = last_message.lower()

        suggestions = []

        # Question detection
        if "?" in last_message or last_message_lower.startswith(("what", "how", "when", "where", "why", "who", "can", "could", "would", "will", "do", "does", "is", "are")):
            if "how are you" in last_message_lower:
                suggestions = ["I'm doing well, thanks!", "Great, how about you?", "All good here!"]
            elif "can you" in last_message_lower or "could you" in last_message_lower:
                suggestions = ["Sure, I can help with that!", "Of course!", "I'll look into it."]
            elif "when" in last_message_lower:
                suggestions = ["I'll check and let you know.", "Let me get back to you on that.", "I'll find out."]
            else:
                suggestions = ["Let me check on that.", "I'll get back to you.", "Good question!"]

        # Greeting detection
        elif any(g in last_message_lower for g in ["hello", "hi", "hey", "good morning", "good afternoon"]):
            suggestions = ["Hi there!", "Hello! How can I help?", "Hey!"]

        # Thanks detection
        elif any(t in last_message_lower for t in ["thank", "thanks", "appreciate"]):
            suggestions = ["You're welcome!", "Happy to help!", "Anytime!"]

        # Agreement/confirmation
        elif any(a in last_message_lower for a in ["sounds good", "okay", "ok", "sure", "yes", "agreed"]):
            suggestions = ["Great!", "Perfect!", "Sounds good to me too!"]

        # Apology detection
        elif any(s in last_message_lower for s in ["sorry", "apologize", "my bad"]):
            suggestions = ["No problem!", "No worries!", "It's all good!"]

        # Request detection
        elif any(r in last_message_lower for r in ["please", "need", "want", "looking for"]):
            suggestions = ["I'll help with that.", "On it!", "Let me see what I can do."]

        # Meeting/schedule related
        elif any(m in last_message_lower for m in ["meeting", "schedule", "call", "available"]):
            suggestions = ["What time works for you?", "I'm available.", "Let me check my calendar."]

        # Default suggestions based on sentiment
        else:
            sentiment = await self.analyze_sentiment(last_message)
            if sentiment["sentiment"] == "positive":
                suggestions = ["That's great!", "Awesome!", "Glad to hear it!"]
            elif sentiment["sentiment"] == "negative":
                suggestions = ["I understand.", "Let me help with that.", "I'm sorry to hear that."]
            else:
                suggestions = ["Got it!", "Thanks for letting me know.", "Understood."]

        return suggestions[:3]

    async def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract named entities from text"""
        if not text or not text.strip():
            return []

        entities = []

        if self._use_transformers and self.ner_pipeline:
            return await self._extract_entities_transformers(text)

        # Fallback: Simple pattern-based extraction
        loop = asyncio.get_event_loop()

        def _extract():
            results = []

            # Email extraction
            emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
            for email in emails:
                results.append({"text": email, "type": "EMAIL", "confidence": 0.95})

            # URL extraction
            urls = re.findall(r'https?://[^\s<>"{}|\\^`\[\]]+', text)
            for url in urls:
                results.append({"text": url, "type": "URL", "confidence": 0.95})

            # Phone number extraction
            phones = re.findall(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text)
            for phone in phones:
                results.append({"text": phone, "type": "PHONE", "confidence": 0.85})

            # Date extraction (simple patterns)
            dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', text)
            for date in dates:
                results.append({"text": date, "type": "DATE", "confidence": 0.80})

            # Time extraction
            times = re.findall(r'\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b', text)
            for time in times:
                results.append({"text": time, "type": "TIME", "confidence": 0.80})

            # Money extraction
            money = re.findall(r'\$\d+(?:,\d{3})*(?:\.\d{2})?', text)
            for m in money:
                results.append({"text": m, "type": "MONEY", "confidence": 0.90})

            # Capitalized words (potential proper nouns)
            blob = TextBlob(text)
            for word, tag in blob.tags:
                if tag == "NNP":  # Proper noun
                    if word not in [e["text"] for e in results]:
                        results.append({"text": word, "type": "PROPER_NOUN", "confidence": 0.60})

            return results

        return await loop.run_in_executor(_executor, _extract)

    async def _extract_entities_transformers(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities using transformers NER"""
        loop = asyncio.get_event_loop()

        def _extract():
            # Truncate for model
            truncated = text[:512]
            results = self.ner_pipeline(truncated)

            entities = []
            for r in results:
                entities.append({
                    "text": r["word"],
                    "type": r["entity_group"],
                    "confidence": round(r["score"], 3),
                    "start": r["start"],
                    "end": r["end"]
                })

            return entities

        return await loop.run_in_executor(_executor, _extract)

    async def detect_language(self, text: str) -> Dict[str, Any]:
        """Detect language of text"""
        if not text or len(text.strip()) < 3:
            return {
                "language": "unknown",
                "confidence": 0.0,
                "alternatives": []
            }

        loop = asyncio.get_event_loop()

        def _detect():
            try:
                lang = detect(text)
                probs = detect_langs(text)

                return {
                    "language": lang,
                    "language_name": _get_language_name(lang),
                    "confidence": round(probs[0].prob, 3) if probs else 0.0,
                    "alternatives": [
                        {"language": p.lang, "language_name": _get_language_name(p.lang), "confidence": round(p.prob, 3)}
                        for p in probs[1:4]
                    ]
                }
            except LangDetectException as e:
                return {
                    "language": "unknown",
                    "confidence": 0.0,
                    "alternatives": [],
                    "error": str(e)
                }

        return await loop.run_in_executor(_executor, _detect)

    async def summarize(self, text: str, max_length: int = 150, min_length: int = 30) -> Dict[str, Any]:
        """Summarize text"""
        if not text or len(text.strip()) < min_length:
            return {
                "summary": text,
                "original_length": len(text) if text else 0,
                "summary_length": len(text) if text else 0,
                "compression_ratio": 1.0
            }

        if self._use_transformers and self.summarizer:
            return await self._summarize_transformers(text, max_length, min_length)

        # Fallback: Extractive summarization using TextBlob
        return await self._summarize_extractive(text, max_length)

    async def _summarize_extractive(self, text: str, max_length: int) -> Dict[str, Any]:
        """Simple extractive summarization"""
        loop = asyncio.get_event_loop()

        def _summarize():
            blob = TextBlob(text)
            sentences = blob.sentences

            if len(sentences) <= 2:
                summary = text[:max_length]
                if len(text) > max_length:
                    summary = summary.rsplit(' ', 1)[0] + "..."
                return {
                    "summary": summary,
                    "original_length": len(text),
                    "summary_length": len(summary),
                    "compression_ratio": round(len(summary) / len(text), 3)
                }

            # Score sentences by position and keyword frequency
            word_freq = {}
            for word in blob.words.lower():
                if len(word) > 3:
                    word_freq[word] = word_freq.get(word, 0) + 1

            sentence_scores = []
            for i, sentence in enumerate(sentences):
                score = 0
                # Position bonus (first sentences more important)
                score += (len(sentences) - i) / len(sentences)

                # Word frequency score
                for word in sentence.words.lower():
                    score += word_freq.get(word, 0)

                sentence_scores.append((i, score, str(sentence)))

            # Sort by score and take top sentences
            sentence_scores.sort(key=lambda x: x[1], reverse=True)
            top_sentences = sorted(sentence_scores[:3], key=lambda x: x[0])  # Keep original order

            summary = " ".join([s[2] for s in top_sentences])

            # Truncate if still too long
            if len(summary) > max_length:
                summary = summary[:max_length].rsplit(' ', 1)[0] + "..."

            return {
                "summary": summary,
                "original_length": len(text),
                "summary_length": len(summary),
                "compression_ratio": round(len(summary) / len(text), 3)
            }

        return await loop.run_in_executor(_executor, _summarize)

    async def _summarize_transformers(self, text: str, max_length: int, min_length: int) -> Dict[str, Any]:
        """Summarize using transformers"""
        loop = asyncio.get_event_loop()

        def _summarize():
            # Truncate input for model
            truncated = text[:1024]
            result = self.summarizer(
                truncated,
                max_length=max_length,
                min_length=min_length,
                do_sample=False
            )[0]

            summary = result["summary_text"]
            return {
                "summary": summary,
                "original_length": len(text),
                "summary_length": len(summary),
                "compression_ratio": round(len(summary) / len(text), 3)
            }

        return await loop.run_in_executor(_executor, _summarize)

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for texts (placeholder - would use sentence-transformers)"""
        # In production, use sentence-transformers or similar
        # For now, return simple bag-of-words style vectors
        loop = asyncio.get_event_loop()

        def _embed():
            embeddings = []
            for text in texts:
                if not text:
                    embeddings.append([0.0] * 384)
                    continue

                blob = TextBlob(text.lower())
                # Simple hash-based embedding
                vec = [0.0] * 384
                for word in blob.words:
                    idx = hash(word) % 384
                    vec[idx] += 1.0

                # Normalize
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = [v / norm for v in vec]

                embeddings.append(vec)

            return embeddings

        return await loop.run_in_executor(_executor, _embed)

    async def get_recommendations(
        self,
        user_id: str,
        context: Dict = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get personalized recommendations (placeholder for collaborative filtering)"""
        # In production, this would use user history and collaborative filtering
        # For now, return empty list as we don't have user data
        return []


def _get_language_name(code: str) -> str:
    """Get full language name from code"""
    languages = {
        "en": "English",
        "es": "Spanish",
        "fr": "French",
        "de": "German",
        "it": "Italian",
        "pt": "Portuguese",
        "ru": "Russian",
        "ja": "Japanese",
        "ko": "Korean",
        "zh-cn": "Chinese (Simplified)",
        "zh-tw": "Chinese (Traditional)",
        "ar": "Arabic",
        "hi": "Hindi",
        "nl": "Dutch",
        "pl": "Polish",
        "tr": "Turkish",
        "vi": "Vietnamese",
        "th": "Thai",
        "sv": "Swedish",
        "da": "Danish",
        "fi": "Finnish",
        "no": "Norwegian",
        "cs": "Czech",
        "el": "Greek",
        "he": "Hebrew",
        "id": "Indonesian",
        "ms": "Malay",
        "ro": "Romanian",
        "uk": "Ukrainian",
    }
    return languages.get(code, code.upper())
