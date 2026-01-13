---
sidebar_position: 6
title: Service Discovery & Secrets
description: Consul and HashiCorp Vault configuration
---

# Service Discovery & Secrets Management

QuckChat uses Consul for service discovery and health checks, and HashiCorp Vault for secrets management.

## Consul - Service Discovery

### Configuration

```env
CONSUL_HOST=localhost
CONSUL_PORT=8500
CONSUL_SERVICE_NAME=quckchat-backend
CONSUL_SERVICE_PORT=3000
CONSUL_HEALTH_CHECK_INTERVAL=10s
```

### Service Registration

```typescript
import * as Consul from 'consul';

const consul = new Consul({
  host: 'localhost',
  port: 8500
});

// Register service
await consul.agent.service.register({
  name: 'quckchat-backend',
  id: 'quckchat-backend-1',
  address: '192.168.1.10',
  port: 3000,
  check: {
    http: 'http://192.168.1.10:3000/health',
    interval: '10s'
  }
});
```

### Service Discovery

```typescript
// Get healthy instances of a service
const services = await consul.health.service({
  service: 'quckchat-auth',
  passing: true
});

const authServiceUrl = `http://${services[0].Service.Address}:${services[0].Service.Port}`;
```

### Health Checks

Consul monitors service health with:

- HTTP health checks
- TCP checks
- TTL checks
- Script checks

### Key-Value Store

```typescript
// Store configuration
await consul.kv.set('config/database/host', 'mongodb://...');

// Get configuration
const { Value } = await consul.kv.get('config/database/host');
```

## HashiCorp Vault - Secrets Management

### Configuration

```env
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=your-vault-token
VAULT_NAMESPACE=quckchat
```

### Features

- Dynamic secrets
- Secret rotation
- Access policies
- Audit logging
- Encryption as a service

### Usage

```typescript
import * as vault from 'node-vault';

const client = vault({
  apiVersion: 'v1',
  endpoint: 'http://localhost:8200',
  token: process.env.VAULT_TOKEN
});

// Read secrets
const { data } = await client.read('secret/data/database');
const { username, password } = data.data;

// Write secrets
await client.write('secret/data/api-keys', {
  data: {
    firebase: 'xxx',
    twilio: 'yyy'
  }
});
```

### Secret Paths

| Path | Contents |
|------|----------|
| `secret/database` | MongoDB, Redis credentials |
| `secret/api-keys` | Third-party API keys |
| `secret/jwt` | JWT signing keys |
| `secret/encryption` | Encryption keys |
| `secret/oauth` | OAuth client secrets |

### Dynamic Secrets

Vault can generate dynamic credentials:

```typescript
// Generate temporary MongoDB credentials
const { data } = await client.read('database/creds/readonly');
const { username, password, lease_id } = data;

// Revoke when done
await client.revoke({ lease_id });
```

### Transit Engine (Encryption)

```typescript
// Encrypt data
const { data: encrypted } = await client.write('transit/encrypt/quckchat', {
  plaintext: Buffer.from('sensitive data').toString('base64')
});

// Decrypt data
const { data: decrypted } = await client.write('transit/decrypt/quckchat', {
  ciphertext: encrypted.ciphertext
});
```

## Best Practices

### Consul

1. **Health Checks**: Implement comprehensive health endpoints
2. **Service Tags**: Use tags for environment/version filtering
3. **DNS Integration**: Use Consul DNS for service resolution
4. **ACLs**: Enable ACLs in production

### Vault

1. **Least Privilege**: Use minimal access policies
2. **Secret Rotation**: Rotate secrets regularly
3. **Audit Logging**: Enable audit logs
4. **Seal/Unseal**: Automate unsealing in production
5. **Dynamic Secrets**: Prefer dynamic over static secrets
