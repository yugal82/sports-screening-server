import { Request, Response } from 'express';
import { stripe, STRIPE_CONFIG } from '../config/stripe';
import { CreatePaymentIntentRequest, PaymentIntentResponse } from '../utils/types';
import { sendSuccessResponse, sendErrorResponse } from '../utils/responseHelpers';
import Booking from '../models/bookingModel';

export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { amount, currency = STRIPE_CONFIG.currency, bookingId, eventId, userId, metadata = {} }: CreatePaymentIntentRequest = req.body;

        if (!amount || !bookingId || !eventId || !userId) {
            sendErrorResponse(res, 400, 'Missing required fields: amount, bookingId, eventId, userId');
            return;
        }
        if (amount <= 0) {
            sendErrorResponse(res, 400, 'Amount must be greater than 0');
            return;
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            payment_method_types: STRIPE_CONFIG.payment_method_types,
            metadata: { bookingId, eventId, userId, ...metadata },
        });

        const paymentInfo = {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            paymentDate: new Date(),
            paymentStatus: 'pending',
        }
        await Booking.findByIdAndUpdate(bookingId, { paymentInfo: paymentInfo });

        const response: PaymentIntentResponse = {
            clientSecret: paymentIntent.client_secret!,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
        };
        sendSuccessResponse(res, 201, 'Payment intent created successfully', response);
    } catch (error) {
        console.log(error);
        sendErrorResponse(res, 500, 'Failed to create payment intent');
    }
};

