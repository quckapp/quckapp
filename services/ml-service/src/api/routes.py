import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Query
from pydantic import BaseModel, Field

from services.ml_models import MLModels
from services.databricks_client import DatabricksClient
from services.cache import get_cache, MLCache

logger = logging.getLogger(__name__)

router = APIRouter()

# Global instances (set by main.py)
_ml_models: Optional[MLModels] = None
_databricks_client: Optional[DatabricksClient] = None


def set_ml_models(models: MLModels):
    global _ml_models
    _ml_models = models


def set_databricks_client(client: DatabricksClient):
    global _databricks_client
    _databricks_client = client


def get_ml_models() -> MLModels:
    if _ml_models is None:
        raise HTTPException(status_code=503, detail="ML models not initialized")
    return _ml_models


def get_databricks() -> DatabricksClient:
    if _databricks_client is None:
        raise HTTPException(status_code=503, detail="Databricks client not initialized")
    return _databricks_client


# ==================== Request/Response Models ====================

class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    language: Optional[str] = None


class SentimentResponse(BaseModel):
    sentiment: str
    confidence: float
    scores: Dict[str, float]
    subjectivity: Optional[float] = None


class ContentModerationRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=50000)
    content_type: str = Field(default="text", description="Type: text, image_url")


class ContentModerationResponse(BaseModel):
    is_safe: bool
    categories: Dict[str, Any]
    flagged_terms: List[str] = []


class SmartReplyRequest(BaseModel):
    conversation_history: List[Dict[str, Any]] = Field(
        ...,
        min_length=1,
        description="List of messages with 'role' and 'content' fields"
    )
    context: Dict[str, Any] = Field(default_factory=dict)


class RecommendationRequest(BaseModel):
    user_id: str
    context: Dict[str, Any] = Field(default_factory=dict)
    limit: int = Field(default=10, ge=1, le=50)


class TranscriptionRequest(BaseModel):
    audio_url: str
    language: Optional[str] = None


class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    max_length: int = Field(default=150, ge=50, le=500)
    min_length: int = Field(default=30, ge=10, le=100)


class TrainingJobRequest(BaseModel):
    model_type: str
    dataset_path: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class EmbeddingsRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=100)


class MLResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    cached: bool = False
    processing_time_ms: Optional[float] = None


# ==================== ML Endpoints ====================

@router.post("/sentiment", response_model=MLResponse)
async def analyze_sentiment(
    request: TextAnalysisRequest,
    use_cache: bool = Query(default=True),
):
    """Analyze text sentiment using ML models"""
    start_time = datetime.now()
    models = get_ml_models()
    cache = await get_cache()

    # Check cache
    if use_cache:
        cached = await cache.get("sentiment", request.text)
        if cached:
            return MLResponse(
                success=True,
                data=cached,
                cached=True,
                processing_time_ms=0,
            )

    try:
        result = await models.analyze_sentiment(request.text)

        # Cache result
        if use_cache:
            await cache.set("sentiment", request.text, result)

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        return MLResponse(
            success=True,
            data=result,
            cached=False,
            processing_time_ms=round(processing_time, 2),
        )

    except Exception as e:
        logger.error(f"Sentiment analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/content-moderation", response_model=MLResponse)
async def moderate_content(
    request: ContentModerationRequest,
    use_cache: bool = Query(default=True),
):
    """Check content for inappropriate material"""
    start_time = datetime.now()
    models = get_ml_models()
    cache = await get_cache()

    # Check cache
    if use_cache:
        cached = await cache.get("moderation", request.content)
        if cached:
            return MLResponse(success=True, data=cached, cached=True)

    try:
        result = await models.moderate_content(request.content, request.content_type)

        # Cache result
        if use_cache:
            await cache.set("moderation", request.content, result)

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        return MLResponse(
            success=True,
            data=result,
            cached=False,
            processing_time_ms=round(processing_time, 2),
        )

    except Exception as e:
        logger.error(f"Content moderation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/smart-reply", response_model=MLResponse)
