import { Router } from 'express';
import { createPaymentIntent } from '../controllers/paymentController';

const router = Router();

// Create payment intent
router.post('/create-payment-intent', createPaymentIntent);

export default router; 