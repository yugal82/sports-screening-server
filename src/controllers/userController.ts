import { Request, Response } from "express";
import User from "../models/userModel";
import { AuthError } from "../utils/errors";
import { createUserResponse } from "../utils/responseHelpers";
import { IUser } from "../utils/types";
import { AuthenticatedRequest } from "../controllers/authController";

// User Service
const findUserById = async (id: string) => {
    const user = await User.findById(id).select('-password');
    if (!user) {
        throw new AuthError('User not found.');
    }
    return user;
};

// Controller Methods
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

export { getCurrentUser, getUserById, deleteUser };
