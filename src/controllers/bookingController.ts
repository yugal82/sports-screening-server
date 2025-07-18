import { Request, Response } from "express";
import Booking from "../models/bookingModel";
import Event from "../models/eventModel";
import User from "../models/userModel";
import { AuthError } from "../utils/errors";
import { AuthenticatedRequest } from "./authController";
import { stripe } from "../config/stripe";

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
        .populate('eventId', 'sportsCategory venue date time price availableSeats');

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

// Update event available seats
const updateEventSeats = async (eventId: string, quantity: number, operation: 'decrease' | 'increase') => {
    const event = await Event.findById(eventId);
    if (!event) {
        throw new AuthError('Event not found.');
    }

    if (operation === 'decrease') {
        if (event.availableSeats < quantity) {
            throw new AuthError(`Not enough seats available. Only ${event.availableSeats} seats remaining.`);
        }
        event.availableSeats -= quantity;
    } else {
        event.availableSeats += quantity;
    }

    await event.save();
    return event;
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
            .populate('eventId', 'sportsCategory venue date time price availableSeats')
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

const getBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: false,
                message: 'User not authenticated.'
            });
            return;
        }

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

        // Check if user owns this booking or is admin
        if (booking.userId.toString() !== req.user._id?.toString() && req.user.role !== 'admin') {
            res.status(403).json({
                status: false,
                message: 'You are not authorized to view this booking.'
            });
            return;
        }

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
                message: 'Quantity or price must be greater than 0.'
            });
            return;
        }

        // Check if event exists and has enough seats
        const event = await findEventById(eventId);

        if (event.availableSeats < quantity) {
            res.status(400).json({
                status: false,
                message: `Not enough seats available. Only ${event.availableSeats} seats remaining.`
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

        // Reduce available seats for the event
        await updateEventSeats(eventId, quantity, 'decrease');

        // Populate the booking with user and event details
        const populatedBooking = await Booking.findById(newBooking._id)
            .populate('userId', 'name email')
            .populate('eventId', 'sportsCategory venue date time price availableSeats');

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

const cancelBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: false,
                message: 'User not authenticated.'
            });
            return;
        }

        const { id } = req.params;

        // Validation
        if (!id) {
            res.status(400).json({
                status: false,
                message: 'Booking ID is required.'
            });
            return;
        }

        // Find booking and check ownership
        const booking = await Booking.findById(id);
        if (!booking) {
            res.status(404).json({
                status: false,
                message: 'Booking not found.'
            });
            return;
        }

        // Check if user owns this booking
        if (booking.userId.toString() !== req.user._id?.toString()) {
            res.status(403).json({
                status: false,
                message: 'You are not authorized to cancel this booking.'
            });
            return;
        }

        // Check if event is in the future
        const event = await Event.findById(booking.eventId);
        if (!event) {
            res.status(404).json({
                status: false,
                message: 'Event not found.'
            });
            return;
        }

        const currentDate = new Date();
        if (event.date <= currentDate) {
            res.status(400).json({
                status: false,
                message: 'Cannot cancel booking for past events.'
            });
            return;
        }

        // Process Stripe refund if payment was made
        let refundResult = null;
        if (booking.paymentInfo?.paymentIntentId && booking.paymentInfo?.paymentStatus === 'succeeded') {
            try {
                const refund = await stripe.refunds.create({
                    payment_intent: booking.paymentInfo.paymentIntentId,
                    reason: 'requested_by_customer'
                });
                refundResult = {
                    refundId: refund.id,
                    amount: refund.amount / 100,
                    status: refund.status
                };
            } catch (error) {
                console.error('Stripe refund failed:', error);
                // Continue with cancellation even if refund fails
            }
        }

        // Increase available seats for the event
        await updateEventSeats(booking.eventId.toString(), booking.quantity || 0, 'increase');

        // Update booking status instead of deleting
        booking.status = 'cancelled';
        if (booking.paymentInfo) booking.paymentInfo.paymentStatus = 'refunded';
        await booking.save();

        res.status(200).json({
            status: true,
            message: "Booking cancelled successfully.",
            cancelledBooking: {
                id: booking._id,
                quantity: booking.quantity,
                eventId: booking.eventId,
                status: booking.status,
                paymentStatus: booking.paymentInfo?.paymentStatus,
                refund: refundResult
            }
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Could not cancel booking. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

const updateBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: false,
                message: 'User not authenticated.'
            });
            return;
        }

        const { id } = req.params;
        const { status, paymentStatus } = req.body;

        const booking = await Booking.findById(id);
        if (!booking) {
            res.status(404).json({
                status: false,
                message: 'Booking not found.'
            });
            return;
        }

        if (booking.userId.toString() !== req.user._id?.toString()) {
            res.status(403).json({
                status: false,
                message: 'You are not authorized to update this booking.'
            });
            return;
        }

        if (status) booking.status = status;
        if (paymentStatus) {
            if (!booking.paymentInfo) booking.paymentInfo = {};
            booking.paymentInfo.paymentStatus = paymentStatus;
        }

        await booking.save();

        res.status(200).json({
            status: true,
            message: "Booking updated successfully.",
            booking: booking
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: "Could not update booking. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
}

export { getAllBookings, getBooking, createBooking, cancelBooking, updateBooking };
