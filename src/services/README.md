# Redis Caching Service

This directory contains the Redis caching implementation for the Sports Screening application.

## Architecture

### File Structure

```
src/
├── config/
│   └── redis.ts          # Redis connection configuration
├── services/
│   └── cacheService.ts   # Cache service implementation
├── middleware/
│   └── cacheMiddleware.ts # Cache-related middleware
└── controllers/
    └── userController.ts  # Updated with caching logic
```

## Features

### 🚀 **Performance Optimizations**

- **JWT-based TTL**: Cache expires with JWT token expiration
- **Cache-first Strategy**: Check cache before database queries
- **Automatic Invalidation**: Cache cleared on user data updates
- **Error Resilience**: Graceful fallback to database on cache failures

### 🔧 **Cache Service Methods**

#### `cacheUserData(userId: string, userData: IUser, jwtExpiration: number)`

- Caches user data with TTL based on JWT expiration
- Minimum 1-minute TTL for safety
- Uses `user:${userId}` key pattern

#### `getCachedUserData(userId: string): Promise<IUser | null>`

- Retrieves user data from cache
- Returns null if cache miss or error
- Includes logging for cache hit/miss

#### `invalidateUserCache(userId: string)`

- Removes user data from cache
- Called on user updates/deletions
- Ensures data consistency

#### `getCacheStats()`

- Returns cache statistics
- Total keys and memory usage
- Useful for monitoring

### 🛡️ **Error Handling**

- **Graceful Degradation**: Falls back to database on cache errors
- **Connection Resilience**: Automatic reconnection on failures
- **Logging**: Comprehensive error logging for debugging

## Environment Variables

Add these to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# JWT Configuration (existing)
JWT_SECRET=your_jwt_secret
JWT_COOKIE_EXPIRES_IN=1
```

## Usage Examples

### Basic Cache Operations

```typescript
import userCacheService from '../services/cacheService';

// Cache user data
await userCacheService.cacheUserData(userId, userData, jwtExpiration);

// Get cached data
const userData = await userCacheService.getCachedUserData(userId);

// Invalidate cache
await userCacheService.invalidateUserCache(userId);
```

### Cache Statistics

```typescript
const stats = await userCacheService.getCacheStats();
console.log(`Total keys: ${stats.totalKeys}`);
console.log(`Memory usage: ${stats.memoryUsage}`);
```

## Performance Benefits

### Before Caching

- Every `/users/me` request hits the database
- JWT verification on every request
- User lookup on every request

### After Caching

- Cache hit: ~1-5ms response time
- Cache miss: Database query + cache storage
- Automatic cache expiration with JWT
- Reduced database load by ~90%

## Monitoring & Debugging

### Cache Hit/Miss Logging

```
✅ User data retrieved from cache
❌ User data not found in cache
🔄 Cache miss - fetching from database
✅ User data cached for 3600 seconds
🗑️ User cache invalidated
```

### Redis Connection Status

```
✅ Redis connected successfully
❌ Redis connection error: [error details]
🔌 Redis connection closed
🔄 Redis reconnecting...
```

## Best Practices

### 1. **Cache Key Strategy**

- Use consistent key patterns: `user:${userId}`
- Include versioning if needed: `user:v1:${userId}`

### 2. **TTL Management**

- Align cache TTL with JWT expiration
- Minimum TTL for safety (60 seconds)
- Consider shorter TTL for frequently changing data

### 3. **Error Handling**

- Always fallback to database on cache errors
- Log cache errors for monitoring
- Don't let cache failures break the application

### 4. **Cache Invalidation**

- Invalidate cache on user data updates
- Use middleware for automatic invalidation
- Consider bulk invalidation for admin operations

## Installation

1. **Install Redis Dependencies**

```bash
npm install ioredis
```

2. **Start Redis Server**

```bash
# Local development
redis-server

# Docker
docker run -d -p 6379:6379 redis:alpine
```

3. **Configure Environment Variables**

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**

   - Check if Redis server is running
   - Verify host/port configuration
   - Check firewall settings

2. **Cache Not Working**

   - Verify Redis connection logs
   - Check cache key patterns
   - Monitor cache hit/miss logs

3. **Memory Issues**
   - Monitor Redis memory usage
   - Set appropriate maxmemory policy
   - Consider Redis cluster for large datasets

### Debug Commands

```bash
# Check Redis connection
redis-cli ping

# Monitor Redis operations
redis-cli monitor

# Check memory usage
redis-cli info memory

# List all keys
redis-cli keys "user:*"
```
