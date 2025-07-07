import { Request, Response, NextFunction } from 'express';
import userCacheService from '../services/cacheService';

/**
 * Middleware to invalidate user cache after user data updates
 */
export const invalidateUserCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Store original send function
        const originalSend = res.send;

        // Override send function to invalidate cache after successful response
        res.send = function (data: any) {
            // Check if response is successful (2xx status)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Invalidate user cache if user ID is available
                const userId = req.params.id || req.body?.userId;
                if (userId) {
                    userCacheService.invalidateUserCache(userId).catch(error => {
                        console.error('Cache invalidation error:', error);
                    });
                }
            }

            // Call original send function
            return originalSend.call(this, data);
        };

        next();
    } catch (error) {
        console.error('Cache middleware error:', error);
        next();
    }
};

/**
 * Middleware to add cache headers for client-side caching
 */
export const addCacheHeaders = (req: Request, res: Response, next: NextFunction): void => {
    // Add cache control headers for user data
    res.set({
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'ETag': `"${Date.now()}"`,
        'Last-Modified': new Date().toUTCString()
    });
    next();
}; 