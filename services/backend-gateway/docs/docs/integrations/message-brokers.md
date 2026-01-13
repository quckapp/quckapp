---
sidebar_position: 5
title: Message Brokers
description: Kafka, RabbitMQ, and BullMQ configuration
---

# Message Brokers

QuckChat uses multiple message brokers for different use cases: Kafka for event streaming, RabbitMQ for reliable queuing, and BullMQ for job processing.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE BROKER LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │    Kafka      │  │   RabbitMQ    │  │    BullMQ     │       │
│  │  (Streaming)  │  │   (Queuing)   │  │    (Jobs)     │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Event Topics  │  │ Task Queues   │  │  Job Queues   │       │
│  │ user.*        │  │ notifications │  │ email         │       │
│  │ message.*     │  │ media-process │  │ media         │       │
│  │ call.*        │  │ analytics     │  │ reports       │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Apache Kafka

### Configuration

```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=quckchat-backend
KAFKA_GROUP_ID=quckchat-consumers
KAFKA_SASL_MECHANISM=plain
KAFKA_SASL_USERNAME=
KAFKA_SASL_PASSWORD=
```

### Topics

| Topic | Purpose |
|-------|---------|
| `user.created` | New user registration |
| `user.updated` | Profile updates |
| `user.online` | Online status changes |
| `message.sent` | New messages |
| `message.read` | Read receipts |
| `message.reaction` | Message reactions |
| `conversation.created` | New conversations |
| `call.initiated` | Call started |
| `call.ended` | Call ended |
| `notification.send` | Notification requests |

### Producer

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'quckchat-backend',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

await producer.send({
  topic: 'message.sent',
  messages: [
    { key: conversationId, value: JSON.stringify(message) }
  ]
});
```

### Consumer

```typescript
const consumer = kafka.consumer({ groupId: 'notifications-service' });

await consumer.subscribe({ topic: 'message.sent' });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const data = JSON.parse(message.value.toString());
    await this.notificationsService.sendPush(data);
  }
});
```

## RabbitMQ

### Configuration

```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_QUEUE_PREFIX=quckchat
RABBITMQ_EXCHANGE=quckchat.events
```

### Queues

| Queue | Purpose |
|-------|---------|
| `notifications` | Push notification delivery |
| `media-processing` | Image/video processing |
| `email` | Email sending |
| `sms` | SMS delivery |
| `analytics` | Analytics event processing |

### Publisher

```typescript
import { connect } from 'amqplib';

const connection = await connect('amqp://localhost');
const channel = await connection.createChannel();

await channel.assertQueue('notifications', { durable: true });
channel.sendToQueue('notifications', Buffer.from(JSON.stringify(payload)), {
  persistent: true
});
```

### Consumer

```typescript
await channel.consume('notifications', async (msg) => {
  const payload = JSON.parse(msg.content.toString());
  await processNotification(payload);
  channel.ack(msg);
});
```

## BullMQ

### Configuration

```env
REDIS_HOST=localhost
REDIS_PORT=6379
BULL_BOARD_ENABLED=true
BULL_BOARD_PATH=/admin/queues
```

### Queues

| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| `email` | Email sending | 5 |
| `push` | Push notifications | 10 |
| `media` | Media processing | 3 |
| `reports` | Report generation | 2 |
| `cleanup` | Data cleanup | 1 |

### Job Producer

```typescript
import { Queue } from 'bullmq';

const emailQueue = new Queue('email', {
  connection: { host: 'localhost', port: 6379 }
});

await emailQueue.add('send-welcome', {
  to: 'user@example.com',
  template: 'welcome'
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 }
});
```

### Job Worker

```typescript
import { Worker } from 'bullmq';

const worker = new Worker('email', async (job) => {
  const { to, template } = job.data;
  await sendEmail(to, template);
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 5
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

### Bull Board UI

Access the job monitoring dashboard at:

```
http://localhost:3000/admin/queues
```

## Use Case Summary

| Broker | Use Case | Characteristics |
|--------|----------|-----------------|
| **Kafka** | Event streaming | High throughput, ordered, persistent |
| **RabbitMQ** | Task queuing | Reliable delivery, routing, acknowledgments |
| **BullMQ** | Job processing | Retries, scheduling, priorities, UI |

## Best Practices

1. **Idempotency**: Make consumers idempotent
2. **Dead Letter Queues**: Handle failed messages
3. **Monitoring**: Monitor queue depths and processing times
4. **Backpressure**: Implement rate limiting
5. **Serialization**: Use consistent message formats (JSON)