async def get_smart_replies(request: SmartReplyRequest):
    """Generate smart reply suggestions based on conversation"""
    start_time = datetime.now()
    models = get_ml_models()

    try:
        suggestions = await models.generate_smart_replies(
            request.conversation_history,
            request.context,
        )

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        return MLResponse(
            success=True,
            data={"suggestions": suggestions},
            processing_time_ms=round(processing_time, 2),
        )

    except Exception as e:
        logger.error(f"Smart reply error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendations", response_model=MLResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get personalized recommendations for user"""
    start_time = datetime.now()
    models = get_ml_models()

    try:
        recommendations = await models.get_recommendations(
            request.user_id,
            request.context,
            request.limit,
        )

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        return MLResponse(
            success=True,
            data={
                "user_id": request.user_id,
                "recommendations": recommendations,
                "generated_at": datetime.now().isoformat(),
            },
            processing_time_ms=round(processing_time, 2),
        )

    except Exception as e:
        logger.error(f"Recommendations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe", response_model=MLResponse)
async def transcribe_audio(request: TranscriptionRequest):
    """Transcribe audio to text (placeholder - requires speech model)"""
    # This would integrate with Azure Speech Services or Whisper
    return MLResponse(
        success=True,
        data={
            "transcription": "[Audio transcription requires speech model integration]",
            "language": request.language or "en",
            "confidence": 0.0,
            "note": "Speech-to-text integration pending",
        },
    )


@router.post("/entity-extraction", response_model=MLResponse)
async def extract_entities(
    request: TextAnalysisRequest,
    use_cache: bool = Query(default=True),
):
    """Extract named entities from text"""
    start_time = datetime.now()
    models = get_ml_models()
    cache = await get_cache()

    # Check cache
    if use_cache:
        cached = await cache.get("entities", request.text)
        if cached:
            return MLResponse(success=True, data=cached, cached=True)

    try:
        entities = await models.extract_entities(request.text)

        result = {
            "entities": entities,
            "text": request.text,
            "entity_count": len(entities),
        }

        # Cache result
        if use_cache:
            await cache.set("entities", request.text, result)

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        return MLResponse(
            success=True,
            data=result,
            cached=False,
            processing_time_ms=round(processing_time, 2),
        )

    except Exception as e:
        logger.error(f"Entity extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/language-detection", response_model=MLResponse)
async def detect_language(
    request: TextAnalysisRequest,
    use_cache: bool = Query(default=True),
):
    """Detect language of text"""
    start_time = datetime.now()
    models = get_ml_models()
    cache = await get_cache()

    # Check cache
    if use_cache:
        cached = await cache.get("language", request.text)
        if cached:
            return MLResponse(success=True, data=cached, cached=True)

    try:
        result = await models.detect_language(request.text)

        # Cache result
        if use_cache:
            await cache.set("language", request.text, result)

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        return MLResponse(
            success=True,
            data=result,
            cached=False,
            processing_time_ms=round(processing_time, 2),
        )

    except Exception as e:
        logger.error(f"Language detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarize", response_model=MLResponse)
async def summarize_text(
    request: SummarizeRequest,
    use_cache: bool = Query(default=True),
):
    """Summarize long text"""
    start_time = datetime.now()
    models = get_ml_models()
    cache = await get_cache()

    cache_key = f"{request.text}:{request.max_length}:{request.min_length}"

    # Check cache
    if use_cache:
        cached = await cache.get("summary", cache_key)
        if cached:
            return MLResponse(success=True, data=cached, cached=True)

    try:
        result = await models.summarize(
            request.text,
            request.max_length,
            request.min_length,
        )

        # Cache result
        if use_cache:
            await cache.set("summary", cache_key, result)

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        return MLResponse(
            success=True,
            data=result,
            cached=False,
            processing_time_ms=round(processing_time, 2),
        )

    except Exception as e:
        logger.error(f"Summarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embeddings", response_model=MLResponse)
async def get_embeddings(request: EmbeddingsRequest):
    """Get embeddings for texts"""
    start_time = datetime.now()
    models = get_ml_models()

    try:
        embeddings = await models.get_embeddings(request.texts)

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        return MLResponse(
            success=True,
            data={
                "embeddings": embeddings,
                "dimensions": len(embeddings[0]) if embeddings else 0,
                "count": len(embeddings),
            },
            processing_time_ms=round(processing_time, 2),
        )

    except Exception as e:
        logger.error(f"Embeddings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Azure Databricks Integration Endpoints ====================

@router.post("/databricks/jobs/submit", response_model=MLResponse)
async def submit_databricks_job(
    request: TrainingJobRequest,
    background_tasks: BackgroundTasks,
):
    """Submit a training job to Azure Databricks"""
    client = get_databricks()

    try:
        # Map model type to Databricks job ID (configured externally)
        job_mapping = {
            "sentiment": int(os.getenv("DATABRICKS_SENTIMENT_JOB_ID", 0)),
            "moderation": int(os.getenv("DATABRICKS_MODERATION_JOB_ID", 0)),
            "ner": int(os.getenv("DATABRICKS_NER_JOB_ID", 0)),
            "custom": int(os.getenv("DATABRICKS_CUSTOM_JOB_ID", 0)),
        }

        job_id = job_mapping.get(request.model_type, 0)
        if not job_id:
            return MLResponse(
                success=False,
                data={
                    "error": f"Unknown model type: {request.model_type}",
                    "available_types": list(job_mapping.keys()),
                },
            )

        result = await client.submit_job(
            job_id,
            {
                "dataset_path": request.dataset_path,
                **request.parameters,
            },
        )

        if "error" in result:
            return MLResponse(success=False, data=result)

        return MLResponse(
            success=True,
            data={
                "run_id": result.get("run_id"),
                "status": result.get("status"),
                "model_type": request.model_type,
                "submitted_at": datetime.now().isoformat(),
            },
        )

    except Exception as e:
        logger.error(f"Databricks job submission error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/databricks/jobs/{run_id}", response_model=MLResponse)
async def get_job_status(run_id: int):
    """Get status of a Databricks job run"""
    client = get_databricks()

    try:
        result = await client.get_run_status(run_id)

        if "error" in result:
            return MLResponse(success=False, data=result)

        return MLResponse(success=True, data=result)

    except Exception as e:
        logger.error(f"Databricks job status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/databricks/models", response_model=MLResponse)
async def list_models():
    """List available ML models from Databricks MLflow registry"""
    client = get_databricks()

    try:
        models = await client.list_models()

        return MLResponse(
            success=True,
            data={
                "models": models,
                "count": len(models),
                "fetched_at": datetime.now().isoformat(),
            },
        )

    except Exception as e:
        logger.error(f"Databricks models list error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/databricks/query", response_model=MLResponse)
async def query_databricks(
    query: str = Query(..., description="SQL query to execute"),
    warehouse_id: Optional[str] = Query(default=None),
):
    """Execute SQL query on Databricks SQL warehouse"""
    client = get_databricks()

    try:
        result = await client.execute_sql(query, warehouse_id)

        if "error" in result:
            return MLResponse(success=False, data=result)

        return MLResponse(
            success=True,
            data={
                "results": result.get("result", {}).get("data_array", []),
                "schema": result.get("manifest", {}).get("schema", {}),
                "row_count": result.get("result", {}).get("row_count", 0),
                "execution_time_ms": result.get("result", {}).get("total_duration_ms", 0),
            },
        )

    except Exception as e:
        logger.error(f"Databricks query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Cache Management ====================

@router.get("/cache/stats", response_model=MLResponse)
async def get_cache_stats():
    """Get ML prediction cache statistics"""
    cache = await get_cache()
    stats = await cache.get_stats()

    return MLResponse(success=True, data=stats)


@router.delete("/cache/{prediction_type}")
async def clear_cache(prediction_type: str):
    """Clear cached predictions of a specific type"""
    valid_types = ["sentiment", "moderation", "language", "entities", "summary", "embeddings", "all"]

    if prediction_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type. Valid types: {valid_types}",
        )

    cache = await get_cache()

    if prediction_type == "all":
        for t in valid_types[:-1]:
            await cache.clear_type(t)
    else:
        await cache.clear_type(prediction_type)

    return MLResponse(
        success=True,
        data={"message": f"Cache cleared for: {prediction_type}"},
    )


# Import os for env vars in databricks endpoints
import os
