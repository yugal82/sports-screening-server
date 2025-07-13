import { Request, Response, NextFunction } from "express";
import User from "../models/userModel";
import Booking from "../models/bookingModel";
import Event from "../models/eventModel";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthError } from "../utils/errors";
import { createUserResponse } from "../utils/responseHelpers";
import { IUser } from '../utils/types';

// Constants
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;
const JWT_EXPIRES_IN = Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000;

// Types
interface AuthenticatedRequest extends Request {
    user?: IUser | null
}

interface JWTPayload {
    id: string;
    role: string;
    iat: number;
    exp: number;
}

// Token Service
const createToken = (id: string, role: string): string => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
};

// User Service
const findUserByEmail = async (email: string) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new AuthError('User does not exist.');
    }
    return user;
};

const validatePassword = async (password: string, hashedPassword: string) => {
    const isCorrect = await bcrypt.compare(password, hashedPassword);
    if (!isCorrect) {
        throw new AuthError('Incorrect password.');
    }
};

// Booking Service
const getUpcomingBookings = async (userId: string) => {
    const currentDate = new Date();

    // Get upcoming bookings with populated event details
    const bookings = await Booking.find({ userId })
        .populate({
            path: 'eventId',
            select: 'sportsCategory venue date time price image',
            match: { date: { $gte: currentDate } } // Only future events
        })
        .sort({ createdAt: -1 });

    // Filter out bookings with null events (past events)
    return bookings.filter(booking => booking.eventId !== null);
};

// Token Service
const verifyToken = (token: string): JWTPayload => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
};

// Controller Methods
const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, favorites } = req.body;

        // Validation
        if (!name || !email || !password) {
            res.status(400).json({
                status: false,
                message: 'Please provide all required fields.'
            });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({
                status: false,
                message: 'Password must be at least 6 characters long.'
            });
            return;
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({
                status: false,
                message: 'User already exists.'
            });
            return;
        }

        // Create new user
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            favorites
        });

        const token = createToken(newUser._id.toString(), newUser.role);
        const userResponse = createUserResponse(newUser);

        res.status(201)
            .cookie("jwt", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                expires: new Date(Date.now() + JWT_EXPIRES_IN)
            })
            .json({
                status: true,
                message: "User registered successfully.",
                user: userResponse
            });

    } catch (error) {
        if (error instanceof AuthError) {
            res.status(400).json({
                status: false,
                message: error.message
            });
            return;
        }
        res.status(500).json({
            status: false,
            message: "Could not register user. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user and validate password
        const user = await findUserByEmail(email);
        await validatePassword(password, user.password);

        // Get upcoming bookings for the user
        const upcomingBookings = await getUpcomingBookings(user._id.toString());

        // Create response with bookings
        const token = createToken(user._id.toString(), user.role);
        const userResponse = createUserResponse(user);

        // Add bookings to user response
        const userWithBookings = {
            ...userResponse,
            bookings: upcomingBookings
        };

        res.status(200)
            .cookie("jwt", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                expires: new Date(Date.now() + JWT_EXPIRES_IN)
            })
            .json({
                status: true,
                message: "User logged in successfully.",
                user: userWithBookings
            });

    } catch (error) {
        if (error instanceof AuthError) {
            res.status(400).json({
                status: false,
                message: error.message
            });
            return;
        }
        res.status(500).json({
            status: false,
            message: "Could not login user. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        res.status(200)
            .clearCookie("jwt", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 0
            })
            .json({
                status: true,
                message: "User logged out successfully."
            });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Could not logout user. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

// Middleware
const checkAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

        const decoded = verifyToken(token); // Verify token
        let user: IUser | null = await User.findById(decoded.id).select("-password -__v"); // Check if user still exists

        if (!user) {
            res.status(401).json({
                status: false,
                message: 'User not found.'
            });
            return;
        }
        delete user.password;
        req.user = user;
        next();

    } catch (error) {
        res.status(401).json({
            status: false,
            message: "Authentication failed. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

export { register, login, logout, checkAuth, AuthenticatedRequest };