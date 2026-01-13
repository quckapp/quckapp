# QuickChat ML Service

Real-time Machine Learning inference API for QuickChat, providing sentiment analysis, smart replies, content moderation, and more.

## Related Services

| Service | Purpose | Relationship |
|---------|---------|--------------|
| **spark-etl** | Batch ETL pipeline | Generates ML features consumed by this service |
| **message-service** | Message handling | Calls ML service for sentiment & smart replies |
| **moderation-service** | Content moderation | Uses ML service for content classification |

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   spark-etl    │────▶│   Gold Layer    │────▶│   ml-service    │
│  (Batch ETL)   │     │  (Features DB)  │     │  (This Service) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Features

- **Sentiment Analysis** - Analyze message sentiment (positive/neutral/negative)
- **Content Moderation** - Detect harmful or inappropriate content
- **Smart Reply** - Generate contextual reply suggestions
- **Entity Extraction** - Extract named entities from text
- **Language Detection** - Identify message language
- **Text Summarization** - Summarize long conversations
- **Embeddings** - Generate text embeddings for similarity search

## Tech Stack

- **Python 3.12** with FastAPI
- **Transformers** (Hugging Face) for ML models
- **Databricks** integration for feature store
- **Redis** for caching predictions
- **Prometheus** for metrics

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/ml/sentiment` | POST | Analyze text sentiment |
| `/api/v1/ml/moderate` | POST | Check content for moderation |
| `/api/v1/ml/smart-reply` | POST | Generate reply suggestions |
| `/api/v1/ml/entities` | POST | Extract named entities |
| `/api/v1/ml/detect-language` | POST | Detect text language |
| `/api/v1/ml/summarize` | POST | Summarize text |
| `/api/v1/ml/embeddings` | POST | Generate text embeddings |
| `/health` | GET | Health check |
| `/health/ready` | GET | Readiness check |
| `/health/live` | GET | Liveness check |
| `/models/info` | GET | Get loaded models info |
| `/metrics` | GET | Prometheus metrics |

## Quick Start

### Prerequisites

- Python 3.12+
- Redis (optional, for caching)
- Databricks account (optional, for feature store)

### Installation

```bash
cd services/ml-service
pip install -r requirements.txt
```

### Run Locally

```bash
# Development mode
python src/main.py

# Or with uvicorn
uvicorn src.main:app --reload --port 5008
```

### Run with Docker

```bash
docker build -t ml-service .
docker run -p 5008:5008 ml-service
```

## Environment Variables

```bash
# Server
PORT=5008
ENVIRONMENT=development
CORS_ORIGINS=*

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Databricks (optional)
DATABRICKS_HOST=https://your-workspace.azuredatabricks.net
DATABRICKS_TOKEN=your-token
```

## Integration with spark-etl

The spark-etl pipeline generates ML features in the Gold layer:

1. **User Engagement Scores** - Used for personalized recommendations
2. **Activity Features** - Messages, calls by time window
3. **Social Features** - Contacts, groups participation
4. **Temporal Features** - Preferred hours, weekday ratio

These features are stored in Databricks Feature Store and consumed by ml-service for real-time predictions.

## License

MIT License - QuickChat Team
