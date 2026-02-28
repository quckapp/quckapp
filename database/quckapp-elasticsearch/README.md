# QuckApp Elasticsearch

Full-text search and indexing layer for QuckApp. Provides search across messages, users, and channels.

## Structure

```
quckapp-elasticsearch/
  mappings/         # Index mapping definitions
  settings/         # Analyzer and index settings
  templates/        # Index templates for time-series indices
  ilm/              # Index Lifecycle Management policies
  scripts/          # Setup and maintenance scripts
  docker/           # Development configuration
```

## Indices

| Index       | Purpose                        |
|-------------|--------------------------------|
| `users`     | User profile search            |
| `channels`  | Channel name/description search|
| `message-*` | Message full-text search (ILM) |

## Quick Start

```bash
# Start Elasticsearch
docker run -d --name quckapp-es \
  -p 9200:9200 -p 9300:9300 \
  -v $(pwd)/docker/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml \
  elasticsearch:8.12.0

# Run setup
./scripts/setup.sh

# Verify
curl http://localhost:9200/_cat/indices?v
```

## ILM Policy

Messages use a rolling index strategy:
- **Hot phase**: Active writes, rolls over after 7 days or 50 GB
- **Warm phase**: Force-merged, shrunk to 1 shard after 7 days
- **Delete phase**: Removed after 90 days

## Reindexing

Zero-downtime reindex with alias swap:

```bash
./scripts/reindex.sh users users_v2 users
```
