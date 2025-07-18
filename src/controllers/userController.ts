import { Request, Response } from "express";
import User from "../models/userModel";
import Booking from "../models/bookingModel";
import { AuthError } from "../utils/errors";
import { createUserResponse } from "../utils/responseHelpers";
import { IUser } from "../utils/types";
import { AuthenticatedRequest } from "../controllers/authController";
import jwt from "jsonwebtoken";
import userCacheService from "../services/cacheService";

// Types
interface JWTPayload {
    id: string;
    role: string;
    iat: number;
    exp: number;
}

// Token Service
const verifyToken = (token: string): JWTPayload => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
};

// User Service
const findUserById = async (id: string) => {
    const user = await User.findById(id).select('-password');
    if (!user) {
        throw new AuthError('User not found.');
    }
    return user;
};

// Booking Service
const getUpcomingBookings = async (userId: string) => {
    const currentDate = new Date();

    // Get upcoming confirmed bookings with populated event details
    const bookings = await Booking.find({
        userId,
        status: 'confirmed' // Only confirmed bookings
    })
        .populate({
            path: 'eventId',
            select: 'sportsCategory venue date time price image',
            match: { date: { $gte: currentDate } } // Only future events
        })
        .sort({ createdAt: -1 });

    // Filter out bookings with null events (past events)
    return bookings.filter(booking => booking.eventId !== null);
};

// Controller Methods
const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Check if user is authorized (admin only)
        if (req?.user?.role !== "admin") {
            res.status(403).json({
                status: false,
                message: "You are not authorized to view all users."
            });
            return;
        }

        // Get query parameters for pagination and filtering
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const role = req.query.role as string;
        const search = req.query.search as string;

        // Build query
        let query: any = {};

        if (role) {
            query.role = role;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Get users with pagination
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        // Transform users to response format
        const userResponses = users.map(user => {
            const userObj = user.toObject();
            return createUserResponse(user);
        });

        res.status(200).json({
            status: true,
            message: "All users fetched successfully.",
            data: {
                users: userResponses,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalUsers,
                    limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Could not fetch users. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get token from cookie
        const token = req.cookies?.jwt;

        if (!token) {
            res.status(401).json({
                status: false,
                message: 'No token provided. Please login.'
            });
            return;
        }

        // Verify token
        const decoded = verifyToken(token);

        // Try to get user data from cache first
        let userData = await userCacheService.getCachedUserData(decoded.id);

        if (!userData) {
            // Cache miss - fetch from database
            console.log('🔄 Cache miss - fetching from database');
            const user = await findUserById(decoded.id);
            userData = user.toObject() as unknown as IUser;

            // Cache the user data with JWT expiration
            await userCacheService.cacheUserData(decoded.id, userData, decoded.exp);
        }

        // Get upcoming bookings for the user
        const upcomingBookings = await getUpcomingBookings(decoded.id);

        // Add bookings to user data
        const userWithBookings = {
            ...userData,
            bookings: upcomingBookings
        };

        res.status(200).json({
            status: true,
            message: "User Authenticated.",
            user: userWithBookings
        });

    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                status: false,
                message: "Invalid token. Please login again."
            });
            return;
        }

        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                status: false,
                message: "Token expired. Please login again."
            });
            return;
        }

        if (error instanceof AuthError) {
            res.status(401).json({
                status: false,
                message: error.message
            });
            return;
        }

        res.status(500).json({
            status: false,
            message: "Could not retrieve user data. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: false,
                message: 'User not authenticated.'
            });
            return;
        }

        // Get upcoming bookings for the user
        const upcomingBookings = await getUpcomingBookings(req.user._id?.toString() || '');

        // Add bookings to user data
        const userWithBookings = {
            ...req.user,
            bookings: upcomingBookings
        };

        res.status(200).json({
            status: true,
            message: "Current user profile fetched successfully.",
            user: userWithBookings
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Could not fetch user profile. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Validation
        if (!id) {
            res.status(400).json({
                status: false,
                message: 'User ID is required.'
            });
            return;
        }

        // Find user
        const user = await findUserById(id);
        const userResponse = createUserResponse(user);

        res.status(200).json({
            status: true,
            message: "User details fetched successfully.",
            user: userResponse
        });

    } catch (error) {
        if (error instanceof AuthError) {
            res.status(404).json({
                status: false,
                message: error.message
            });
            return;
        }
        res.status(500).json({
            status: false,
            message: "Could not fetch user details. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Validation
        if (!id) {
            res.status(400).json({
                status: false,
                message: 'User ID is required.'
            });
            return;
        }

        // Delete user
        await User.findByIdAndDelete(id);

        // Invalidate user cache
        await userCacheService.invalidateUserCache(id);

        res.status(200).json({
            status: true,
            message: "User deleted successfully."
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Could not delete user. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

export { getAllUsers, getMe, getCurrentUser, getUserById, deleteUser };
