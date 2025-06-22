import { Request, Response } from "express";
import Booking from "../models/bookingModel";
import Event from "../models/eventModel";
import User from "../models/userModel";
import { AuthError } from "../utils/errors";
import { AuthenticatedRequest } from "./authController";

// Types
interface CreateBookingRequest {
    eventId: string;
    quantity: number;
    price: number;
}

interface BookingParams {
    id: string;
}

// Booking Service
const findBookingById = async (id: string) => {
    const booking = await Booking.findById(id)
        .populate('userId', 'name email')
        .populate('eventId', 'sportsCategory venue date time price');

    if (!booking) {
        throw new AuthError('Booking not found.');
    }
    return booking;
};

const findEventById = async (id: string) => {
    const event = await Event.findById(id);
    if (!event) {
        throw new AuthError('Event not found.');
    }
    return event;
};

// Generate QR Code Data
const generateQRCodeData = (bookingId: string, userId: string, eventId: string): string => {
    return `${bookingId}-${userId}-${eventId}-${Date.now()}`;
};

// Controller Methods
const getAllBookings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: false,
                message: 'User not authenticated.'
            });
            return;
        }

        // Get all bookings for the authenticated user
        const bookings = await Booking.find({ userId: req.user._id })
            .populate('userId', 'name email')
            .populate('eventId', 'sportsCategory venue date time price')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: true,
            message: "Bookings fetched successfully.",
            bookings: bookings,
            count: bookings.length
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Could not fetch bookings. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

const getBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Validation
        if (!id) {
            res.status(400).json({
                status: false,
                message: 'Booking ID is required.'
            });
            return;
        }

        // Find booking
        const booking = await findBookingById(id);

        res.status(200).json({
            status: true,
            message: "Booking details fetched successfully.",
            booking: booking
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
            message: "Could not fetch booking details. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

const createBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: false,
                message: 'User not authenticated.'
            });
            return;
        }

        const { eventId, quantity, price } = req.body;

        // Validation
        if (!eventId || !quantity || !price) {
            res.status(400).json({
                status: false,
                message: 'Please provide eventId, quantity, and price.'
            });
            return;
        }

        if (quantity <= 0 || price <= 0) {
            res.status(400).json({
                status: false,
                message: 'Quantity and price must be greater than 0.'
            });
            return;
        }

        // Check if event exists
        const event = await findEventById(eventId);

        // Check if event has available capacity
        const existingBookings = await Booking.find({ eventId });
        const totalBooked = existingBookings.reduce((sum, booking) => sum + (booking.quantity || 0), 0);

        if (totalBooked + quantity > event.maxOccupancy) {
            res.status(400).json({
                status: false,
                message: `Not enough seats available. Only ${event.maxOccupancy - totalBooked} seats remaining.`
            });
            return;
        }

        // Create booking
        const newBooking = await Booking.create({
            userId: req.user._id,
            eventId,
            quantity,
            price,
            qrCodeData: generateQRCodeData('', req.user._id?.toString() || '', eventId)
        });

        // Update QR code with actual booking ID
        newBooking.qrCodeData = generateQRCodeData(newBooking._id.toString(), req.user._id?.toString() || '', eventId);
        await newBooking.save();

        // Populate the booking with user and event details
        const populatedBooking = await Booking.findById(newBooking._id)
            .populate('userId', 'name email')
            .populate('eventId', 'sportsCategory venue date time price');

        res.status(201).json({
            status: true,
            message: "Booking created successfully.",
            booking: populatedBooking
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Could not create booking. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

export { getAllBookings, getBooking, createBooking };
