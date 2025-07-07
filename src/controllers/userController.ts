import { Request, Response } from "express";
import User from "../models/userModel";
import { AuthError } from "../utils/errors";
import { createUserResponse } from "../utils/responseHelpers";
import { IUser } from "../utils/types";
import { AuthenticatedRequest } from "../controllers/authController";
import jwt from "jsonwebtoken";

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

// Controller Methods
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

        // Check if user still exists
        const user = await findUserById(decoded.id);
        const userResponse = createUserResponse(user);

        res.status(200).json({
            status: true,
            message: "User Authenticated.",
            user: userResponse
        });

    } catch (error) {
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

        res.status(200).json({
            status: true,
            message: "Current user profile fetched successfully.",
            user: req.user
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

        res.status(200).json({
            status: true,
            message: "User deleted successfully.",
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Could not delete user. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

export { getMe, getCurrentUser, getUserById, deleteUser };
