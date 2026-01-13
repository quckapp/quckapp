---
sidebar_position: 7
title: Algorithms & Patterns
description: Algorithms, data structures, and design patterns used in QuckChat
---

# Algorithms & Design Patterns

This document outlines the algorithms, data structures, design principles, and patterns implemented throughout QuckChat.

## Algorithms Implemented

### Backend Algorithms

#### 1. Priority Queue (Binary Heap)
**File**: `src/common/queue/notification-queue.service.ts`
- **Algorithm**: Binary Heap (Max Heap for priorities)
- **Time Complexity**: O(log n) for enqueue/dequeue
- **Use Case**: Notification queue with priority levels (LOW, NORMAL, HIGH, URGENT)

```typescript
enqueue(job: NotificationJob): void {
  this.queue.push(job);
  this.bubbleUp(this.queue.length - 1); // Maintain heap property
}
```

#### 2. Trie (Prefix Tree)
**File**: `src/common/search/trie.service.ts`
- **Algorithm**: Trie with DFS traversal
- **Time Complexity**: O(m) for insert/search where m is string length
- **Use Case**: User search autocomplete, fast prefix matching

```typescript
searchByPrefix(prefix: string, limit: number = 10): any[] {
  const node = this.findNode(prefix);
  const results: Array<{ data: any; frequency: number }> = [];
  this.collectWords(node, results);  // DFS traversal
  return results
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, limit);
}
```

#### 3. Levenshtein Distance (Edit Distance)
**File**: `src/common/search/trie.service.ts`
- **Algorithm**: Dynamic Programming
- **Time Complexity**: O(m * n) where m, n are string lengths
- **Use Case**: Fuzzy search, typo tolerance

```typescript
private levenshteinDistance(str1: string, str2: string): number {
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = str1[i-1] === str2[j-1] ? dp[i-1][j-1] :
                 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}
```

#### 4. Cache with TTL (Time To Live)
**File**: `src/common/cache/cache.service.ts`
- **Data Structure**: Map with expiry timestamps
- **Time Complexity**: O(1) for get/set
- **Algorithm**: Automatic cleanup with periodic sweep

```typescript
get<T>(key: string): T | null {
  const entry = this.cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    this.cache.delete(key);
    return null;
  }
  return entry.value;
}
```

## Data Structures

### Backend Data Structures

| Data Structure | File | Time Complexity | Use Case |
|----------------|------|-----------------|----------|
| **Map** | cache.service.ts | O(1) get/set | Cache with TTL |
| **Binary Heap** | notification-queue.service.ts | O(log n) enqueue/dequeue | Priority queue |
| **Trie** | trie.service.ts | O(m) search | Prefix search |
| **Set** | Multiple | O(1) add/has | Tracking connections |
| **WeakMap** | - | O(1) | Circular reference handling |

### Mobile Data Structures

| Data Structure | File | Time Complexity | Use Case |
|----------------|------|-----------------|----------|
| **Map** | MessageManager.ts | O(1) lookup | Message storage |
| **Set** | MessageManager.ts | O(1) membership | Unread tracking |
| **LRU Cache** | algorithms.ts | O(1) get/put | Image caching |
| **Priority Queue** | dataStructures.ts | O(log n) | Message priority |

## Design Principles

### 1. DRY (Don't Repeat Yourself)
- **Custom Hooks**: Reusable logic in `mobile/src/hooks/`
- **Utility Functions**: Shared algorithms in `src/common/utils/`
- **Service Classes**: Reusable services in `src/common/`

### 2. KISS (Keep It Simple, Stupid)
- Simple, focused functions
- Clear naming conventions
- Minimal complexity

### 3. YAGNI (You Aren't Gonna Need It)
- Implement only what's needed now
- Avoid premature optimization
- Add features when required

### 4. Separation of Concerns
- **Backend**:
  - Services: Business logic
  - Gateways: Socket handling
  - Repositories: Data access
  - DTOs: Data transfer objects

## SOLID Principles

### 1. Single Responsibility Principle (SRP)
- `CacheService`: Only handles caching
- `NotificationQueueService`: Only manages notification queue
- `TrieService`: Only provides search functionality

