import { Request, Response } from 'express';
import { stripe, STRIPE_CONFIG } from '../config/stripe';
import { CreatePaymentIntentRequest, PaymentIntentResponse, RefundRequest } from '../utils/types';
import { sendSuccessResponse, sendErrorResponse } from '../utils/responseHelpers';

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

export const processRefund = async (req: Request, res: Response): Promise<void> => {
    try {
        const { paymentIntentId, amount, reason = 'requested_by_customer' }: RefundRequest = req.body;
        if (!paymentIntentId) {
            sendErrorResponse(res, 400, 'Payment intent ID is required');
            return;
        }
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            sendErrorResponse(res, 400, 'Payment intent must be succeeded to process refund');
            return;
        }
        const refundParams: any = { payment_intent: paymentIntentId, reason };
        if (amount) refundParams.amount = Math.round(amount * 100);
        const refund = await stripe.refunds.create(refundParams);
        sendSuccessResponse(res, 200, 'Refund processed successfully', {
            refundId: refund.id,
            amount: refund.amount / 100,
            status: refund.status,
            reason: refund.reason,
        });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to process refund');
    }
}; 