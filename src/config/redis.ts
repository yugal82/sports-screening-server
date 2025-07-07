import Redis from 'ioredis';

// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    db: Number(process.env.REDIS_DB) || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    showFriendlyErrorStack: process.env.NODE_ENV === 'development'
};

// Create Redis client
const redis = new Redis(redisConfig);

// Handle Redis connection events
redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
});

redis.on('error', (error: Error) => {
    console.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
    console.log('🔌 Redis connection closed');
});

redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
});

export default redis; 