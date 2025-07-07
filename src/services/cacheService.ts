import redis from '../config/redis';
import { IUser } from '../utils/types';

// Cache service interface
interface CacheService {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}

// User cache service implementation
class UserCacheService implements CacheService {
    private readonly PREFIX = 'user:';
    private readonly DEFAULT_TTL = 3600; // 1 hour in seconds

    // Generate cache key for user data
    private generateKey(userId: string): string {
        return `${this.PREFIX}${userId}`;
    }

    // Get user data from cache
    async get(key: string): Promise<string | null> {
        try {
            return await redis.get(key);
        } catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }

    // Set user data in cache with TTL
    async set(key: string, value: string, ttl: number = this.DEFAULT_TTL): Promise<void> {
        try {
            await redis.setex(key, ttl, value);
        } catch (error) {
            console.error('Redis set error:', error);
        }
    }

    // Delete user data from cache
    async del(key: string): Promise<void> {
        try {
            await redis.del(key);
        } catch (error) {
            console.error('Redis del error:', error);
        }
    }

    // Check if key exists in cache
    async exists(key: string): Promise<boolean> {
        try {
            const result = await redis.exists(key);
            return result === 1;
        } catch (error) {
            console.error('Redis exists error:', error);
            return false;
        }
    }

    // Cache user data with JWT expiration
    async cacheUserData(userId: string, userData: IUser, jwtExpiration: number): Promise<void> {
        try {
            const key = this.generateKey(userId);
            const value = JSON.stringify(userData);

            // Calculate TTL based on JWT expiration
            const now = Math.floor(Date.now() / 1000);
            const ttl = Math.max(jwtExpiration - now, 60); // Minimum 1 minute TTL

            await this.set(key, value, ttl);
            console.log(`✅ User data cached for ${ttl} seconds`);
        } catch (error) {
            console.error('Cache user data error:', error);
        }
    }

    // Get cached user data
    async getCachedUserData(userId: string): Promise<IUser | null> {
        try {
            const key = this.generateKey(userId);
            const cachedData = await this.get(key);

            if (cachedData) {
                console.log('✅ User data retrieved from cache');
                return JSON.parse(cachedData) as IUser;
            }

            console.log('❌ User data not found in cache');
            return null;
        } catch (error) {
            console.error('Get cached user data error:', error);
            return null;
        }
    }

    // Invalidate user cache
    async invalidateUserCache(userId: string): Promise<void> {
        try {
            const key = this.generateKey(userId);
            await this.del(key);
            console.log('🗑️ User cache invalidated');
        } catch (error) {
            console.error('Invalidate user cache error:', error);
        }
    }

    // Get cache statistics
    async getCacheStats(): Promise<{ totalKeys: number; memoryUsage: string }> {
        try {
            const totalKeys = await redis.dbsize();
            const memoryInfo = await redis.info('memory');

            return {
                totalKeys,
                memoryUsage: memoryInfo
            };
        } catch (error) {
            console.error('Get cache stats error:', error);
            return { totalKeys: 0, memoryUsage: 'N/A' };
        }
    }
}

// Export singleton instance
export const userCacheService = new UserCacheService();
export default userCacheService; 