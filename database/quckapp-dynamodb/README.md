# QuckApp DynamoDB

Key-value store for QuckApp session management and rate limiting. Uses TTL for automatic expiration of transient data.

## Structure

```
quckapp-dynamodb/
  tables/     # Table definition JSON files
  scripts/    # Table creation and seed utilities
  docker/     # LocalStack / DynamoDB Local init script
```

## Tables

| Table           | PK             | SK           | GSI          | TTL          | Purpose                  |
|-----------------|----------------|--------------|--------------|--------------|--------------------------|
| `user_sessions` | `user_id`      | `session_id` | `token-index`| `expires_at` | Active session tracking  |
| `rate_limits`   | `resource_key` | -            | -            | `expires_at` | API rate limit counters  |

## Quick Start

```bash
# Start DynamoDB Local
docker run -d --name quckapp-dynamodb \
  -p 8000:8000 \
  amazon/dynamodb-local:2.2.1

# Create tables and seed data
export DYNAMODB_ENDPOINT=http://localhost:8000
./scripts/create-tables.sh
./scripts/seed.sh

# Verify
aws dynamodb list-tables --endpoint-url http://localhost:8000 --region us-east-1
```

## Access Patterns

### user_sessions
- **Get all sessions for a user**: Query on `user_id`
- **Get specific session**: Query on `user_id` + `session_id`
- **Lookup by token**: Query GSI `token-index`
- **Expired sessions**: Automatically removed via TTL on `expires_at`

### rate_limits
- **Check rate limit**: GetItem on `resource_key` (e.g., `api:<user_id>:/api/messages`)
- **Increment counter**: UpdateItem with ADD expression
- **Window expiry**: Automatically removed via TTL on `expires_at`
