import { Response, NextFunction } from 'express';
import redis from '../config/redis';
import { AuthenticatedRequest } from '../controllers/authController';

const WINDOW_SIZE_IN_SECONDS = 60; // 1 minute
const MAX_REQUESTS = 5; // Max 5 booking requests per window
const AUTH_WINDOW_SIZE_IN_SECONDS = 300; // 5 minutes for auth
const MAX_AUTH_REQUESTS = 3; // Max 3 auth requests per window
const EVENT_WINDOW_SIZE_IN_SECONDS = 3600; // 1 hour for event creation
const MAX_EVENT_REQUESTS = 10; // Max 10 event creation requests per hour

/**
 * Rate limiting middleware for booking requests
 * Limits to MAX_REQUESTS per WINDOW_SIZE_IN_SECONDS per user (by userId or IP)
 */
export const bookingRateLimiter = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Identify user by userId if authenticated, else by IP
        let identifier = req.ip;
        if (req.user && req.user._id) {
            identifier = `user:${req.user._id}`;
        }
        const redisKey = `rate_limit:booking:${identifier}`;

        // Increment the count for this user/IP
        const currentCount = await redis.incr(redisKey);

        if (currentCount === 1) {
            // Set expiry for the first request
            await redis.expire(redisKey, WINDOW_SIZE_IN_SECONDS);
        }

        if (currentCount > MAX_REQUESTS) {
            const ttl = await redis.ttl(redisKey);
            res.status(429).json({
                status: false,
                message: `Too many booking requests. Please try again in ${ttl} seconds.`
            });
            return;
        }

        next();
    } catch (error) {
        // On Redis error, allow the request (fail open)
        console.error('Rate limiting error:', error);
        next();
    }
};

/**
 * Rate limiting middleware for authentication requests (login/register)
 * Limits to MAX_AUTH_REQUESTS per AUTH_WINDOW_SIZE_IN_SECONDS per IP
 * This prevents brute force attacks on login/register endpoints
 */
export const authRateLimiter = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Use IP address for auth rate limiting
        const identifier = req.ip;
        const redisKey = `rate_limit:auth:${identifier}`;

        // Increment the count for this IP
        const currentCount = await redis.incr(redisKey);

        if (currentCount === 1) {
            // Set expiry for the first request
            await redis.expire(redisKey, AUTH_WINDOW_SIZE_IN_SECONDS);
        }

        if (currentCount > MAX_AUTH_REQUESTS) {
            const ttl = await redis.ttl(redisKey);
            res.status(429).json({
                status: false,
                message: `Too many authentication attempts. Please try again in ${ttl} seconds.`
            });
            return;
        }

        next();
    } catch (error) {
        // On Redis error, allow the request (fail open)
        console.error('Auth rate limiting error:', error);
        next();
    }
};

/**
 * Rate limiting middleware for event creation requests
 * Limits to MAX_EVENT_REQUESTS per EVENT_WINDOW_SIZE_IN_SECONDS per user
 * This prevents venue owners from spamming events
 */
export const eventCreationRateLimiter = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Use user ID for event creation rate limiting
        let identifier = req.ip;
        if (req.user && req.user._id) {
            identifier = `user:${req.user._id}`;
        }
        const redisKey = `rate_limit:event_creation:${identifier}`;

        // Increment the count for this user
        const currentCount = await redis.incr(redisKey);

        if (currentCount === 1) {
            // Set expiry for the first request
            await redis.expire(redisKey, EVENT_WINDOW_SIZE_IN_SECONDS);
        }

        if (currentCount > MAX_EVENT_REQUESTS) {
            const ttl = await redis.ttl(redisKey);
            res.status(429).json({
                status: false,
                message: `Too many event creation requests. Please try again in ${ttl} seconds.`
            });
            return;
        }

        next();
    } catch (error) {
        // On Redis error, allow the request (fail open)
        console.error('Event creation rate limiting error:', error);
        next();
    }
}; 