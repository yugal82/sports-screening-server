import { Router } from 'express';
import { createPaymentIntent, processRefund } from '../controllers/paymentController';

const router = Router();

// Create payment intent
router.post('/create-payment-intent', createPaymentIntent);

// Process refund
router.post('/refund', processRefund);

export default router; 