### 2. Open/Closed Principle (OCP)
```typescript
// Base repository can be extended
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
}

export interface ISearchableRepository<T> extends IRepository<T> {
  search(query: string): Promise<T[]>;
}
```

### 3. Liskov Substitution Principle (LSP)
```typescript
// Any repository implementing IRepository can be used
class MongoRepository<T> implements IRepository<T> { }
class PostgresRepository<T> implements IRepository<T> { }
```

### 4. Interface Segregation Principle (ISP)
```typescript
// Clients only depend on what they need
export interface IRepository<T> { ... }
export interface ISearchableRepository<T> extends IRepository<T> { ... }
export interface ICacheableRepository<T> extends IRepository<T> { ... }
```

### 5. Dependency Inversion Principle (DIP)
```typescript
// Depend on abstractions
constructor(private readonly logger: LoggerService) {}
```

## Design Patterns

### 1. Singleton Pattern
**Purpose**: Ensure single instance of managers

```typescript
class SocketManagerClass {
  private static instance: SocketManagerClass;

  static getInstance(): SocketManagerClass {
    if (!SocketManagerClass.instance) {
      SocketManagerClass.instance = new SocketManagerClass();
    }
    return SocketManagerClass.instance;
  }
}
```

### 2. Repository Pattern
**Purpose**: Abstract data access layer

### 3. Observer Pattern (Pub/Sub)
**Purpose**: Event-driven communication

```typescript
// Subscribe to events
socketManager.on('event', handler);

// Emit events
socketManager.emit('event', data);
```

### 4. Factory Pattern
**Use Case**: Creating socket connections

### 5. Strategy Pattern
**Use Case**: Different notification types, search strategies

### 6. Facade Pattern
**Purpose**: Simple interface for complex message operations

## Performance Optimizations

### Backend Optimizations

#### 1. Parallel Database Queries
```typescript
// Before: Sequential queries (400-500ms)
const message = await this.messagesService.findById(id);
const conversation = await this.conversationsService.findById(convId);

// After: Parallel queries (100-150ms)
const [message, conversation] = await Promise.all([
  this.messagesService.findById(id),
  this.conversationsService.findById(convId),
]);
```
**Impact**: 70-75% faster

#### 2. Async Notifications
```typescript
// Don't block response waiting for notifications
Promise.all([...]).then(() => {
  // Send notifications asynchronously
}).catch(err => this.logger.error(...));

return { success: true, message };  // Return immediately
```

#### 3. O(1) Reaction Lookup
```typescript
// Before: O(n*m) - Search all conversations and messages
// After: O(1) - Direct lookup with conversationId
const conversationId = data.conversationId || message.conversationId;
```
**Impact**: 50-100x faster for users with many conversations

#### 4. Socket Configuration
```typescript
{
  transports: ['websocket'],          // Fast WebSocket only
  pingInterval: 10000,                // 10s (was 25s)
  pingTimeout: 30000,                 // 30s (was 60s)
  perMessageDeflate: false,           // No compression for speed
}
```
**Impact**: 60% faster connection detection

## Performance Metrics

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Message Send | 400-500ms | 100-150ms | 70-75% faster |
| Reactions (100 convos) | 500-1000ms+ | 10-20ms | 50-100x faster |
| Socket Connection | 3-5s | 1-2s | 60% faster |
| User Search | O(n) | O(m) | Linear → Constant |
| Message Lookup | O(n) | O(1) | Linear → Constant |
| Cache Hit | - | &lt;1ms | Instant |

## Best Practices Applied

1. **Type Safety**: TypeScript throughout
2. **Error Handling**: Try-catch with proper logging
3. **Immutability**: Avoid state mutations
4. **Pure Functions**: Side-effect free utilities
5. **Documentation**: Inline comments with complexity
6. **Testing**: Testable, modular code
7. **Code Reuse**: DRY principle applied
8. **Performance**: O(1) operations where possible
9. **Scalability**: Efficient algorithms and data structures
10. **Maintainability**: SOLID principles followed
